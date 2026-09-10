import { handle, jsonOk } from "@/lib/api/response";
import { unwrap } from "@/lib/api/unwrap";
import { cancelQueueEntryAction } from "@/lib/queue/actions";

/** POST /api/queue/:id/cancel */
export const POST = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  const data = unwrap(await cancelQueueEntryAction({ entry_id: id }));
  return jsonOk(data.entry);
});
