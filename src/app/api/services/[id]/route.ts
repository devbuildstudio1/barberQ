import { handle, jsonOk, readJson } from "@/lib/api/response";
import { unwrap } from "@/lib/api/unwrap";
import { deleteServiceAction, updateServiceAction } from "@/lib/shops/actions";

export const PATCH = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = (await readJson(req)) as Record<string, unknown>;
  const data = unwrap(await updateServiceAction({ ...body, service_id: id }));
  return jsonOk(data.service);
});

export const DELETE = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  return jsonOk(unwrap(await deleteServiceAction({ service_id: id })));
});
