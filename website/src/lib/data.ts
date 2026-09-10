import "server-only";

import { supabase, withTimeout } from "./supabase";

/** A shop as the public directory exposes it. */
export interface PublicShop {
  id: string;
  name: string;
  city: string | null;
  address: string;
  image: string | null;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  queuePaused: boolean;
  waitingCount: number;
  estimatedWaitMinutes: number;
  minPrice: number | null;
  barberCount: number;
}

export interface PlatformStats {
  approvedShops: number;
  openNow: number;
  activeBarbers: number;
  completedServices: number;
  averageRating: number;
  totalReviews: number;
  cities: number;
  medianWaitMinutes: number | null;
  /** False when the numbers are fallback copy rather than live data. */
  live: boolean;
}

/**
 * Shown when the database is unconfigured or unreachable. Deliberately modest
 * and rounded so the page never states a precise figure it cannot back up.
 */
const FALLBACK_STATS: PlatformStats = {
  approvedShops: 0,
  openNow: 0,
  activeBarbers: 0,
  completedServices: 0,
  averageRating: 0,
  totalReviews: 0,
  cities: 1,
  medianWaitMinutes: null,
  live: false,
};

interface RawStats {
  approved_shops?: number;
  open_now?: number;
  active_barbers?: number;
  completed_services?: number;
  average_rating?: number | string;
  total_reviews?: number;
  cities?: number;
  median_wait_minutes?: number | null;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const client = supabase();
  if (!client) return FALLBACK_STATS;

  const result = await withTimeout(client.rpc("get_public_stats"));
  if (!result || result.error || !result.data) return FALLBACK_STATS;

  const raw = result.data as RawStats;
  return {
    approvedShops: raw.approved_shops ?? 0,
    openNow: raw.open_now ?? 0,
    activeBarbers: raw.active_barbers ?? 0,
    completedServices: raw.completed_services ?? 0,
    averageRating: Number(raw.average_rating ?? 0),
    totalReviews: raw.total_reviews ?? 0,
    cities: raw.cities ?? 1,
    medianWaitMinutes: raw.median_wait_minutes ?? null,
    live: true,
  };
}

interface RawShop {
  id: string;
  name: string;
  city: string | null;
  address: string;
  image: string | null;
  rating: number | string;
  review_count: number;
  is_open: boolean;
  queue_paused: boolean;
  waiting_count: number;
  estimated_wait_minutes: number;
  min_price: number | string | null;
  barber_count: number;
}

/**
 * A handful of real shops for the home page. Open shops first, then by rating,
 * so the strip shows somewhere a visitor could actually walk into right now.
 */
export async function getFeaturedShops(limit = 6): Promise<PublicShop[]> {
  const client = supabase();
  if (!client) return [];

  const result = await withTimeout(client.rpc("list_public_shops", { p_limit: 60 }));
  if (!result || result.error || !Array.isArray(result.data)) return [];

  return (result.data as RawShop[])
    .map(
      (s): PublicShop => ({
        id: s.id,
        name: s.name,
        city: s.city,
        address: s.address,
        image: s.image,
        rating: Number(s.rating ?? 0),
        reviewCount: s.review_count ?? 0,
        isOpen: !!s.is_open,
        queuePaused: !!s.queue_paused,
        waitingCount: s.waiting_count ?? 0,
        estimatedWaitMinutes: s.estimated_wait_minutes ?? 0,
        minPrice: s.min_price == null ? null : Number(s.min_price),
        barberCount: s.barber_count ?? 0,
      }),
    )
    .sort((a, b) => {
      if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
      return b.rating - a.rating || b.reviewCount - a.reviewCount;
    })
    .slice(0, limit);
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function formatINR(amount: number): string {
  return inr.format(amount);
}

export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} hr` : `${h} hr ${rest} min`;
}

/** Round down to a friendly marketing figure: 47 -> "40+", 5 -> "5". */
export function approx(n: number): string {
  if (n < 10) return String(n);
  if (n < 100) return `${Math.floor(n / 10) * 10}+`;
  if (n < 1000) return `${Math.floor(n / 50) * 50}+`;
  return `${Math.floor(n / 500) * 500}+`;
}
