import { handle, jsonOk, readJson } from "@/lib/api/response";
import { unwrap } from "@/lib/api/unwrap";
import { assertProfile } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors";
import { updateShopAction } from "@/lib/shops/actions";
import { getShopDetails } from "@/lib/shops/queries";
import { createClient } from "@/lib/supabase/server";

export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  const details = await getShopDetails(id);
  if (!details) throw new AppError("NOT_FOUND");
  return jsonOk(details);
});

export const PATCH = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = (await readJson(req)) as Record<string, unknown>;
  const data = unwrap(await updateShopAction({ ...body, shop_id: id }));
  return jsonOk(data.shop);
});

/** DELETE is restricted to admins, or owners whose shop is still pending. */
export const DELETE = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  await assertProfile();
  const supabase = await createClient();
  const { error, count } = await supabase.from("shops").delete({ count: "exact" }).eq("id", id);
  if (error) throw error;
  if (!count) throw new AppError("FORBIDDEN", "This shop can't be deleted.");
  return jsonOk({ deleted: true });
});
