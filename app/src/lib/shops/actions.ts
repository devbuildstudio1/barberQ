"use server";

import { revalidatePath } from "next/cache";
import { assertProfile, assertRole } from "@/lib/auth/guards";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsOf, parseOrThrow } from "@/lib/validation/parse";
import { barberSchema, serviceSchema, shopRegisterSchema, shopUpdateSchema } from "@/lib/validation/shop";
import { uuidSchema } from "@/lib/validation/common";
import type { Barber, Service, Shop } from "@/types/domain";

/** Throws unless the caller owns the shop (or is an admin). */
async function assertCanManageShop(shopId: string): Promise<void> {
  const profile = await assertProfile();
  if (profile.role === "admin") return;
  const supabase = await createClient();
  const { data } = await supabase.from("shops").select("id").eq("id", shopId).eq("owner_id", profile.id).maybeSingle();
  if (!data) throw new AppError("FORBIDDEN");
}

/* -------------------------------------------------------------------------- */
/* Shops                                                                       */
/* -------------------------------------------------------------------------- */

/** Register a shop. Always created as PENDING (enforced by a database trigger). */
export async function createShopAction(input: unknown): Promise<ActionResult<{ shop: Shop }>> {
  try {
    const profile = await assertRole("shop_owner", "admin");
    const data = parseOrThrow(shopRegisterSchema, input);
    const supabase = await createClient();

    const { data: existing } = await supabase.from("shops").select("id").eq("owner_id", profile.id).limit(1);
    if (existing && existing.length > 0) {
      throw new AppError("CONFLICT", "You already have a registered shop.");
    }

    if (data.owner_name && data.owner_name !== profile.name) {
      await supabase.from("users").update({ name: data.owner_name }).eq("id", profile.id);
    }

    const { data: shop, error } = await supabase
      .from("shops")
      .insert({
        owner_id: profile.id,
        name: data.name,
        description: data.description ?? null,
        address: data.address,
        city: data.city ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        phone: data.phone ?? profile.phone,
        email: data.email ?? profile.email,
        image: data.image ?? null,
        images: data.images ?? [],
        opening_time: data.opening_time,
        closing_time: data.closing_time,
      })
      .select("*")
      .single();
    if (error) throw error;

    revalidatePath("/shop/dashboard");
    return ok({ shop });
  } catch (err) {
    return fail(err, fieldErrorsOf(err));
  }
}

export async function updateShopAction(input: unknown): Promise<ActionResult<{ shop: Shop }>> {
  try {
    const raw = input as { shop_id?: unknown };
    const shopId = parseOrThrow(uuidSchema, raw.shop_id);
    await assertCanManageShop(shopId);
    const data = parseOrThrow(shopUpdateSchema, input);

    const supabase = await createClient();
    // Moderated fields (status, owner, rating) are stripped by the schema and also
    // rejected by a database trigger, so an update carrying only those is a no-op.
    if (Object.keys(data).length === 0) {
      const { data: current, error: readErr } = await supabase.from("shops").select("*").eq("id", shopId).single();
      if (readErr) throw readErr;
      return ok({ shop: current });
    }

    const { data: shop, error } = await supabase
      .from("shops")
      .update({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description ?? null }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city ?? null }),
        ...(data.latitude !== undefined && { latitude: data.latitude ?? null }),
        ...(data.longitude !== undefined && { longitude: data.longitude ?? null }),
        ...(data.phone !== undefined && { phone: data.phone ?? null }),
        ...(data.email !== undefined && { email: data.email ?? null }),
        ...(data.image !== undefined && { image: data.image ?? null }),
        ...(data.images !== undefined && { images: data.images ?? [] }),
        ...(data.opening_time !== undefined && { opening_time: data.opening_time }),
        ...(data.closing_time !== undefined && { closing_time: data.closing_time }),
      })
      .eq("id", shopId)
      .select("*")
      .single();
    if (error) throw error;

    revalidatePath("/shop/settings");
    revalidatePath("/shop/dashboard");
    revalidatePath(`/shops/${shopId}`);
    return ok({ shop });
  } catch (err) {
    return fail(err, fieldErrorsOf(err));
  }
}

/* -------------------------------------------------------------------------- */
/* Barbers                                                                     */
/* -------------------------------------------------------------------------- */

export async function createBarberAction(input: unknown): Promise<ActionResult<{ barber: Barber }>> {
  try {
    const raw = input as { shop_id?: unknown };
    const shopId = parseOrThrow(uuidSchema, raw.shop_id);
    await assertCanManageShop(shopId);
    const data = parseOrThrow(barberSchema, input);

    const supabase = await createClient();
    const { data: barber, error } = await supabase
      .from("barbers")
      .insert({
        shop_id: shopId,
        name: data.name,
        image: data.image ?? null,
        experience_years: data.experience_years,
        specialization: data.specialization ?? null,
        status: data.status,
        availability: data.availability,
      })
      .select("*")
      .single();
    if (error) throw error;

    revalidatePath("/shop/barbers");
    revalidatePath(`/shops/${shopId}`);
    return ok({ barber });
  } catch (err) {
    return fail(err, fieldErrorsOf(err));
  }
}

