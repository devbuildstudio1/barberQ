import { handle, jsonOk, readJson } from "@/lib/api/response";
import { unwrap } from "@/lib/api/unwrap";
import { deleteBarberAction, updateBarberAction } from "@/lib/shops/actions";

export const PATCH = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = (await readJson(req)) as Record<string, unknown>;
  const data = unwrap(await updateBarberAction({ ...body, barber_id: id }));
  return jsonOk(data.barber);
});

export const DELETE = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  return jsonOk(unwrap(await deleteBarberAction({ barber_id: id })));
});
