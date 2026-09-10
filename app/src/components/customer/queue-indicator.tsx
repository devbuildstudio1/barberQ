import { PauseCircle, Users, Clock, DoorClosed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatMinutes, pluralize } from "@/lib/utils";

interface QueueIndicatorProps {
  isOpen: boolean;
  queuePaused: boolean;
  waitingCount: number;
  estimatedWaitMinutes: number;
  size?: "sm" | "lg";
  className?: string;
}

export function queueState(isOpen: boolean, queuePaused: boolean): "open" | "paused" | "closed" {
  if (!isOpen) return "closed";
  if (queuePaused) return "paused";
  return "open";
}

/** Compact or large summary of the shop's queue: OPEN · 12 waiting · ~35 min, PAUSED, CLOSED. */
export function QueueIndicator({ isOpen, queuePaused, waitingCount, estimatedWaitMinutes, size = "sm", className }: QueueIndicatorProps) {
  const state = queueState(isOpen, queuePaused);

  if (size === "sm") {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-sm", className)}>
        {state === "open" ? (
          <>
            <Badge variant="success" dot pulse>
              Open
            </Badge>
            <span className="inline-flex items-center gap-1 text-ink-700">
              <Users className="size-4 text-ink-400" aria-hidden />
              <span className="tabular">{pluralize(waitingCount, "person", "people")}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-ink-700">
              <Clock className="size-4 text-ink-400" aria-hidden />
              <span className="tabular">{waitingCount === 0 ? "No wait" : `~${formatMinutes(estimatedWaitMinutes)}`}</span>
            </span>
          </>
        ) : state === "paused" ? (
          <Badge variant="warning" dot>
            Queue paused
          </Badge>
        ) : (
          <Badge variant="neutral" dot>
            Closed
          </Badge>
        )}
      </div>
    );
  }

  const styles = {
    open: "border-green-200 bg-success-50",
    paused: "border-amber-200 bg-warning-50",
    closed: "border-border bg-ink-100",
  }[state];

  return (
    <div className={cn("rounded-lg border p-4", styles, className)} role="status" aria-live="polite">
      {state === "open" ? (
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-success-700 uppercase">
              <span className="size-2 rounded-full bg-success-500 animate-pulse-dot" aria-hidden /> Open · Queue active
            </p>
            <p className="mt-1 text-2xl font-bold text-ink-950 tabular">
              {pluralize(waitingCount, "person", "people")} <span className="text-base font-medium text-ink-600">waiting</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-ink-500">Estimated wait</p>
            <p className="text-2xl font-bold text-ink-950 tabular">{waitingCount === 0 ? "None" : `~${formatMinutes(estimatedWaitMinutes)}`}</p>
          </div>
        </div>
      ) : state === "paused" ? (
        <div className="flex items-center gap-3">
          <PauseCircle className="size-8 text-warning-700" aria-hidden />
          <div>
            <p className="text-xs font-bold tracking-wider text-warning-700 uppercase">Queue paused</p>
            <p className="text-sm text-ink-700">The shop isn&apos;t taking new customers right now. Check back shortly.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <DoorClosed className="size-8 text-ink-500" aria-hidden />
          <div>
            <p className="text-xs font-bold tracking-wider text-ink-600 uppercase">Closed</p>
            <p className="text-sm text-ink-700">This shop is currently closed.</p>
          </div>
        </div>
      )}
    </div>
  );
}