export async function updateBarberAction(input: unknown): Promise<ActionResult<{ barber: Barber }>> {
  try {
    const raw = input as { barber_id?: unknown };
    const barberId = parseOrThrow(uuidSchema, raw.barber_id);
    const supabase = await createClient();
    const { data: existing } = await supabase.from("barbers").select("shop_id").eq("id", barberId).maybeSingle();
    if (!existing) throw new AppError("NOT_FOUND");
    await assertCanManageShop(existing.shop_id);

    const data = parseOrThrow(barberSchema.partial(), input);
    const { data: barber, error } = await supabase
      .from("barbers")
      .update({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.image !== undefined && { image: data.image ?? null }),
        ...(data.experience_years !== undefined && { experience_years: data.experience_years }),
        ...(data.specialization !== undefined && { specialization: data.specialization ?? null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.availability !== undefined && { availability: data.availability }),
      })
      .eq("id", barberId)
      .select("*")
      .single();
    if (error) throw error;

    revalidatePath("/shop/barbers");
    revalidatePath("/shop/queue");
    revalidatePath(`/shops/${existing.shop_id}`);
    return ok({ barber });
  } catch (err) {
    return fail(err, fieldErrorsOf(err));
  }
}

/**
 * Barbers are deactivated rather than deleted when they have queue history,
 * so past tokens keep their attribution.
 */
export async function deleteBarberAction(input: { barber_id: string }): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    const barberId = parseOrThrow(uuidSchema, input.barber_id);
    const supabase = await createClient();
    const { data: existing } = await supabase.from("barbers").select("shop_id").eq("id", barberId).maybeSingle();
    if (!existing) throw new AppError("NOT_FOUND");
    await assertCanManageShop(existing.shop_id);

    // Keep the record (deactivate) when it is referenced by queue history or reviews,
    // so past tokens and ratings keep their attribution.
    const [entriesRes, reviewsRes] = await Promise.all([
      supabase.from("queue_entries").select("id", { count: "exact", head: true }).eq("barber_id", barberId),
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("barber_id", barberId),
    ]);
    const count = (entriesRes.count ?? 0) + (reviewsRes.count ?? 0);
    if (count > 0) {
      const { error } = await supabase.from("barbers").update({ status: "inactive", availability: "off_duty" }).eq("id", barberId);
      if (error) throw error;
      revalidatePath("/shop/barbers");
      return ok({ deleted: false });
    }

    const { error } = await supabase.from("barbers").delete().eq("id", barberId);
    if (error) throw error;
    revalidatePath("/shop/barbers");
    revalidatePath(`/shops/${existing.shop_id}`);
    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Services                                                                    */
/* -------------------------------------------------------------------------- */

export async function createServiceAction(input: unknown): Promise<ActionResult<{ service: Service }>> {
  try {
    const raw = input as { shop_id?: unknown };
    const shopId = parseOrThrow(uuidSchema, raw.shop_id);
    await assertCanManageShop(shopId);
    const data = parseOrThrow(serviceSchema, input);

    const supabase = await createClient();
    const { count } = await supabase.from("services").select("id", { count: "exact", head: true }).eq("shop_id", shopId);
    const { data: service, error } = await supabase
      .from("services")
      .insert({
        shop_id: shopId,
        name: data.name,
        price: data.price,
        duration_minutes: data.duration_minutes,
        status: data.status,
        sort_order: (count ?? 0) + 1,
      })
      .select("*")
      .single();
    if (error) throw error;

    revalidatePath("/shop/services");
    revalidatePath(`/shops/${shopId}`);
    return ok({ service });
  } catch (err) {
    return fail(err, fieldErrorsOf(err));
  }
}

export async function updateServiceAction(input: unknown): Promise<ActionResult<{ service: Service }>> {
  try {
    const raw = input as { service_id?: unknown };
    const serviceId = parseOrThrow(uuidSchema, raw.service_id);
    const supabase = await createClient();
    const { data: existing } = await supabase.from("services").select("shop_id").eq("id", serviceId).maybeSingle();
    if (!existing) throw new AppError("NOT_FOUND");
    await assertCanManageShop(existing.shop_id);

    const data = parseOrThrow(serviceSchema.partial(), input);
    const { data: service, error } = await supabase
      .from("services")
      .update({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.duration_minutes !== undefined && { duration_minutes: data.duration_minutes }),
        ...(data.status !== undefined && { status: data.status }),
      })
      .eq("id", serviceId)
      .select("*")
      .single();
    if (error) throw error;

    revalidatePath("/shop/services");
    revalidatePath(`/shops/${existing.shop_id}`);
    return ok({ service });
  } catch (err) {
    return fail(err, fieldErrorsOf(err));
  }
}

/** Services referenced by queue history are deactivated instead of deleted. */
export async function deleteServiceAction(input: { service_id: string }): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    const serviceId = parseOrThrow(uuidSchema, input.service_id);
    const supabase = await createClient();
    const { data: existing } = await supabase.from("services").select("shop_id").eq("id", serviceId).maybeSingle();
    if (!existing) throw new AppError("NOT_FOUND");
    await assertCanManageShop(existing.shop_id);

    const { count } = await supabase.from("queue_entries").select("id", { count: "exact", head: true }).eq("service_id", serviceId);
    if (count && count > 0) {
      const { error } = await supabase.from("services").update({ status: "inactive" }).eq("id", serviceId);
      if (error) throw error;
      revalidatePath("/shop/services");
      return ok({ deleted: false });
    }

    const { error } = await supabase.from("services").delete().eq("id", serviceId);
    if (error) throw error;
    revalidatePath("/shop/services");
    revalidatePath(`/shops/${existing.shop_id}`);
    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}
