import "server-only";

/**
 * Minimal in-memory sliding-window rate limiter for server actions/route
 * handlers. Suitable as a first line of defence on a single instance; in a
 * multi-region deployment pair it with Supabase Auth's built-in rate limits
 * (config.toml / dashboard) and an edge WAF rule.
 */
const buckets = new Map<string, number[]>();

export interface RateLimitOptions {
  /** Max requests within the window. */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
}

export function checkRateLimit(key: string, { limit, windowMs }: RateLimitOptions): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= limit) {
    return { ok: false, retryAfterMs: hits[0] + windowMs - now };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) {
    // Opportunistic GC of stale keys.
    for (const [k, v] of buckets) if (v.every((t) => t <= cutoff)) buckets.delete(k);
  }
  return { ok: true, retryAfterMs: 0 };
}
