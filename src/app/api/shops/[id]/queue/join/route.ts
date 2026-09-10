import { handle, jsonOk, readJson } from "@/lib/api/response";
import { unwrap } from "@/lib/api/unwrap";
import { joinQueueAction } from "@/lib/queue/actions";

/** POST /api/shops/:id/queue/join — customer joins today's queue. */
export const POST = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = (await readJson(req)) as Record<string, unknown>;
  const data = unwrap(await joinQueueAction({ ...body, shop_id: id }));
  return jsonOk(data.entry, { status: 201 });
});
