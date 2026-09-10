import { describe, expect, it } from "vitest";
import {
  availabilityBonus,
  distanceScore,
  filterShops,
  ratingScore,
  recommendationScore,
  reviewConfidence,
  sortShops,
  waitScore,
} from "@/lib/recommendations/score";
import type { RankedShop, ShopListing } from "@/types/domain";

function listing(overrides: Partial<ShopListing> = {}): ShopListing {
  return {
    id: crypto.randomUUID(),
    name: "Test Shop",
    description: null,
    address: "1 Test Road",
    city: "Chennai",
    latitude: 13.06,
    longitude: 80.25,
    image: null,
    images: [],
    rating: 4.2,
    review_count: 30,
    opening_time: "09:00:00",
    closing_time: "21:00:00",
    is_open: true,
    queue_paused: false,
    distance_km: 2,
    waiting_count: 3,
    estimated_wait_minutes: 30,
    min_price: 150,
    barber_count: 2,
    created_at: new Date().toISOString(),
    ...overrides,
  } as ShopListing;
}

function ranked(overrides: Partial<ShopListing> = {}): RankedShop {
  const base = listing(overrides);
  return { ...base, score: recommendationScore({
    rating: Number(base.rating),
    reviewCount: base.review_count,
    distanceKm: base.distance_km,
    waitMinutes: base.estimated_wait_minutes,
    isOpen: base.is_open,
    queuePaused: base.queue_paused,
  }) };
}

describe("ratingScore", () => {
  it("stays within 0..1", () => {
    expect(ratingScore(5, 1000)).toBeLessThanOrEqual(1);
    expect(ratingScore(0, 0)).toBeGreaterThanOrEqual(0);
  });

  it("shrinks a perfect score with few reviews toward the prior", () => {
    const fewReviews = ratingScore(5, 1);
    const manyReviews = ratingScore(5, 500);
    expect(fewReviews).toBeLessThan(manyReviews);
  });

  it("treats a shop with no reviews as average", () => {
    expect(ratingScore(0, 0)).toBeCloseTo(3.5 / 5, 5);
  });

  it("ranks a better-rated shop above a worse one at equal volume", () => {
    expect(ratingScore(4.8, 50)).toBeGreaterThan(ratingScore(3.2, 50));
  });
});

describe("distanceScore", () => {
  it("is highest at zero distance and decreases monotonically", () => {
    expect(distanceScore(0)).toBe(1);
    expect(distanceScore(1)).toBeGreaterThan(distanceScore(3));
    expect(distanceScore(3)).toBeGreaterThan(distanceScore(15));
  });

  it("is neutral when distance is unknown", () => {
    expect(distanceScore(null)).toBe(0.5);
    expect(distanceScore(Number.NaN)).toBe(0.5);
  });

  it("halves at the 3 km reference point", () => {
    expect(distanceScore(3)).toBeCloseTo(0.5, 5);
  });
});

describe("waitScore", () => {
  it("prefers shorter waits", () => {
    expect(waitScore(0)).toBe(1);
    expect(waitScore(10)).toBeGreaterThan(waitScore(45));
  });

  it("treats negative waits as zero", () => {
    expect(waitScore(-30)).toBe(1);
  });
});

describe("reviewConfidence", () => {
  it("grows with volume and saturates below 1", () => {
    expect(reviewConfidence(0)).toBe(0);
    expect(reviewConfidence(20)).toBeGreaterThan(reviewConfidence(5));
    expect(reviewConfidence(1000)).toBeLessThanOrEqual(1);
  });
});

describe("availabilityBonus", () => {
  it("rewards open shops, penalises paused queues and zeroes closed shops", () => {
    expect(availabilityBonus(true, false)).toBe(1);
    expect(availabilityBonus(true, true)).toBe(0.4);
    expect(availabilityBonus(false, false)).toBe(0);
  });
});

