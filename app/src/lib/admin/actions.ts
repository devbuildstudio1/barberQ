"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/auth/guards";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { parseOrThrow } from "@/lib/validation/parse";
import { uuidSchema } from "@/lib/validation/common";
import { shopStatusSchema } from "@/lib/validation/shop";
import type { Shop, ShopStatus } from "@/types/domain";

/** Approve, reject, suspend or restore a shop. Notifies the owner. */
export async function setShopStatusAction(input: { shop_id: string; status: ShopStatus; reason?: string }): Promise<ActionResult<{ shop: Shop }>> {
  try {
    await assertRole("admin");
    const shopId = parseOrThrow(uuidSchema, input.shop_id);
    const { status, reason } = parseOrThrow(shopStatusSchema, input);

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_set_shop_status", {
      p_shop_id: shopId,
      p_status: status,
      p_reason: reason ?? undefined,
    });
    if (error) throw error;

    revalidatePath("/admin/shops");
    revalidatePath("/admin/dashboard");
    revalidatePath("/dashboard");
    revalidatePath(`/shops/${shopId}`);
    return ok({ shop: data });
  } catch (err) {
    return fail(err);
  }
}

/** Deactivate or reactivate a user account. */
export async function setUserActiveAction(input: { user_id: string; is_active: boolean }): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await assertRole("admin");
    const userId = parseOrThrow(uuidSchema, input.user_id);
    if (userId === admin.id) throw new AppError("VALIDATION_ERROR", "You can't deactivate your own account.");

    const supabase = await createClient();
    const { error, count } = await supabase
      .from("users")
      .update({ is_active: input.is_active }, { count: "exact" })
      .eq("id", userId);
    if (error) throw error;
    if (!count) throw new AppError("NOT_FOUND");

    revalidatePath("/admin/users");
    return ok({ id: userId });
  } catch (err) {
    return fail(err);
  }
}

/** Hide or restore a review (moderation). */
export async function setReviewHiddenAction(input: { review_id: string; hidden: boolean }): Promise<ActionResult<{ id: string }>> {
  try {
    await assertRole("admin");
    const reviewId = parseOrThrow(uuidSchema, input.review_id);
    const supabase = await createClient();
    const { error, count } = await supabase
      .from("reviews")
      .update({ is_hidden: input.hidden }, { count: "exact" })
      .eq("id", reviewId);
    if (error) throw error;
    if (!count) throw new AppError("NOT_FOUND");

    revalidatePath("/admin/reviews");
    return ok({ id: reviewId });
  } catch (err) {
    return fail(err);
  }
}

/** Permanently remove a review. */
export async function deleteReviewAction(input: { review_id: string }): Promise<ActionResult<{ id: string }>> {
  try {
    await assertRole("admin");
    const reviewId = parseOrThrow(uuidSchema, input.review_id);
    const supabase = await createClient();
    const { error, count } = await supabase.from("reviews").delete({ count: "exact" }).eq("id", reviewId);
    if (error) throw error;
    if (!count) throw new AppError("NOT_FOUND");

    revalidatePath("/admin/reviews");
    return ok({ id: reviewId });
  } catch (err) {
    return fail(err);
  }
}

/** Deactivate a barber platform-wide (admins can manage any shop). */
export async function setBarberStatusAction(input: { barber_id: string; status: "active" | "inactive" }): Promise<ActionResult<{ id: string }>> {
  try {
    await assertRole("admin");
    const barberId = parseOrThrow(uuidSchema, input.barber_id);
    const supabase = await createClient();
    const { error, count } = await supabase
      .from("barbers")
      .update({ status: input.status, ...(input.status === "inactive" ? { availability: "off_duty" as const } : {}) }, { count: "exact" })
      .eq("id", barberId);
    if (error) throw error;
    if (!count) throw new AppError("NOT_FOUND");

    revalidatePath("/admin/barbers");
    return ok({ id: barberId });
  } catch (err) {
    return fail(err);
  }
}
