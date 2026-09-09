import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: "default" | "error";
}

export function EmptyState({ icon, title, description, action, className, variant = "default" }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface px-6 py-12 text-center",
        variant === "error" && "border-red-200 bg-danger-50/40",
        className,
      )}
      role={variant === "error" ? "alert" : undefined}
    >
      {icon ? (
        <div
          className={cn(
            "mb-4 flex size-12 items-center justify-center rounded-full [&_svg]:size-6",
            variant === "error" ? "bg-danger-50 text-danger-600" : "bg-brand-50 text-brand-700",
          )}
          aria-hidden
        >
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-ink-950">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
