import { cn } from "@/lib/utils";
import type { LiveStatus } from "@/hooks/use-realtime-queue";

/** Subtle realtime indicator: ● Live / Connecting / Offline (polling). */
export function LiveDot({ status, className }: { status: LiveStatus; className?: string }) {
  const label = status === "live" ? "Live" : status === "connecting" ? "Connecting" : "Reconnecting";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold",
        status === "live" ? "text-success-600" : status === "connecting" ? "text-ink-500" : "text-warning-700",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "live" ? "bg-success-500 animate-pulse-dot" : status === "connecting" ? "bg-ink-400" : "bg-warning-500",
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}
