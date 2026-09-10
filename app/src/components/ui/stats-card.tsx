import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

interface StatsCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  tone?: "default" | "brand" | "success" | "warning" | "danger";
  className?: string;
}

const tones = {
  default: "bg-ink-100 text-ink-700",
  brand: "bg-brand-50 text-brand-700",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  danger: "bg-danger-50 text-danger-700",
};

export function StatsCard({ label, value, icon, hint, tone = "default", className }: StatsCardProps) {
  return (
    <Card className={cn("flex items-start gap-4 p-5", className)}>
      {icon ? (
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-5", tones[tone])} aria-hidden>
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink-950 tabular">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-ink-500">{hint}</p> : null}
      </div>
    </Card>
  );
}
