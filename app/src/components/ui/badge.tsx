import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "border-ink-200 bg-ink-100 text-ink-700",
        brand: "border-brand-200 bg-brand-50 text-brand-800",
        success: "border-green-200 bg-success-50 text-success-700",
        warning: "border-amber-200 bg-warning-50 text-warning-700",
        danger: "border-red-200 bg-danger-50 text-danger-700",
        info: "border-blue-200 bg-info-50 text-info-700",
        dark: "border-ink-900 bg-ink-950 text-white",
        outline: "border-border-strong bg-transparent text-ink-700",
      },
      size: {
        sm: "px-1.5 py-0 text-[11px]",
        md: "",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
  pulse?: boolean;
}

export function Badge({ className, variant, size, dot, pulse, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot ? (
        <span
          className={cn("size-1.5 rounded-full bg-current", pulse && "animate-pulse-dot")}
          aria-hidden
        />
      ) : null}
      {children}
    </span>
  );
}