describe("recommendationScore", () => {
  const base = { rating: 4.5, reviewCount: 50, distanceKm: 1, waitMinutes: 10, isOpen: true, queuePaused: false };

  it("stays within 0..1", () => {
    expect(recommendationScore(base)).toBeGreaterThan(0);
    expect(recommendationScore(base)).toBeLessThanOrEqual(1);
  });

  it("ranks an open shop above the same shop when closed", () => {
    expect(recommendationScore(base)).toBeGreaterThan(recommendationScore({ ...base, isOpen: false }));
  });

  it("ranks a nearer shop above a farther one", () => {
    expect(recommendationScore(base)).toBeGreaterThan(recommendationScore({ ...base, distanceKm: 12 }));
  });

  it("ranks a shorter wait above a longer one", () => {
    expect(recommendationScore(base)).toBeGreaterThan(recommendationScore({ ...base, waitMinutes: 90 }));
  });

  it("is deterministic", () => {
    expect(recommendationScore(base)).toBe(recommendationScore(base));
  });
});

describe("sortShops", () => {
  const near = ranked({ name: "Near", distance_km: 0.5, rating: 3.5, estimated_wait_minutes: 60, min_price: 400 });
  const cheap = ranked({ name: "Cheap", distance_km: 8, rating: 3.9, estimated_wait_minutes: 45, min_price: 80 });
  const best = ranked({ name: "Best", distance_km: 4, rating: 4.9, review_count: 200, estimated_wait_minutes: 20, min_price: 250 });
  const quick = ranked({ name: "Quick", distance_km: 6, rating: 4.0, estimated_wait_minutes: 5, min_price: 300 });
  const closed = ranked({ name: "Closed", is_open: false, estimated_wait_minutes: 0, distance_km: 0.2, min_price: 100 });
  const all = [near, cheap, best, quick, closed];

  it("sorts by distance when asked for nearest", () => {
    expect(sortShops(all, "nearest").map((s) => s.name)).toEqual(["Closed", "Near", "Best", "Quick", "Cheap"]);
  });

  it("sorts by rating when asked for highest rated", () => {
    expect(sortShops(all, "rating")[0].name).toBe("Best");
  });

  it("sorts by price when asked for lowest price", () => {
    expect(sortShops(all, "price")[0].name).toBe("Cheap");
  });

  it("puts closed shops last when sorting by wait, despite their empty queue", () => {
    const order = sortShops(all, "wait").map((s) => s.name);
    expect(order[0]).toBe("Quick");
    expect(order.at(-1)).toBe("Closed");
  });

  it("does not mutate the input array", () => {
    const input = [...all];
    sortShops(input, "rating");
    expect(input.map((s) => s.name)).toEqual(all.map((s) => s.name));
  });
});

describe("filterShops", () => {
  const shops = [
    ranked({ name: "A", is_open: true, distance_km: 1, rating: 4.5, min_price: 100, estimated_wait_minutes: 10 }),
    ranked({ name: "B", is_open: false, distance_km: 2, rating: 3.0, min_price: 500, estimated_wait_minutes: 0 }),
    ranked({ name: "C", is_open: true, distance_km: 9, rating: 4.9, min_price: 250, estimated_wait_minutes: 90 }),
  ];

  it("filters to open shops", () => {
    expect(filterShops(shops, { open: true }).map((s) => s.name)).toEqual(["A", "C"]);
  });

  it("filters by max distance", () => {
    expect(filterShops(shops, { maxDistance: 5 }).map((s) => s.name)).toEqual(["A", "B"]);
  });

  it("filters by minimum rating", () => {
    expect(filterShops(shops, { minRating: 4 }).map((s) => s.name)).toEqual(["A", "C"]);
  });

  it("filters by max starting price", () => {
    expect(filterShops(shops, { maxPrice: 300 }).map((s) => s.name)).toEqual(["A", "C"]);
  });

  it("ignores the wait filter for closed shops", () => {
    expect(filterShops(shops, { maxWait: 30 }).map((s) => s.name)).toEqual(["A", "B"]);
  });

  it("combines filters", () => {
    expect(filterShops(shops, { open: true, maxWait: 30, minRating: 4 }).map((s) => s.name)).toEqual(["A"]);
  });
});
