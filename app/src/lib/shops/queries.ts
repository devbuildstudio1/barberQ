import "server-only";

import { cache } from "react";
import { AppError, toAppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { filterShops, scoreShop, sortShops } from "@/lib/recommendations/score";
import type { ShopSearchParams } from "@/lib/validation/queue";
import type { Barber, QueueSnapshot, RankedShop, Service, Shop, ShopLiveStatus } from "@/types/domain";

/** Approved shops with live stats, scored/filtered/sorted per the search params. */
export async function searchShops(params: ShopSearchParams): Promise<RankedShop[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_public_shops", {
    p_lat: params.lat,
    p_lng: params.lng,
    p_query: params.q ?? undefined,
    p_limit: 200,
  });
  if (error) throw toAppError(error);
  const ranked = (data ?? []).map(scoreShop);
  return sortShops(filterShops(ranked, params), params.sort);
}

export interface ShopReview {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  barber_name: string | null;
  reviewer_name: string;
  reviewer_image: string | null;
}

export interface ShopDetails {
  shop: Shop;
  barbers: Barber[];
  services: Service[];
  reviews: ShopReview[];
  live: ShopLiveStatus;
  queues: QueueSnapshot[];
}

/** Everything the shop page needs. RLS hides unapproved shops from the public. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getShopDetails = cache(async (shopId: string): Promise<ShopDetails | null> => {
  if (!UUID_RE.test(shopId)) return null;
  const supabase = await createClient();
  const { data: shop, error } = await supabase.from("shops").select("*").eq("id", shopId).maybeSingle();
  if (error) throw toAppError(error);
  if (!shop) return null;

  const [barbersRes, servicesRes, reviewsRes, liveRes, queuesRes] = await Promise.all([
    supabase.from("barbers").select("*").eq("shop_id", shopId).eq("status", "active").order("created_at"),
    supabase.from("services").select("*").eq("shop_id", shopId).order("sort_order").order("created_at"),
    supabase.rpc("get_shop_reviews", { p_shop_id: shopId, p_limit: 20 }),
    supabase.rpc("get_shop_live_status", { p_shop_id: shopId }),
    supabase.from("queues").select("id").eq("shop_id", shopId).eq("queue_date", todayInAppTz()),
  ]);
  if (liveRes.error) throw toAppError(liveRes.error);

  const reviews = (reviewsRes.data ?? []) as unknown as ShopReview[];

  const queueIds = (queuesRes.data ?? []).map((q) => q.id);
  const snapshots = await Promise.all(
    queueIds.map(async (id) => {
      const { data } = await supabase.rpc("get_queue_snapshot", { p_queue_id: id });
      return data as unknown as QueueSnapshot | null;
    }),
  );

  return {
    shop,
    barbers: barbersRes.data ?? [],
    services: servicesRes.data ?? [],
    reviews,
    live: liveRes.data as unknown as ShopLiveStatus,
    queues: snapshots.filter((s): s is QueueSnapshot => s != null),
  };
});

export async function getQueueSnapshot(queueId: string): Promise<QueueSnapshot> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_queue_snapshot", { p_queue_id: queueId });
  if (error) throw toAppError(error);
  if (!data) throw new AppError("NOT_FOUND");
  return data as unknown as QueueSnapshot;
}

/** Calendar date in the platform timezone (matches app_today() in SQL). */
export function todayInAppTz(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
