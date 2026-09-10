"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Users } from "lucide-react";
import { BarberCard } from "@/components/customer/barber-card";
import { ServiceCard } from "@/components/customer/service-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useAction } from "@/hooks/use-action";
import { joinQueueAction } from "@/lib/queue/actions";
import { cn, formatINR, formatMinutes, pluralize } from "@/lib/utils";
import type { Barber, QueueEntry, QueueSnapshot, Service, ShopLiveStatus } from "@/types/domain";
import type { JoinQueueInput } from "@/lib/validation/queue";

interface Props {
  shop: { id: string; name: string };
  barbers: Barber[];
  services: Service[];
  queues: QueueSnapshot[];
  live: ShopLiveStatus;
}

const ANY = "any";

export function JoinQueueForm({ shop, barbers, services, queues, live }: Props) {
  const router = useRouter();
  const hasBarbers = barbers.length > 0;
  const [barberId, setBarberId] = React.useState<string | null>(hasBarbers ? null : ANY);
  const [serviceId, setServiceId] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<1 | 2 | 3>(hasBarbers ? 1 : 2);

  const { run, pending, error } = useAction<JoinQueueInput, { entry: QueueEntry }>(joinQueueAction, {
    toastError: false,
    onSuccess: () => {
      router.replace("/my-queue?joined=1");
      router.refresh();
    },
  });

  const service = services.find((s) => s.id === serviceId) ?? null;
  const barber = barbers.find((b) => b.id === barberId) ?? null;
  // Queue stats for the chosen barber (or the shop-wide "any barber" queue).
  const snapshot = queues.find((q) => (barberId === ANY ? q.barber_id === null : q.barber_id === barberId)) ?? null;
  const waiting = snapshot?.waiting_count ?? (barberId === ANY ? live.waiting_count : 0);
  const wait = snapshot?.estimated_wait_minutes ?? (barberId === ANY ? live.estimated_wait_minutes : 0);

  const steps = [hasBarbers ? "Barber" : null, "Service", "Confirm"].filter((s): s is string => s != null);
  const stepIndex = hasBarbers ? step - 1 : step - 2;

  return (
    <div className="mt-6 space-y-6">
      <ol className="flex items-center gap-2 text-sm" aria-label="Progress">
        {steps.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                i < stepIndex ? "bg-brand-600 text-white" : i === stepIndex ? "bg-ink-950 text-white" : "bg-ink-200 text-ink-600",
              )}
              aria-current={i === stepIndex ? "step" : undefined}
            >
              {i < stepIndex ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn("font-medium", i === stepIndex ? "text-ink-950" : "text-ink-500")}>{label}</span>
            {i < steps.length - 1 ? <span className="mx-1 h-px w-6 bg-ink-200" aria-hidden /> : null}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <section aria-labelledby="pick-barber">
          <h2 id="pick-barber" className="text-lg font-semibold text-ink-950">
            Choose a barber
          </h2>
          <p className="text-sm text-ink-500">Pick a favourite, or take the first available chair.</p>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => setBarberId(ANY)}
              aria-pressed={barberId === ANY}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border bg-surface p-3 text-left transition-colors hover:border-brand-300",
                barberId === ANY ? "border-brand-500 ring-2 ring-brand-200" : "border-border",
              )}
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Users className="size-6" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-ink-950">Any available barber</span>
                <span className="block text-xs text-ink-500">Shortest overall wait</span>
              </span>
              <QueueChip snapshot={queues.find((q) => q.barber_id === null) ?? null} fallback={live} />
            </button>
            {barbers.map((b) => (
              <div key={b.id} className="relative">
                <BarberCard barber={b} selected={barberId === b.id} onSelect={() => setBarberId(b.id)} />
                <div className="pointer-events-none absolute top-3 right-24">
                  <QueueChip snapshot={queues.find((q) => q.barber_id === b.id) ?? null} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button size="lg" disabled={!barberId} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section aria-labelledby="pick-service">
          <h2 id="pick-service" className="text-lg font-semibold text-ink-950">
            Choose a service
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} selected={serviceId === s.id} onSelect={() => setServiceId(s.id)} />
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            {hasBarbers ? (
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button size="lg" disabled={!serviceId} onClick={() => setStep(3)}>
              Review &amp; join
            </Button>
          </div>
        </section>
      ) : null}

      {step === 3 && service ? (
        <section aria-labelledby="confirm">
          <h2 id="confirm" className="text-lg font-semibold text-ink-950">
            Confirm your spot
          </h2>
          <Card className="mt-4">
            <CardContent className="space-y-4 p-5">
              <Row label="Shop" value={shop.name} />
              {hasBarbers ? <Row label="Barber" value={barber?.name ?? "Any available barber"} /> : null}
              <Row label="Service" value={service.name} />
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
                <Stat label="Price" value={formatINR(Number(service.price))} />
                <Stat label="Duration" value={formatMinutes(service.duration_minutes)} />
                <Stat label="In queue now" value={pluralize(waiting, "person", "people")} />
                <Stat label="Estimated wait" value={waiting === 0 ? "No wait" : `~${formatMinutes(wait)}`} hint="Estimate, not a guarantee" />
              </div>
            </CardContent>
          </Card>
          {error ? (
            <Alert tone="danger" className="mt-4">
              {error}
            </Alert>
          ) : null}
          <p className="mt-4 flex items-start gap-2 text-sm text-ink-600">
            <Clock className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
            You&apos;ll get a token right away. We&apos;ll notify you as your turn approaches — please be at the shop when you&apos;re next.
          </p>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)} disabled={pending}>
              Back
            </Button>
            <Button size="lg" loading={pending} onClick={() => run({ shop_id: shop.id, service_id: service.id, barber_id: barberId === ANY ? null : barberId })}>
              Join Queue
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold text-ink-950">{value}</span>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md bg-surface-muted p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="text-lg font-bold text-ink-950 tabular">{value}</p>
      {hint ? <p className="text-[11px] text-ink-400">{hint}</p> : null}
    </div>
  );
}

function QueueChip({ snapshot, fallback }: { snapshot: QueueSnapshot | null; fallback?: ShopLiveStatus }) {
  const waiting = snapshot?.waiting_count ?? fallback?.waiting_count ?? 0;
  const wait = snapshot?.estimated_wait_minutes ?? fallback?.estimated_wait_minutes ?? 0;
  return (
    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700 tabular">
      {waiting === 0 ? "No wait" : `${waiting} waiting · ~${formatMinutes(wait)}`}
    </span>
  );
}
