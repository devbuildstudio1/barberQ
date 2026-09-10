import { handle, jsonOk } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { toAppError } from "@/lib/errors";
import { todayInAppTz } from "@/lib/shops/queries";
import type { QueueSnapshot } from "@/types/domain";

/** GET /api/shops/:id/queue — public snapshot of today's queues (no personal data). */
export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const [liveRes, queuesRes] = await Promise.all([
    supabase.rpc("get_shop_live_status", { p_shop_id: id }),
    supabase.from("queues").select("id").eq("shop_id", id).eq("queue_date", todayInAppTz()),
  ]);
  if (liveRes.error) throw toAppError(liveRes.error);

  const snapshots = await Promise.all(
    (queuesRes.data ?? []).map(async (q) => {
      const { data } = await supabase.rpc("get_queue_snapshot", { p_queue_id: q.id });
      return data as unknown as QueueSnapshot | null;
    }),
  );

  return jsonOk({ live: liveRes.data, queues: snapshots.filter((s): s is QueueSnapshot => s != null) });
});
