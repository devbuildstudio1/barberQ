"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeShared, type LiveStatus } from "@/lib/supabase/realtime";
import type { Notification } from "@/types/domain";

export const notificationsKey = ["notifications"] as const;
export const unreadCountKey = ["notifications", "unread"] as const;

/** Live list of the signed-in user's notifications. */
export function useNotifications(userId: string, initial?: Notification[]) {
  const [live, setLive] = React.useState<LiveStatus>("connecting");
  const query = useQuery({
    queryKey: notificationsKey,
    initialData: initial,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });

  const refetch = query.refetch;
  React.useEffect(() => {
    return subscribeShared(`notifications:${userId}`, [{ table: "notifications", filter: `user_id=eq.${userId}` }], {
      onChange: () => void refetch(),
      onStatus: setLive,
    });
  }, [userId, refetch]);

  return { ...query, live };
}
