"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { MyQueueEntry, QueueSnapshot, ShopLiveStatus } from "@/types/domain";

export type LiveStatus = "connecting" | "live" | "offline";

/**
 * Subscribe to Postgres Changes and invalidate the given query keys whenever a
 * matching row changes. One channel per component instance; cleaned up on
 * unmount. Falls back to polling while the socket is not connected.
 */
function useRealtimeInvalidation(
  channelName: string,
  subscriptions: { table: string; filter?: string }[],
  queryKeys: readonly (readonly unknown[])[],
  enabled = true,
): LiveStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState<LiveStatus>("connecting");
  const keysRef = React.useRef(queryKeys);
  React.useEffect(() => {
    keysRef.current = queryKeys;
  });
  const subsKey = JSON.stringify(subscriptions);

  React.useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    let channel: RealtimeChannel = supabase.channel(channelName);
    for (const sub of JSON.parse(subsKey) as { table: string; filter?: string }[]) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: sub.table, filter: sub.filter },
        () => {
          for (const key of keysRef.current) void queryClient.invalidateQueries({ queryKey: key });
        },
      );
    }
    channel.subscribe((state) => {
      if (state === "SUBSCRIBED") {
        setStatus("live");
        // Catch up on anything missed while (re)connecting.
        for (const key of keysRef.current) void queryClient.invalidateQueries({ queryKey: key });
      } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
        setStatus("offline");
      }
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelName, subsKey, enabled, queryClient]);

  return enabled ? status : "offline";
}

export function queueSnapshotKey(queueId: string) {
  return ["queue-snapshot", queueId] as const;
}

/** Live snapshot of a public queue (no personal data). */
export function useQueueSnapshot(queueId: string | null, initial?: QueueSnapshot | null) {
  const query = useQuery({
    queryKey: queueSnapshotKey(queueId ?? "none"),
    enabled: !!queueId,
    initialData: initial ?? undefined,
    queryFn: async () => {
      const { data, error } = await createClient().rpc("get_queue_snapshot", { p_queue_id: queueId! });
      if (error) throw error;
      return data as unknown as QueueSnapshot;
    },
    refetchInterval: (q) => (q.state.status === "error" ? 5_000 : 30_000),
  });
  const live = useRealtimeInvalidation(
    `queue:${queueId}`,
    queueId ? [{ table: "queues", filter: `id=eq.${queueId}` }] : [],
    queueId ? [queueSnapshotKey(queueId)] : [],
    !!queueId,
  );
  return { ...query, live };
}

export function shopLiveKey(shopId: string) {
  return ["shop-live", shopId] as const;
}

/** Live shop-level status (open/paused, total waiting, wait estimate). */
export function useShopLiveStatus(shopId: string, initial?: ShopLiveStatus) {
  const query = useQuery({
    queryKey: shopLiveKey(shopId),
    initialData: initial,
    queryFn: async () => {
      const { data, error } = await createClient().rpc("get_shop_live_status", { p_shop_id: shopId });
      if (error) throw error;
      return data as unknown as ShopLiveStatus;
    },
    refetchInterval: 30_000,
  });
  const live = useRealtimeInvalidation(
    `shop-live:${shopId}`,
    [
      { table: "queues", filter: `shop_id=eq.${shopId}` },
      { table: "shops", filter: `id=eq.${shopId}` },
    ],
    [shopLiveKey(shopId)],
  );
  return { ...query, live };
}

export const myQueueKey = ["my-queue"] as const;

/**
 * The signed-in customer's active entry with live position. Subscribes to the
 * queue row (bumped on every entry change) and the customer's own entry row.
 */
export function useMyQueueEntry(initial: MyQueueEntry | null, userId: string) {
  const query = useQuery({
    queryKey: myQueueKey,
    initialData: initial,
    queryFn: async () => {
      const { data, error } = await createClient().rpc("get_my_active_queue_entry");
      if (error) throw error;
      return (data as unknown as MyQueueEntry | null) ?? null;
    },
    refetchInterval: (q) => (q.state.status === "error" ? 5_000 : 20_000),
  });
  const queueId = query.data?.queue.id ?? null;
  const live = useRealtimeInvalidation(
    `my-queue:${userId}:${queueId ?? "none"}`,
    [
      ...(queueId ? [{ table: "queues", filter: `id=eq.${queueId}` }] : []),
      { table: "queue_entries", filter: `user_id=eq.${userId}` },
    ],
    [myQueueKey],
  );
  return { ...query, live };
}
