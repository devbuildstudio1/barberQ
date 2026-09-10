import "server-only";

import { toAppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { MyQueueEntry, QueueBoard, ReviewableVisit } from "@/types/domain";

export async function getMyActiveQueueEntry(): Promise<MyQueueEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_active_queue_entry");
  if (error) throw toAppError(error);
  return (data as unknown as MyQueueEntry | null) ?? null;
}

export async function getMyReviewableVisits(): Promise<ReviewableVisit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_reviewable_visits");
  if (error) throw toAppError(error);
  return (data as unknown as ReviewableVisit[] | null) ?? [];
}

export async function getShopQueueBoard(shopId: string): Promise<QueueBoard> {
  const supabase = await createClient();
  await supabase.rpc("ensure_today_queues", { p_shop_id: shopId });
  const { data, error } = await supabase.rpc("get_shop_queue_board", { p_shop_id: shopId });
  if (error) throw toAppError(error);
  return data as unknown as QueueBoard;
}

/** Recent history for the signed-in customer (RLS-scoped). */
export async function getMyQueueHistory(limit = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("queue_entries")
    .select("id, token_number, status, queue_date, joined_at, completed_at, shop:shops(id, name, image), service:services(name, price), queue:queues(token_prefix)")
    .in("status", ["completed", "cancelled", "no_show"])
    .order("joined_at", { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return data ?? [];
}
