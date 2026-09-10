import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Barber } from "@/types/domain";

const availabilityLabel: Record<Barber["availability"], { label: string; variant: "success" | "warning" | "neutral" }> = {
  available: { label: "Available", variant: "success" },
  on_break: { label: "On break", variant: "warning" },
  off_duty: { label: "Off duty", variant: "neutral" },
};

interface BarberCardProps {
  barber: Barber;
  selected?: boolean;
  onSelect?: () => void;
  compact?: boolean;
  className?: string;
}

export function BarberCard({ barber, selected, onSelect, compact, className }: BarberCardProps) {
  const avail = availabilityLabel[barber.availability];
  const selectable = !!onSelect;
  const disabled = barber.availability !== "available" || barber.status !== "active";
  const Comp = selectable ? "button" : "div";

  return (
    <Comp
      type={selectable ? "button" : undefined}
      onClick={selectable && !disabled ? onSelect : undefined}
      disabled={selectable ? disabled : undefined}
      aria-pressed={selectable ? selected : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border bg-surface p-3 text-left transition-colors",
        selectable && !disabled && "hover:border-brand-300 hover:bg-brand-50/40",
        selected ? "border-brand-500 ring-2 ring-brand-200" : "border-border",
        disabled && selectable && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <Avatar src={barber.image} name={barber.name} size={compact ? "md" : "lg"} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink-950">{barber.name}</p>
        <p className="truncate text-xs text-ink-500">
          {barber.experience_years > 0 ? `${barber.experience_years} yrs exp` : "New"}
          {barber.specialization ? ` · ${barber.specialization}` : ""}
        </p>
      </div>
      <Badge variant={avail.variant} size="sm" dot>
        {avail.label}
      </Badge>
    </Comp>
  );
}
