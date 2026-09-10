import type { LatLng } from "@/types/domain";

/** Google Maps directions link (no API key required). */
export function directionsUrl(lat: number | null, lng: number | null, label?: string): string {
  if (lat == null || lng == null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label ?? "")}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Haversine distance in km (mirrors public.distance_km in SQL). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Default map centre when the user hasn't shared location (Chennai). */
export const DEFAULT_LOCATION: LatLng = { lat: 13.0604, lng: 80.2496 };
export const DEFAULT_LOCATION_LABEL = "Chennai";
