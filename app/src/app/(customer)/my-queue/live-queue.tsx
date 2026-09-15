"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Navigation, Phone, Scissors, Ticket } from "lucide-react";
import { LiveDot } from "@/components/queue/live-dot";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { useAction } from "@/hooks/use-action";
import { myQueueKey, useMyQueueEntry } from "@/hooks/use-realtime-queue";
import { cancelQueueEntryAction } from "@/lib/queue/actions";
import { cn, formatMinutes, formatToken, pluralize } from "@/lib/utils";
import { directionsUrl } from "@/lib/utils/geo";
import type { MyQueueEntry, QueueEntry } from "@/types/domain";

interface Props {
  initial: MyQueueEntry | null;
  userId: string;
}

export function LiveQueue({ initial, userId }: Props) {
  const { data, live, isError, refetch } = useMyQueueEntry(initial, userId);
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // One-time "joined" toast after redirect from the join flow.
  const joinedRef = React.useRef(false);
  React.useEffect(() => {
    if (searchParams.get("joined") && !joinedRef.current) {
      joinedRef.current = true;
      toast.success("You're in the queue", "We'll notify you as your turn approaches.");
      router.replace("/my-queue");
    }
  }, [searchParams, router, toast]);

  // Announce status changes to screen readers and via toast.
  const prevStatus = React.useRef<QueueEntry["status"] | null>(data?.entry.status ?? null);
  React.useEffect(() => {
    const status = data?.entry.status ?? null;
    if (prevStatus.current && status && status !== prevStatus.current) {
      if (status === "called") toast.info("It's your turn!", "Please head to the chair now.");
      if (status === "serving") toast.info("Service started", "Enjoy your cut.");
    }
    prevStatus.current = status;
  }, [data?.entry.status, toast]);

  const cancel = useAction(cancelQueueEntryAction, {
    successMessage: "You left the queue",
    onSuccess: () => {
      setConfirmOpen(false);
      void queryClient.invalidateQueries({ queryKey: myQueueKey });
      router.refresh();
    },
  });

  if (!data) {
    return (
      <EmptyState
        icon={<Ticket />}
        title="Your queue is empty."
        description="Join a barber's queue and your live token will appear here."
        action={
          <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
            Find a Barber
          </Link>
        }
      />
    );
  }

  const { entry, queue, shop, service, barber, people_ahead, estimated_wait_minutes } = data;
  const token = formatToken(queue.token_prefix, entry.token_number);
  const serving = queue.current_token != null ? formatToken(queue.token_prefix, queue.current_token) : "—";
  const total = Math.max(1, entry.token_number - (queue.current_token ?? 0));
  const progress = entry.status === "waiting" ? Math.round(((total - people_ahead) / (total + 1)) * 100) : 100;

  const statusCopy: Record<QueueEntry["status"], { title: string; text: string; tone: "info" | "success" | "warning" }> = {
    waiting: { title: "You're in line", text: people_ahead === 0 ? "You're next. Please be at the shop." : `${pluralize(people_ahead, "person", "people")} ahead of you.`, tone: "info" },
    called: { title: "It's your turn!", text: "Please go to the chair now. The barber is waiting for you.", tone: "success" },
    serving: { title: "In the chair", text: "Your service is in progress.", tone: "success" },
    completed: { title: "Done", text: "Thanks for visiting.", tone: "success" },
    cancelled: { title: "Cancelled", text: "This entry was cancelled.", tone: "warning" },
    no_show: { title: "Marked no-show", text: "You can join again.", tone: "warning" },
  };
  const copy = statusCopy[entry.status];
  const paused = shop.queue_paused;

  return (
    <div className="space-y-4">
      {isError ? (
        <Alert tone="warning" title="Unable to load queue. Retrying…">
          <button type="button" onClick={() => refetch()} className="font-medium underline">
            Retry now
          </button>
        </Alert>
      ) : null}

      <Card className={cn("overflow-hidden", entry.status === "called" && "ring-2 ring-success-500")}>
        <div className="bg-ink-950 p-5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-wider text-white/60 uppercase">Your queue</p>
            <LiveDot status={live} className="[&>span]:bg-current text-brand-200" />
          </div>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-white/60">Token</p>
              <p className="text-6xl font-black tracking-tight tabular" aria-live="polite">
                {token}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/60">Currently serving</p>
              <p className="text-3xl font-bold tabular" aria-live="polite">
                {serving}
              </p>
            </div>
          </div>
        </div>

        <CardContent className="space-y-5 p-5">
          {entry.status === "waiting" ? (
            <>
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-surface-muted p-3">
                  <dt className="text-xs font-medium text-ink-500">People ahead</dt>
                  <dd className="text-3xl font-bold text-ink-950 tabular" aria-live="polite">
                    {people_ahead}
                  </dd>
                </div>
                <div className="rounded-md bg-surface-muted p-3">
                  <dt className="text-xs font-medium text-ink-500">Estimated wait</dt>
                  <dd className="text-3xl font-bold text-ink-950 tabular" aria-live="polite">
                    {people_ahead === 0 && estimated_wait_minutes === 0 ? "Now" : `~${formatMinutes(estimated_wait_minutes)}`}
                  </dd>
                </div>
              </dl>
              <div>
                <div className="h-2.5 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Queue progress">
                  <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1 text-right text-xs text-ink-500 tabular">{progress}%</p>
              </div>
            </>
          ) : null}

          <div
            className={cn(
              "rounded-md border p-3",
              copy.tone === "success" && "border-green-200 bg-success-50",
              copy.tone === "info" && "border-blue-200 bg-info-50",
              copy.tone === "warning" && "border-amber-200 bg-warning-50",
            )}
            role="status"
            aria-live="assertive"
          >
            <p className="text-xs font-bold tracking-wider text-ink-600 uppercase">Queue status</p>
            <p className="text-lg font-semibold text-ink-950">{copy.title}</p>
            <p className="text-sm text-ink-700">{copy.text}</p>
            {paused && entry.status === "waiting" ? <p className="mt-1 text-sm font-medium text-warning-700">Queue temporarily paused — your spot is safe.</p> : null}
          </div>

          <dl className="divide-y divide-border text-sm">
            <div className="flex items-center justify-between py-2">
              <dt className="flex items-center gap-2 text-ink-500">
                <Scissors className="size-4" aria-hidden /> Service
              </dt>
              <dd className="font-semibold text-ink-950">
                {service?.name ?? "—"}
                {barber ? ` · ${barber.name}` : ""}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="flex items-center gap-2 text-ink-500">
                <MapPin className="size-4" aria-hidden /> Shop
              </dt>
              <dd className="text-right font-semibold text-ink-950">
                <Link href={`/shops/${shop.id}`} className="hover:underline">
                  {shop.name}
                </Link>
                <span className="block text-xs font-normal text-ink-500">{shop.address}</span>
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-2 sm:flex-row">
            <a href={directionsUrl(shop.latitude, shop.longitude, shop.name)} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", fullWidth: true })}>
              <Navigation /> Directions
            </a>
            {shop.phone ? (
              <a href={`tel:${shop.phone}`} className={buttonVariants({ variant: "outline", fullWidth: true })}>
                <Phone /> Call shop
              </a>
            ) : null}
          </div>

          {entry.status === "waiting" ? (
            <Button variant="danger-soft" fullWidth onClick={() => setConfirmOpen(true)}>
              Leave Queue
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await cancel.run({ entry_id: entry.id });
        }}
        loading={cancel.pending}
        destructive
        title="Leave the queue?"
        description={`You'll lose token ${token}. You can join again later, but you'll get a new token at the end of the line.`}
        confirmLabel="Leave queue"
      />
    </div>
  );
}
