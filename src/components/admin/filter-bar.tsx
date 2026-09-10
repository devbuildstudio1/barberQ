"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  search?: string;
  searchPlaceholder?: string;
  filterKey?: string;
  filterValue?: string;
  filters?: { value: string; label: string }[];
}

/** Search + status pills that drive the page's query string. */
export function FilterBar({ search, searchPlaceholder = "Search", filterKey = "status", filterValue, filters }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = React.useState(search ?? "");
  const [pending, startTransition] = React.useTransition();

  const push = React.useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      const merged: Record<string, string | undefined> = { q: search, [filterKey]: filterValue, ...patch };
      for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
      startTransition(() => router.push(`${pathname}${params.size ? `?${params}` : ""}`));
    },
    [filterKey, filterValue, pathname, router, search],
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" aria-busy={pending}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: q.trim() || undefined });
        }}
        role="search"
        className="min-w-56 flex-1"
      >
        <label htmlFor="admin-search" className="sr-only">
          {searchPlaceholder}
        </label>
        <Input
          id="admin-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          leftIcon={<Search />}
          rightSlot={
            q ? (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  push({ q: undefined });
                }}
                className="rounded p-1 text-ink-400 hover:text-ink-700"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : undefined
          }
        />
      </form>
      {filters?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <Button
              key={f.value || "all"}
              size="sm"
              variant={filterValue === f.value || (!filterValue && !f.value) ? "primary" : "outline"}
              onClick={() => push({ [filterKey]: f.value || undefined })}
              aria-pressed={filterValue === f.value || (!filterValue && !f.value)}
              className={cn("capitalize")}
            >
              {f.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
