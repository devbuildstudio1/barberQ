import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, leftIcon, rightSlot, type = "text", ...props },
  ref,
) {
  return (
    <div className="relative flex items-center">
      {leftIcon ? (
        <span className="pointer-events-none absolute left-3 text-ink-400 [&_svg]:size-4" aria-hidden>
          {leftIcon}
        </span>
      ) : null}
      <input
        ref={ref}
        type={type}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base text-ink-950 shadow-xs placeholder:text-ink-400 transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500 md:h-10 md:text-sm",
          leftIcon && "pl-9",
          rightSlot && "pr-10",
          invalid && "border-danger-500 focus:border-danger-500 focus:ring-red-100",
          className,
        )}
        {...props}
      />
      {rightSlot ? <span className="absolute right-2 flex items-center">{rightSlot}</span> : null}
    </div>
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-24 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-ink-950 shadow-xs placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-ink-50 md:text-sm",
        invalid && "border-danger-500 focus:border-danger-500 focus:ring-red-100",
        className,
      )}
      {...props}
    />
  );
});
