"use server";

import { revalidatePath } from "next/cache";
import { assertProfile } from "@/lib/auth/guards";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { parseOrThrow } from "@/lib/validation/parse";
import { uuidSchema } from "@/lib/validation/common";

export async function markNotificationReadAction(input: { id: string }): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await assertProfile();
    const id = parseOrThrow(uuidSchema, input.id);
    const supabase = await createClient();
    const { error, count } = await supabase
      .from("notifications")
      .update({ read: true }, { count: "exact" })
      .eq("id", id)
      .eq("user_id", profile.id);
    if (error) throw error;
    // No row matched: it belongs to someone else or no longer exists.
    if (!count) throw new AppError("NOT_FOUND");
    revalidatePath("/notifications");
    return ok({ id });
  } catch (err) {
    return fail(err);
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<{ count: number }>> {
  try {
    const profile = await assertProfile();
    const supabase = await createClient();
    const { error, count } = await supabase
      .from("notifications")
      .update({ read: true }, { count: "exact" })
      .eq("user_id", profile.id)
      .eq("read", false);
    if (error) throw error;
    revalidatePath("/notifications");
    return ok({ count: count ?? 0 });
  } catch (err) {
    return fail(err);
  }
}

export async function deleteNotificationAction(input: { id: string }): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await assertProfile();
    const id = parseOrThrow(uuidSchema, input.id);
    const supabase = await createClient();
    const { error, count } = await supabase
      .from("notifications")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", profile.id);
    if (error) throw error;
    if (!count) throw new AppError("NOT_FOUND");
    revalidatePath("/notifications");
    return ok({ id });
  } catch (err) {
    return fail(err);
  }
}
