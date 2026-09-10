import { handle, jsonOk, readJson } from "@/lib/api/response";
import { unwrap } from "@/lib/api/unwrap";
import { createShopAction } from "@/lib/shops/actions";
import { searchShops } from "@/lib/shops/queries";
import { shopSearchSchema } from "@/lib/validation/queue";
import { parseOrThrow } from "@/lib/validation/parse";

/** GET /api/shops — public discovery with search, filters and sorting. */
export const GET = handle(async (req) => {
  const url = new URL(req.url);
  const params = parseOrThrow(shopSearchSchema, Object.fromEntries(url.searchParams));
  const shops = await searchShops(params);
  return jsonOk(shops);
});

/** POST /api/shops — register a shop (shop owners only; created as PENDING). */
export const POST = handle(async (req) => {
  const data = unwrap(await createShopAction(await readJson(req)));
  return jsonOk(data.shop, { status: 201 });
});
