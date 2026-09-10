"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "./client";

export type LiveStatus = "connecting" | "live" | "offline";

export interface TableSubscription {
  table: string;
  /** PostgREST-style filter, e.g. `id=eq.<uuid>`. */
  filter?: string;
}

interface Listener {
  onChange: () => void;
  onStatus: (status: LiveStatus) => void;
}

interface Entry {
  key: string;
  channel: RealtimeChannel;
  subs: TableSubscription[];
  listeners: Set<Listener>;
  status: LiveStatus;
  teardownTimer?: ReturnType<typeof setTimeout>;
  retryTimer?: ReturnType<typeof setTimeout>;
  retries: number;
}

/**
 * Ref-counted registry of Realtime channels, keyed by what they listen to.
 *
 * Why this exists instead of one channel per component:
 *  - `supabase.removeChannel()` disconnects the whole socket once the last
 *    channel is removed. React Strict Mode (and Fast Refresh) mount effects
 *    twice, so a naive per-component channel races its own teardown and can end
 *    up "subscribed" to a socket that was just disconnected.
 *  - Several components legitimately watch the same rows (the shop page renders
 *    the queue panel for mobile and desktop). Sharing one channel halves the
 *    connections and keeps them in lockstep.
 *  - A dropped socket does not always surface as a channel callback, so a
 *    watchdog reconciles the reported status with the channel's real state.
 *    Without it the UI can show a live indicator while no events arrive.
 */
const registry = new Map<string, Entry>();

const TEARDOWN_DELAY_MS = 2_000;
const WATCHDOG_INTERVAL_MS = 10_000;
const MAX_RETRY_DELAY_MS = 30_000;

let watchdog: ReturnType<typeof setInterval> | undefined;
let listenersBound = false;

export function subscribeShared(key: string, subs: TableSubscription[], listener: Listener): () => void {
  let entry = registry.get(key);

  if (entry) {
    clearTimeout(entry.teardownTimer);
    entry.teardownTimer = undefined;
  } else {
    entry = createEntry(key, subs);
    registry.set(key, entry);
  }

  entry.listeners.add(listener);
  listener.onStatus(entry.status);
  startWatchdog();

  return () => {
    const current = registry.get(key);
    if (!current) return;
    current.listeners.delete(listener);
    if (current.listeners.size > 0) return;
    current.teardownTimer = setTimeout(() => {
      const latest = registry.get(key);
      if (!latest || latest.listeners.size > 0) return;
      clearTimeout(latest.retryTimer);
      registry.delete(key);
      void createClient().removeChannel(latest.channel);
      if (registry.size === 0) stopWatchdog();
    }, TEARDOWN_DELAY_MS);
  };
}

function createEntry(key: string, subs: TableSubscription[]): Entry {
  const entry = { key, subs, listeners: new Set<Listener>(), status: "connecting" as LiveStatus, retries: 0 } as Entry;
  entry.channel = buildChannel(entry);
  return entry;
}

function buildChannel(entry: Entry): RealtimeChannel {
  const supabase = createClient();
  // Unique topic per attempt so a retry never collides with a channel that is
  // still being torn down.
  let channel = supabase.channel(`${entry.key}:${Math.random().toString(36).slice(2, 10)}`);

  for (const sub of entry.subs) {
    channel = channel.on("postgres_changes", { event: "*", schema: "public", table: sub.table, filter: sub.filter }, () => {
      for (const l of entry.listeners) l.onChange();
    });
  }

  channel.subscribe((state) => {
    if (state === "SUBSCRIBED") {
      entry.retries = 0;
      setStatus(entry, "live");
      // Catch up on anything missed while (re)connecting.
      for (const l of entry.listeners) l.onChange();
    } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
      setStatus(entry, "offline");
      scheduleRetry(entry);
    }
  });

  return channel;
}

function setStatus(entry: Entry, status: LiveStatus) {
  if (entry.status === status) return;
  entry.status = status;
  for (const l of entry.listeners) l.onStatus(status);
}

/** Rebuild a dropped channel with exponential backoff while listeners remain. */
function scheduleRetry(entry: Entry) {
  if (entry.retryTimer || entry.listeners.size === 0) return;
  const delay = Math.min(MAX_RETRY_DELAY_MS, 1_000 * 2 ** entry.retries);
  entry.retries += 1;
  entry.retryTimer = setTimeout(() => {
    entry.retryTimer = undefined;
    if (!registry.has(entry.key) || entry.listeners.size === 0) return;
    const old = entry.channel;
    entry.status = "connecting";
    for (const l of entry.listeners) l.onStatus("connecting");
    entry.channel = buildChannel(entry);
    void createClient().removeChannel(old);
  }, delay);
}

/**
 * Reconcile every entry's reported status with the channel's real state. A
 * socket dropped by a throttled background tab or a network change does not
 * reliably invoke the channel callback, so without this the UI would keep
 * claiming to be live.
 */
function healthCheck() {
  for (const entry of registry.values()) {
    if (entry.listeners.size === 0) continue;
    const state = entry.channel.state as string;
    const healthy = state === "joined" || state === "joining";
    if (!healthy) {
      setStatus(entry, "offline");
      scheduleRetry(entry);
    }
  }
}

function startWatchdog() {
  if (typeof window === "undefined") return;
  if (!listenersBound) {
    listenersBound = true;
    window.addEventListener("online", healthCheck);
    window.addEventListener("focus", healthCheck);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") healthCheck();
    });
  }
  watchdog ??= setInterval(healthCheck, WATCHDOG_INTERVAL_MS);
}

function stopWatchdog() {
  if (watchdog) {
    clearInterval(watchdog);
    watchdog = undefined;
  }
}
