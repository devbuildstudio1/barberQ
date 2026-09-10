import type { RankedShop, ShopListing } from "@/types/domain";
import type { ShopSearchParams } from "@/lib/validation/queue";

/**
 * Recommendation scoring — deliberately simple and isolated so it can be
 * replaced by a learned ranker later without touching the UI.
 *
 * score = w_rating * ratingScore
 *       + w_distance * distanceScore
 *       + w_wait * waitScore
 *       + w_reviews * reviewConfidence
 *       + availabilityBonus
 */
export const WEIGHTS = {
  rating: 0.35,
  distance: 0.25,
  wait: 0.2,
  reviews: 0.1,
  availability: 0.1,
} as const;

export interface ScoreInput {
  rating: number;
  reviewCount: number;
  distanceKm: number | null;
  waitMinutes: number;
  isOpen: boolean;
  queuePaused: boolean;
}

/** 0..1 — Bayesian-ish shrink toward 3.5 for shops with few reviews. */
export function ratingScore(rating: number, reviewCount: number): number {
  const prior = 3.5;
  const k = 5; // pseudo-count
  const shrunk = (rating * reviewCount + prior * k) / (reviewCount + k);
  return clamp(shrunk / 5, 0, 1);
}

/** 0..1 — 1 at 0 km, ~0.5 at 3 km, ~0 beyond 15 km. Unknown distance is neutral. */
export function distanceScore(distanceKm: number | null): number {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return 0.5;
  return clamp(1 / (1 + distanceKm / 3), 0, 1);
}

/** 0..1 — 1 at no wait, ~0.5 at 30 min, ~0 beyond 2 hours. */
export function waitScore(waitMinutes: number): number {
  return clamp(1 / (1 + Math.max(0, waitMinutes) / 30), 0, 1);
}

/** 0..1 — confidence rises with review volume (saturates ~50 reviews). */
export function reviewConfidence(reviewCount: number): number {
  return clamp(1 - Math.exp(-Math.max(0, reviewCount) / 20), 0, 1);
}

export function availabilityBonus(isOpen: boolean, queuePaused: boolean): number {
  if (!isOpen) return 0;
  return queuePaused ? 0.4 : 1;
}

export function recommendationScore(input: ScoreInput): number {
  const score =
    WEIGHTS.rating * ratingScore(input.rating, input.reviewCount) +
    WEIGHTS.distance * distanceScore(input.distanceKm) +
    WEIGHTS.wait * waitScore(input.waitMinutes) +
    WEIGHTS.reviews * reviewConfidence(input.reviewCount) +
    WEIGHTS.availability * availabilityBonus(input.isOpen, input.queuePaused);
  return Math.round(score * 1000) / 1000;
}

export function scoreShop(shop: ShopListing): RankedShop {
  return {
    ...shop,
    score: recommendationScore({
      rating: Number(shop.rating),
      reviewCount: shop.review_count,
      distanceKm: shop.distance_km,
      waitMinutes: shop.estimated_wait_minutes,
      isOpen: shop.is_open,
      queuePaused: shop.queue_paused,
    }),
  };
}

export type SortKey = ShopSearchParams["sort"];

export function sortShops(shops: RankedShop[], sort: SortKey): RankedShop[] {
  const list = [...shops];
  switch (sort) {
    case "nearest":
      return list.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity) || b.score - a.score);
    case "rating":
      return list.sort((a, b) => Number(b.rating) - Number(a.rating) || b.review_count - a.review_count);
    case "wait":
      return list.sort((a, b) => {
        // Closed shops go last regardless of their (empty) queue.
        if (a.is_open !== b.is_open) return a.is_open ? -1 : 1;
        return a.estimated_wait_minutes - b.estimated_wait_minutes || b.score - a.score;
      });
    case "price":
      return list.sort((a, b) => (Number(a.min_price ?? Infinity)) - (Number(b.min_price ?? Infinity)) || b.score - a.score);
    case "recommended":
    default:
      return list.sort((a, b) => b.score - a.score);
  }
}

export function filterShops(shops: RankedShop[], params: Pick<ShopSearchParams, "open" | "maxDistance" | "minRating" | "maxPrice" | "maxWait">): RankedShop[] {
  return shops.filter((s) => {
    if (params.open && !s.is_open) return false;
    if (params.maxDistance != null && s.distance_km != null && s.distance_km > params.maxDistance) return false;
    if (params.minRating != null && Number(s.rating) < params.minRating) return false;
    if (params.maxPrice != null && s.min_price != null && Number(s.min_price) > params.maxPrice) return false;
    if (params.maxWait != null && s.is_open && s.estimated_wait_minutes > params.maxWait) return false;
    return true;
  });
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
