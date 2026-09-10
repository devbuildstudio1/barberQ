import { handle, jsonOk } from "@/lib/api/response";
import { unwrap } from "@/lib/api/unwrap";
import { callNextAction } from "@/lib/queue/actions";

/** POST /api/queue/:id/call */
export const POST = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  const data = unwrap(await callNextAction({ queue_id: id }));
  return jsonOk(data.entry);
});
