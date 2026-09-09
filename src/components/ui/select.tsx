import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/** Native select: fully accessible, great on mobile, styled to match inputs. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 w-full appearance-none rounded-md border border-border-strong bg-surface pr-9 pl-3 text-base text-ink-950 shadow-xs focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-ink-50 md:h-10 md:text-sm",
          invalid && "border-danger-500",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-400"
        aria-hidden
      />
    </div>
  );
});
