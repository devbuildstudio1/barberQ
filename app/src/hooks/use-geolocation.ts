"use client";

import * as React from "react";
import type { LatLng } from "@/types/domain";

const STORAGE_KEY = "qc:location";
const TTL_MS = 24 * 60 * 60_000;

interface Stored extends LatLng {
  label?: string;
  at: number;
}

type Status = "idle" | "locating" | "granted" | "denied" | "unsupported";

interface Snapshot {
  location: LatLng | null;
  label: string | null;
  status: Status;
}

/* ---- Tiny external store (module-level) so React can subscribe without effects ---- */
const listeners = new Set<() => void>();
let snapshot: Snapshot | null = null; // lazily hydrated from localStorage on the client
const SERVER_SNAPSHOT: Snapshot = { location: null, label: null, status: "idle" };

function getSnapshot(): Snapshot {
  if (snapshot) return snapshot;
  const cached = readCache();
  snapshot = cached
    ? { location: { lat: cached.lat, lng: cached.lng }, label: cached.label ?? null, status: "granted" }
    : { ...SERVER_SNAPSHOT };
  return snapshot;
}

function setSnapshot(next: Partial<Snapshot>) {
  snapshot = { ...getSnapshot(), ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface GeolocationState extends Snapshot {
  request: () => void;
  clear: () => void;
}

/**
 * Browser geolocation with a 24h localStorage cache. Never blocks rendering;
 * pages work with a default city centre until the user shares location.
 */
export function useGeolocation(onChange?: (loc: LatLng | null) => void): GeolocationState {
  const state = React.useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  });

  const request = React.useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setSnapshot({ status: "unsupported" });
      return;
    }
    setSnapshot({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) };
        writeCache({ ...loc, label: "Current location", at: Date.now() });
        setSnapshot({ location: loc, label: "Current location", status: "granted" });
        onChangeRef.current?.(loc);
      },
      () => setSnapshot({ status: "denied" }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  }, []);

  const clear = React.useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setSnapshot({ location: null, label: null, status: "idle" });
    onChangeRef.current?.(null);
  }, []);

  return { ...state, request, clear };
}

function readCache(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (Date.now() - parsed.at > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(value: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}
