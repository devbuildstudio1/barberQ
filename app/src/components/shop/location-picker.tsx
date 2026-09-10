"use client";

import * as React from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LocationPickerProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  onChange: (coords: { latitude: number | null; longitude: number | null }) => void;
  className?: string;
}

/**
 * Location capture without a paid maps SDK: one-tap "use current location" plus
 * manual coordinates. Swap in a draggable map here when map credentials exist.
 */
export function LocationPicker({ latitude, longitude, onChange, className }: LocationPickerProps) {
  const [locating, setLocating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const hasCoords = latitude != null && longitude != null;

  function useCurrent() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Your browser can't share location. Enter coordinates manually.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ latitude: round(pos.coords.latitude), longitude: round(pos.coords.longitude) });
        setLocating(false);
      },
      () => {
        setError("We couldn't get your location. Enter coordinates manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={useCurrent} loading={locating}>
          <LocateFixed /> Use shop&apos;s current location
        </Button>
        {hasCoords ? (
          <span className="inline-flex items-center gap-1 text-sm text-success-700">
            <MapPin className="size-4" aria-hidden /> Pinned at {latitude!.toFixed(4)}, {longitude!.toFixed(4)}
          </span>
        ) : (
          <span className="text-sm text-ink-500">Not pinned — customers won&apos;t see distance.</span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor="latitude" className="mb-1 block text-xs font-medium text-ink-600">
            Latitude
          </label>
          <Input
            id="latitude"
            inputMode="decimal"
            placeholder="13.0604"
            value={latitude ?? ""}
            onChange={(e) => onChange({ latitude: toNum(e.target.value), longitude: longitude ?? null })}
          />
        </div>
        <div>
          <label htmlFor="longitude" className="mb-1 block text-xs font-medium text-ink-600">
            Longitude
          </label>
          <Input
            id="longitude"
            inputMode="decimal"
            placeholder="80.2496"
            value={longitude ?? ""}
            onChange={(e) => onChange({ latitude: latitude ?? null, longitude: toNum(e.target.value) })}
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function toNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
