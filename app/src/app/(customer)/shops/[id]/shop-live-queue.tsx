"use client";

import Link from "next/link";
import { QueueIndicator, queueState } from "@/components/customer/queue-indicator";
import { LiveDot } from "@/components/queue/live-dot";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useShopLiveStatus, useQueueSnapshot } from "@/hooks/use-realtime-queue";
import { cn } from "@/lib/utils";
import type { QueueSnapshot, ShopLiveStatus } from "@/types/domain";

interface Props {
  shopId: string;
  initialLive: ShopLiveStatus;
  initialSnapshot: QueueSnapshot | null;
  queueIds: string[];
}

/** Live queue panel on the shop page: status, waiting count, wait estimate, now serving. */
export function ShopLiveQueue({ shopId, initialLive, initialSnapshot }: Props) {
  const liveStatus = useShopLiveStatus(shopId, initialLive);
  const snapshot = useQueueSnapshot(initialSnapshot?.queue_id ?? null, initialSnapshot);
  const live = liveStatus.data ?? initialLive;
  const state = queueState(live.is_open, live.queue_paused);
  const serving = snapshot.data?.serving_token ?? snapshot.data?.current_token ?? null;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wider text-ink-500 uppercase">Queue status</h2>
          <LiveDot status={liveStatus.live} />
        </div>
        <QueueIndicator size="lg" isOpen={live.is_open} queuePaused={live.queue_paused} waitingCount={live.waiting_count} estimatedWaitMinutes={live.estimated_wait_minutes} />
        {state !== "closed" && snapshot.data ? (
          <dl className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-md bg-surface-muted p-3">
              <dt className="text-xs font-medium text-ink-500">Now serving</dt>
              <dd className="text-xl font-bold text-ink-950 tabular">{serving != null ? `${snapshot.data.token_prefix}-${serving}` : "—"}</dd>
            </div>
            <div className="rounded-md bg-surface-muted p-3">
              <dt className="text-xs font-medium text-ink-500">Last token</dt>
              <dd className="text-xl font-bold text-ink-950 tabular">
                {snapshot.data.last_token_number > 0 ? `${snapshot.data.token_prefix}-${snapshot.data.last_token_number}` : "—"}
              </dd>
            </div>
          </dl>
        ) : null}
        <Link
          href={state === "open" ? `/shops/${shopId}/join` : "#"}
          aria-disabled={state !== "open"}
          className={cn(buttonVariants({ size: "lg", fullWidth: true }), state !== "open" && "pointer-events-none opacity-50")}
        >
          {state === "open" ? "Join Queue" : state === "paused" ? "Queue paused" : "Closed"}
        </Link>
        <p className="text-center text-xs text-ink-500">Wait times are estimates based on services ahead of you.</p>
      </CardContent>
    </Card>
  );
}
