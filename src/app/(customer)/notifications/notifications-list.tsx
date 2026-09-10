"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BellOff, CheckCheck } from "lucide-react";
import { LiveDot } from "@/components/queue/live-dot";
import { NotificationItem } from "@/components/customer/notification-item";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/tabs";
import { useAction } from "@/hooks/use-action";
import { useNotifications } from "@/hooks/use-notifications";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/notifications/actions";
import type { Notification } from "@/types/domain";

export function NotificationsList({ userId, initial }: { userId: string; initial: Notification[] }) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const { data, live, refetch } = useNotifications(userId, initial);
  const items = data ?? initial;

  const afterChange = React.useCallback(() => {
    void refetch();
    router.refresh();
  }, [refetch, router]);

  const markOne = useAction(markNotificationReadAction, { onSuccess: afterChange, toastError: false });
  const markAll = useAction(markAllNotificationsReadAction, { successMessage: "All caught up", onSuccess: afterChange });

  const unread = items.filter((n) => !n.read);
  const visible = filter === "unread" ? unread : items;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Segmented
            aria-label="Filter notifications"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: `All (${items.length})` },
              { value: "unread", label: `Unread (${unread.length})` },
            ]}
          />
          <LiveDot status={live} />
        </div>
        {unread.length > 0 ? (
          <Button variant="outline" size="sm" loading={markAll.pending} onClick={() => markAll.run(undefined)}>
            <CheckCheck /> Mark all as read
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<BellOff />}
          title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
          description={filter === "unread" ? "You're all caught up." : "Join a queue and we'll keep you posted on your turn."}
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {visible.map((n) => (
              <NotificationItem key={n.id} notification={n} pending={markOne.pending} onMarkRead={(id) => markOne.run({ id })} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
