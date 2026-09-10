"use client";

import Link from "next/link";
import {
  BellRing,
  CheckCircle2,
  Clock,
  Info,
  Store,
  Ticket,
  TriangleAlert,
  UserX,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatRelative } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types/domain";

const ICONS: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  queue_joined: { icon: Ticket, tone: "bg-brand-50 text-brand-700" },
  ahead_two: { icon: Clock, tone: "bg-info-50 text-info-700" },
  ahead_one: { icon: Clock, tone: "bg-warning-50 text-warning-700" },
  turn_approaching: { icon: BellRing, tone: "bg-warning-50 text-warning-700" },
  your_turn: { icon: BellRing, tone: "bg-success-50 text-success-700" },
  queue_cancelled: { icon: XCircle, tone: "bg-ink-100 text-ink-600" },
  no_show: { icon: UserX, tone: "bg-danger-50 text-danger-700" },
  service_completed: { icon: CheckCircle2, tone: "bg-success-50 text-success-700" },
  shop_approved: { icon: Store, tone: "bg-success-50 text-success-700" },
  shop_rejected: { icon: TriangleAlert, tone: "bg-danger-50 text-danger-700" },
  shop_suspended: { icon: TriangleAlert, tone: "bg-danger-50 text-danger-700" },
  system: { icon: Info, tone: "bg-ink-100 text-ink-600" },
};

interface Props {
  notification: Notification;
  onMarkRead: (id: string) => void;
  pending?: boolean;
}

export function NotificationItem({ notification, onMarkRead, pending }: Props) {
  const { icon: Icon, tone } = ICONS[notification.type] ?? ICONS.system;
  const data = (notification.data ?? {}) as { shop_id?: string; queue_entry_id?: string };
  const href = queueTypes.has(notification.type) ? "/my-queue" : data.shop_id ? `/shops/${data.shop_id}` : null;

  const body = (
    <>
      <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full", tone)} aria-hidden>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold text-ink-950">{notification.title}</span>
          {!notification.read ? <span className="size-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" /> : null}
        </span>
        <span className="mt-0.5 block text-sm text-ink-600">{notification.message}</span>
        <span className="mt-1 block text-xs text-ink-400">{formatRelative(notification.created_at)}</span>
      </span>
    </>
  );

  return (
    <li className={cn("flex gap-3 p-4 transition-colors", !notification.read && "bg-brand-50/40")}>
      {href ? (
        <Link href={href} className="flex min-w-0 flex-1 gap-3" onClick={() => !notification.read && onMarkRead(notification.id)}>
          {body}
        </Link>
      ) : (
        <span className="flex min-w-0 flex-1 gap-3">{body}</span>
      )}
      {!notification.read ? (
        <Button variant="ghost" size="sm" className="self-start" disabled={pending} onClick={() => onMarkRead(notification.id)}>
          Mark read
        </Button>
      ) : null}
    </li>
  );
}

const queueTypes = new Set<NotificationType>(["queue_joined", "ahead_two", "ahead_one", "turn_approaching", "your_turn"]);
