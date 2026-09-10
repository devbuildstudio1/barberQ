import { Clock } from "lucide-react";
import { cn, formatINR, formatMinutes } from "@/lib/utils";
import type { Service } from "@/types/domain";

interface ServiceCardProps {
  service: Service;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function ServiceCard({ service, selected, onSelect, className }: ServiceCardProps) {
  const selectable = !!onSelect;
  const disabled = service.status !== "active";
  const Comp = selectable ? "button" : "div";
  return (
    <Comp
      type={selectable ? "button" : undefined}
      onClick={selectable && !disabled ? onSelect : undefined}
      disabled={selectable ? disabled : undefined}
      aria-pressed={selectable ? selected : undefined}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg border bg-surface p-3.5 text-left transition-colors",
        selectable && !disabled && "hover:border-brand-300 hover:bg-brand-50/40",
        selected ? "border-brand-500 ring-2 ring-brand-200" : "border-border",
        disabled && "opacity-60",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold text-ink-950">{service.name}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
          <Clock className="size-3.5" aria-hidden /> {formatMinutes(service.duration_minutes)}
          {disabled ? " · Unavailable" : ""}
        </p>
      </div>
      <p className="shrink-0 text-base font-bold text-ink-950 tabular">{formatINR(Number(service.price))}</p>
    </Comp>
  );
}
