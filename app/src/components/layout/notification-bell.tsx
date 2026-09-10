"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

/** Header bell with a live unread badge. */
export function NotificationBell({ userId, initialUnread = 0 }: { userId: string; initialUnread?: number }) {
  const { data } = useNotifications(userId);
  const unread = data ? data.filter((n) => !n.read).length : initialUnread;

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
    >
      <Bell />
      {unread > 0 ? (
        <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold text-white tabular">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
