"use client";

import Link from "next/link";
import { ArrowRight, Scissors, Ticket } from "lucide-react";
import { LiveDot } from "@/components/queue/live-dot";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMyQueueEntry } from "@/hooks/use-realtime-queue";
import { cn, formatMinutes, formatToken, pluralize } from "@/lib/utils";
import type { MyQueueEntry } from "@/types/domain";

interface Props {
  initial: MyQueueEntry | null;
  userId: string;
  className?: string;
}

/** Compact live summary of the customer's current token; full controls live on /my-queue. */
export function ActiveTicket({ initial, userId, className }: Props) {
  const { data, live } = useMyQueueEntry(initial, userId);

  if (!data) {
    return (
      <Card className={cn("flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center", className)}>
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700" aria-hidden>
            <Ticket className="size-6" />
          </div>
          <div>
            <p className="text-lg font-semibold text-ink-950">No active ticket</p>
            <p className="mt-0.5 text-sm text-ink-500">Join a shop&apos;s queue and your live token will show up here.</p>
          </div>
        </div>
        <Link href="#find" className={buttonVariants()}>
          Find a barber <ArrowRight />
        </Link>
      </Card>
    );
  }

  const { entry, queue, shop, service, barber, people_ahead, estimated_wait_minutes } = data;
  const token = formatToken(queue.token_prefix, entry.token_number);
  const headline =
    entry.status === "called" ? "It's your turn — head to the chair" : entry.status === "serving" ? "You're in the chair" : null;

  return (
    <section
      aria-label="Your active ticket"
      className={cn("relative overflow-hidden rounded-lg bg-brand-950 p-6 text-white shadow-card", className)}
    >
      <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-brand-500 opacity-25 blur-3xl" aria-hidden />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-wider text-brand-200 uppercase">Your token</p>
          <p className="mt-1 text-5xl font-extrabold tracking-tight tabular">{token}</p>
          <p className="mt-2 font-semibold">{shop.name}</p>
          <p className="flex items-center gap-1.5 text-sm text-white/70">
            <Scissors className="size-3.5" aria-hidden />
            {service?.name ?? "Service"}
            {barber ? ` with ${barber.name}` : ""}
          </p>
        </div>
        <LiveDot status={live} className="rounded-full bg-white/10 px-2.5 py-1 text-white" />
      </div>

      {headline ? (
        <p className="relative mt-5 rounded-md bg-accent-400 px-4 py-3 font-semibold text-ink-950" role="status">
          {headline}
        </p>
      ) : (
        <dl className="relative mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-white/10 px-2 py-3">
            <dt className="text-xs text-white/60">People ahead</dt>
            <dd className="text-xl font-bold tabular">{people_ahead}</dd>
          </div>
          <div className="rounded-md bg-white/10 px-2 py-3">
            <dt className="text-xs text-white/60">Est. wait</dt>
            <dd className="text-xl font-bold tabular">{people_ahead === 0 ? "Next" : `~${formatMinutes(estimated_wait_minutes)}`}</dd>
          </div>
          <div className="rounded-md bg-white/10 px-2 py-3">
            <dt className="text-xs text-white/60">Now serving</dt>
            <dd className="text-xl font-bold tabular">{queue.current_token != null ? formatToken(queue.token_prefix, queue.current_token) : "—"}</dd>
          </div>
        </dl>
      )}

      <div className="relative mt-5 flex flex-wrap items-center gap-3">
        <Link href="/my-queue" className={cn(buttonVariants(), "bg-white text-brand-950 hover:bg-brand-50")}>
          View live queue <ArrowRight />
        </Link>
        <Link href={`/shops/${shop.id}`} className="text-sm font-medium text-white/80 hover:text-white hover:underline">
          Shop details
        </Link>
        <span className="ml-auto text-xs text-white/60">{pluralize(queue.waiting_count, "person", "people")} in this queue</span>
      </div>
    </section>
  );
}
