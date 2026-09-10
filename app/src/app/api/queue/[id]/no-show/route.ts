import { handle, jsonOk } from "@/lib/api/response";
import { unwrap } from "@/lib/api/unwrap";
import { markNoShowAction } from "@/lib/queue/actions";

/** POST /api/queue/:id/no-show */
export const POST = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  const data = unwrap(await markNoShowAction({ entry_id: id }));
  return jsonOk(data.entry);
});
