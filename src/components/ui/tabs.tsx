"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
  "aria-label": string;
}

/** Segmented control (tabs-like) using radio semantics. */
export function Segmented<T extends string>({ value, onChange, options, className, ...rest }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={rest["aria-label"]} className={cn("inline-flex rounded-md bg-ink-100 p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-surface text-ink-950 shadow-xs" : "text-ink-600 hover:text-ink-900",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
