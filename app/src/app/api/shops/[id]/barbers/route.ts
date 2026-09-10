import { handle, jsonOk, readJson } from "@/lib/api/response";
import { unwrap } from "@/lib/api/unwrap";
import { createBarberAction } from "@/lib/shops/actions";
import { createClient } from "@/lib/supabase/server";
import { toAppError } from "@/lib/errors";

export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data, error } = await supabase.from("barbers").select("*").eq("shop_id", id).order("created_at");
  if (error) throw toAppError(error);
  return jsonOk(data);
});

export const POST = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = (await readJson(req)) as Record<string, unknown>;
  const data = unwrap(await createBarberAction({ ...body, shop_id: id }));
  return jsonOk(data.barber, { status: 201 });
});
