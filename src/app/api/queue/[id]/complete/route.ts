import { handle, jsonOk } from "@/lib/api/response";
import { unwrap } from "@/lib/api/unwrap";
import { completeServiceAction } from "@/lib/queue/actions";

/** POST /api/queue/:id/complete */
export const POST = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  const data = unwrap(await completeServiceAction({ entry_id: id }));
  return jsonOk(data.entry);
});
