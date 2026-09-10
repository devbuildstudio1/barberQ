"use server";

import { revalidatePath } from "next/cache";
import { assertProfile } from "@/lib/auth/guards";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { joinQueueSchema, queueEntryActionSchema, reviewSchema } from "@/lib/validation/queue";
import { fieldErrorsOf, parseOrThrow } from "@/lib/validation/parse";
import type { QueueEntry } from "@/types/domain";

/** Customer joins a shop's queue. All business rules are enforced in join_queue(). */
export async function joinQueueAction(input: unknown): Promise<ActionResult<{ entry: QueueEntry }>> {
  try {
    await assertProfile();
    const data = parseOrThrow(joinQueueSchema, input);
    const supabase = await createClient();
    const { data: entry, error } = await supabase.rpc("join_queue", {
      p_shop_id: data.shop_id,
      p_service_id: data.service_id,
      p_barber_id: data.barber_id ?? undefined,
    });
    if (error) throw error;
    revalidatePath("/my-queue");
    revalidatePath(`/shops/${data.shop_id}`);
    return ok({ entry });
  } catch (err) {
    return fail(err, fieldErrorsOf(err));
  }
}

/** Customer leaves the queue (WAITING -> CANCELLED). Staff may also cancel waiting entries. */
export async function cancelQueueEntryAction(input: unknown): Promise<ActionResult<{ entry: QueueEntry }>> {
  try {
    await assertProfile();
    const { entry_id } = parseOrThrow(queueEntryActionSchema, input);
    const supabase = await createClient();
    const { data: entry, error } = await supabase.rpc("cancel_queue_entry", { p_entry_id: entry_id });
    if (error) throw error;
    revalidatePath("/my-queue");
    return ok({ entry });
  } catch (err) {
    return fail(err);
  }
}

type StaffTransition = "call_next" | "start_service" | "complete_service" | "mark_no_show";

async function staffTransition(fn: StaffTransition, id: string): Promise<ActionResult<{ entry: QueueEntry }>> {
  try {
    await assertProfile();
    const supabase = await createClient();
    const { data: entry, error } =
      fn === "call_next"
        ? await supabase.rpc("call_next", { p_queue_id: parseOrThrow(queueEntryActionSchema, { entry_id: id }).entry_id })
        : await supabase.rpc(fn, { p_entry_id: parseOrThrow(queueEntryActionSchema, { entry_id: id }).entry_id });
    if (error) throw error;
    if (!entry) throw new AppError("NOT_FOUND");
    revalidatePath("/shop/queue");
    return ok({ entry });
  } catch (err) {
    return fail(err);
  }
}

export async function callNextAction(input: { queue_id: string }) {
  return staffTransition("call_next", input.queue_id);
}
export async function startServiceAction(input: { entry_id: string }) {
  return staffTransition("start_service", input.entry_id);
}
export async function completeServiceAction(input: { entry_id: string }) {
  return staffTransition("complete_service", input.entry_id);
}
export async function markNoShowAction(input: { entry_id: string }) {
  return staffTransition("mark_no_show", input.entry_id);
}

export async function setQueuePausedAction(input: { shop_id: string; paused: boolean }): Promise<ActionResult<{ paused: boolean }>> {
  try {
    await assertProfile();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_shop_queue_paused", { p_shop_id: input.shop_id, p_paused: input.paused });
    if (error) throw error;
    revalidatePath("/shop/queue");
    revalidatePath("/shop/dashboard");
    return ok({ paused: data.queue_paused });
  } catch (err) {
    return fail(err);
  }
}

export async function setShopOpenAction(input: { shop_id: string; open: boolean }): Promise<ActionResult<{ open: boolean }>> {
  try {
    await assertProfile();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_shop_open", { p_shop_id: input.shop_id, p_open: input.open });
    if (error) throw error;
    revalidatePath("/shop/queue");
    revalidatePath("/shop/dashboard");
    return ok({ open: data.is_open });
  } catch (err) {
    return fail(err);
  }
}

/** Customer submits a review for a completed visit (RLS enforces business rule 10). */
export async function submitReviewAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await assertProfile();
    const data = parseOrThrow(reviewSchema, input);
    const supabase = await createClient();
    const { data: entry } = await supabase
      .from("queue_entries")
      .select("shop_id, barber_id, status")
      .eq("id", data.queue_entry_id)
      .maybeSingle();
    if (!entry || entry.status !== "completed") throw new AppError("REVIEW_NOT_ALLOWED");
    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        user_id: profile.id,
        shop_id: entry.shop_id,
        barber_id: entry.barber_id,
        queue_entry_id: data.queue_entry_id,
        rating: data.rating,
        review: data.review ?? null,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "42501") throw new AppError("REVIEW_NOT_ALLOWED");
      throw error;
    }
    revalidatePath(`/shops/${entry.shop_id}`);
    revalidatePath("/my-queue");
    return ok({ id: review.id });
  } catch (err) {
    return fail(err, fieldErrorsOf(err));
  }
}
