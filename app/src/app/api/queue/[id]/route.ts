import { handle, jsonOk } from "@/lib/api/response";
import { getQueueSnapshot } from "@/lib/shops/queries";

/** GET /api/queue/:id — public snapshot of one queue. */
export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  return jsonOk(await getQueueSnapshot(id));
});
