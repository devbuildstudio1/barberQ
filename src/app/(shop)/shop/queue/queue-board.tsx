"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, Clock, Pause, Phone, Play, SkipForward, UserX, Users, XCircle } from "lucide-react";
import { LiveDot } from "@/components/queue/live-dot";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/tabs";
import { useAction } from "@/hooks/use-action";
import { shopBoardKey, useShopQueueBoard } from "@/hooks/use-realtime-queue";
import {
  callNextAction,
  cancelQueueEntryAction,
  completeServiceAction,
  markNoShowAction,
  setQueuePausedAction,
  startServiceAction,
} from "@/lib/queue/actions";
import { cn, formatINR, formatMinutes, formatRelative, pluralize } from "@/lib/utils";
import type { QueueBoard, QueueBoardEntry } from "@/types/domain";

interface Props {
  shop: { id: string; name: string; is_open: boolean; queue_paused: boolean };
  initialBoard: QueueBoard;
}

export function QueueBoardView({ shop, initialBoard }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, live, isError, refetch } = useShopQueueBoard(shop.id, initialBoard);
  const board = data ?? initialBoard;

  const [activeQueueId, setActiveQueueId] = React.useState<string>(board.queues.find((q) => q.barber_id === null)?.id ?? board.queues[0]?.id ?? "");
  const [confirm, setConfirm] = React.useState<{ kind: "no_show" | "cancel"; entry: QueueBoardEntry } | null>(null);

  const refresh = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: shopBoardKey(shop.id) });
    router.refresh();
  }, [queryClient, router, shop.id]);

  const callNext = useAction(callNextAction, { onSuccess: refresh });
  const start = useAction(startServiceAction, { onSuccess: refresh });
  const complete = useAction(completeServiceAction, { successMessage: "Service completed", onSuccess: refresh });
  const noShow = useAction(markNoShowAction, {
    successMessage: "Marked as no-show",
    onSuccess: () => {
      setConfirm(null);
      refresh();
    },
  });
  const cancel = useAction(cancelQueueEntryAction, {
    successMessage: "Entry cancelled",
    onSuccess: () => {
      setConfirm(null);
      refresh();
    },
  });
  const pause = useAction(setQueuePausedAction, { onSuccess: refresh });

  const busy = callNext.pending || start.pending || complete.pending || noShow.pending || cancel.pending;

  const queue = board.queues.find((q) => q.id === activeQueueId) ?? board.queues[0] ?? null;
  const entries = board.entries.filter((e) => e.queue_id === queue?.id);
  const current = entries.find((e) => e.status === "serving" || e.status === "called") ?? null;
  const waiting = entries.filter((e) => e.status === "waiting").sort((a, b) => a.token_number - b.token_number);
  const done = entries.filter((e) => ["completed", "cancelled", "no_show"].includes(e.status));

  if (board.queues.length === 0 || !queue) {
    return <EmptyState icon={<Users />} title="No queue for today yet" description="Open your shop to start today's queue." />;
  }

  return (
    <div className="space-y-5">
      {isError ? (
        <Alert tone="warning" title="Unable to refresh the queue. Retrying…">
          <button type="button" onClick={() => refetch()} className="font-medium underline">
            Retry now
          </button>
        </Alert>
      ) : null}

      {!shop.is_open ? (
        <Alert tone="warning" title="Your shop is closed">
          New customers can&apos;t join. People already holding tokens are still listed below.
        </Alert>
      ) : shop.queue_paused ? (
        <Alert tone="warning" title="Queue is paused">
          New customers can&apos;t join right now. You can still serve everyone already in line.
        </Alert>
      ) : null}

      {/* Header stats */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-ink-950">Today&apos;s queue</h2>
          <LiveDot status={live} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={shop.queue_paused ? "warning" : shop.is_open ? "success" : "neutral"} dot pulse={shop.is_open && !shop.queue_paused}>
            {!shop.is_open ? "Closed" : shop.queue_paused ? "Paused" : "Active"}
          </Badge>
          <Button
            size="sm"
            variant={shop.queue_paused ? "primary" : "outline"}
            disabled={!shop.is_open}
            loading={pause.pending}
            onClick={() => pause.run({ shop_id: shop.id, paused: !shop.queue_paused })}
          >
            {shop.queue_paused ? <Play /> : <Pause />}
            {shop.queue_paused ? "Resume Queue" : "Pause Queue"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MiniStat label="Waiting" value={String(queue.waiting_count)} />
        <MiniStat label="Queue time" value={queue.waiting_count === 0 ? "None" : `~${formatMinutes(queue.estimated_wait_minutes)}`} />
        <MiniStat label="Current token" value={queue.current_token != null ? `${queue.token_prefix}-${queue.current_token}` : "—"} />
        <MiniStat label="Completed today" value={String(board.completed_today)} />
      </div>

      {board.queues.length > 1 ? (
        <Segmented
          aria-label="Queue"
          value={activeQueueId}
          onChange={setActiveQueueId}
          options={board.queues.map((q) => ({
            value: q.id,
            label: (
              <span className="flex items-center justify-center gap-1.5">
                {q.barber_name ?? "Any barber"}
                <span className="rounded-full bg-ink-200 px-1.5 text-[11px] tabular">{q.waiting_count}</span>
              </span>
            ),
          }))}
          className="w-full overflow-x-auto scrollbar-none"
        />
      ) : null}

      {/* Now serving */}
      <Card className={cn("overflow-hidden", current?.status === "called" && "ring-2 ring-warning-500")}>
        <div className="border-b border-border bg-surface-muted px-5 py-3">
          <p className="text-xs font-bold tracking-wider text-ink-500 uppercase">Now serving</p>
        </div>
        <CardContent className="p-5">
          {current ? (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="sm:w-48">
                <p className="text-6xl font-black tracking-tight text-ink-950 tabular">
                  {current.token_prefix}-{current.token_number}
                </p>
                <Badge variant={current.status === "called" ? "warning" : "success"} dot className="mt-2">
                  {current.status === "called" ? "Called — waiting" : "In service"}
                </Badge>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xl font-semibold text-ink-950">{current.customer_name}</p>
                <p className="text-ink-600">
                  {current.service_name} · {formatINR(Number(current.service_price))} · {formatMinutes(current.estimated_duration_minutes)}
                </p>
                {current.customer_phone ? (
                  <a href={`tel:${current.customer_phone}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
                    <Phone className="size-3.5" aria-hidden /> {current.customer_phone}
                  </a>
                ) : null}
                <p className="text-xs text-ink-500">
                  {current.status === "called" ? `Called ${current.called_at ? formatRelative(current.called_at) : ""}` : `Started ${current.started_at ? formatRelative(current.started_at) : ""}`}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:w-52">
                {current.status === "called" ? (
                  <Button size="lg" fullWidth loading={start.pending} disabled={busy && !start.pending} onClick={() => start.run({ entry_id: current.id })}>
                    <Play /> Start Service
                  </Button>
                ) : (
                  <Button size="lg" variant="success" fullWidth loading={complete.pending} disabled={busy && !complete.pending} onClick={() => complete.run({ entry_id: current.id })}>
                    <CheckCircle2 /> Complete
                  </Button>
                )}
                {current.status === "called" ? (
                  <Button variant="outline" fullWidth disabled={busy} onClick={() => setConfirm({ kind: "no_show", entry: current })}>
                    <UserX /> No Show
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-ink-700">Nobody in the chair</p>
                <p className="text-sm text-ink-500">
                  {waiting.length > 0 ? `${pluralize(waiting.length, "customer")} waiting. Call the next token.` : "Your queue is empty."}
                </p>
              </div>
              <Button
                size="xl"
                disabled={waiting.length === 0 || busy}
                loading={callNext.pending}
                onClick={() => callNext.run({ queue_id: queue.id })}
                className="w-full sm:w-auto"
              >
                <SkipForward /> CALL NEXT
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waiting list */}
      <section aria-labelledby="waiting-h">
        <div className="mb-2 flex items-center justify-between">
          <h3 id="waiting-h" className="text-sm font-bold tracking-wider text-ink-500 uppercase">
            Next customers ({waiting.length})
          </h3>
        </div>
        {waiting.length === 0 ? (
          <EmptyState title="Your queue is empty." description="New customers who join will appear here instantly." />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {waiting.map((e, i) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                <span className="w-16 shrink-0 text-center text-lg font-bold text-ink-950 tabular">
                  {e.token_prefix}-{e.token_number}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-950">{e.customer_name}</p>
                  <p className="truncate text-sm text-ink-500">
                    {e.service_name} · {formatMinutes(e.estimated_duration_minutes)} · joined {formatRelative(e.joined_at)}
                  </p>
                </div>
                {i === 0 && !current ? (
                  <Badge variant="brand" size="sm">
                    Next
                  </Badge>
                ) : null}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    aria-label={`Mark token ${e.token_prefix}-${e.token_number} as no show`}
                    onClick={() => setConfirm({ kind: "no_show", entry: e })}
                  >
                    <UserX /> <span className="hidden sm:inline">No show</span>
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Cancel token ${e.token_prefix}-${e.token_number}`} disabled={busy} onClick={() => setConfirm({ kind: "cancel", entry: e })}>
                    <XCircle className="text-danger-600" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {waiting.length > 0 && current ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
            <Clock className="size-3.5" aria-hidden /> Finish the current customer to call {waiting[0].token_prefix}-{waiting[0].token_number}.
          </p>
        ) : null}
      </section>

      {/* Completed today */}
      {done.length > 0 ? (
        <details className="rounded-lg border border-border bg-surface">
          <summary className="flex cursor-pointer items-center gap-2 p-4 text-sm font-semibold text-ink-700">
            <ChevronRight className="size-4 transition-transform [details[open]_&]:rotate-90" aria-hidden />
            Finished today ({done.length})
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {done
              .slice()
              .sort((a, b) => b.token_number - a.token_number)
              .map((e) => (
                <li key={e.id} className="flex items-center gap-3 p-3 text-sm">
                  <span className="w-16 shrink-0 text-center font-bold text-ink-500 tabular">
                    {e.token_prefix}-{e.token_number}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-ink-700">
                    {e.customer_name} · {e.service_name}
                  </span>
                  <Badge variant={e.status === "completed" ? "success" : e.status === "no_show" ? "danger" : "neutral"} size="sm">
                    {e.status.replace("_", " ")}
                  </Badge>
                </li>
              ))}
          </ul>
        </details>
      ) : null}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        loading={noShow.pending || cancel.pending}
        destructive
        title={confirm?.kind === "no_show" ? "Mark as no-show?" : "Cancel this token?"}
        description={
          confirm
            ? `Token ${confirm.entry.token_prefix}-${confirm.entry.token_number} (${confirm.entry.customer_name}) will be removed from the queue and the customer notified.`
            : undefined
        }
        confirmLabel={confirm?.kind === "no_show" ? "Mark no-show" : "Cancel token"}
        onConfirm={async () => {
          if (!confirm) return;
          if (confirm.kind === "no_show") await noShow.run({ entry_id: confirm.entry.id });
          else await cancel.run({ entry_id: confirm.entry.id });
        }}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold text-ink-950 tabular">{value}</p>
    </div>
  );
}
