"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  value: number;
  count?: number | null;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

const sizeMap = { sm: "size-3.5", md: "size-4", lg: "size-5" };

/** Read-only star rating with numeric value. */
export function Rating({ value, count, size = "sm", showValue = true, className }: RatingProps) {
  const rounded = Math.round(value * 10) / 10;
  const label = `${rounded} out of 5 stars${count != null ? `, ${count} reviews` : ""}`;
  return (
    <span className={cn("inline-flex items-center gap-1", className)} role="img" aria-label={label}>
      <Star className={cn(sizeMap[size], "fill-accent-400 text-accent-400")} aria-hidden />
      {showValue ? (
        <span className={cn("font-semibold text-ink-900 tabular", size === "sm" ? "text-sm" : "text-base")}>
          {rounded.toFixed(1)}
        </span>
      ) : null}
      {count != null ? <span className="text-sm text-ink-500 tabular">({count})</span> : null}
    </span>
  );
}

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  name?: string;
  disabled?: boolean;
}

/** Interactive star picker (keyboard accessible radio group). */
export function RatingInput({ value, onChange, name = "rating", disabled }: RatingInputProps) {
  const [hover, setHover] = React.useState(0);
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= (hover || value);
        return (
          <label key={n} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              disabled={disabled}
              className="sr-only"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            />
            <Star
              onMouseEnter={() => setHover(n)}
              className={cn(
                "size-8 transition-colors",
                active ? "fill-accent-400 text-accent-400" : "text-ink-300",
              )}
              aria-hidden
            />
          </label>
        );
      })}
    </div>
  );
}
