"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { LocateFixed, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useGeolocation } from "@/hooks/use-geolocation";
import type { ShopSearchParams } from "@/lib/validation/queue";

const SORTS: { value: ShopSearchParams["sort"]; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "nearest", label: "Nearest" },
  { value: "rating", label: "Highest rated" },
  { value: "wait", label: "Lowest waiting time" },
  { value: "price", label: "Lowest price" },
];

type Patch = Partial<Record<keyof ShopSearchParams, string | number | boolean | undefined>>;

export function ShopsToolbar({ params }: { params: ShopSearchParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = React.useState(params.q ?? "");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const geo = useGeolocation();

  const update = React.useCallback(
    (patch: Patch) => {
      const next = new URLSearchParams();
      const merged: Record<string, unknown> = { ...params, ...patch };
      for (const [k, v] of Object.entries(merged)) {
        if (v === undefined || v === "" || v === false || v === null) continue;
        if (k === "sort" && v === "recommended") continue;
        next.set(k, String(v));
      }
      startTransition(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`));
    },
    [params, pathname, router],
  );

  // Apply a cached/granted location once if the URL has none.
  const appliedRef = React.useRef(false);
  React.useEffect(() => {
    if (appliedRef.current || params.lat != null || !geo.location) return;
    appliedRef.current = true;
    update({ lat: geo.location.lat, lng: geo.location.lng, sort: params.sort === "recommended" ? "nearest" : params.sort });
  }, [geo.location, params.lat, params.sort, update]);

  const activeFilters = [
    params.open ? "Open now" : null,
    params.maxDistance ? `≤ ${params.maxDistance} km` : null,
    params.minRating ? `${params.minRating}★+` : null,
    params.maxPrice ? `≤ ₹${params.maxPrice}` : null,
    params.maxWait != null ? `≤ ${params.maxWait} min wait` : null,
  ].filter((f): f is string => f != null);

  return (
    <div className="space-y-3" aria-busy={pending}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: q.trim() || undefined });
        }}
        role="search"
        className="flex gap-2"
      >
        <div className="flex-1">
          <label htmlFor="shops-q" className="sr-only">
            Search by shop or barber name
          </label>
          <Input
            id="shops-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search shop or barber"
            leftIcon={<Search />}
            rightSlot={
              q ? (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    update({ q: undefined });
                  }}
                  className="rounded p-1 text-ink-400 hover:text-ink-700"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              ) : undefined
            }
          />
        </div>
        <Button type="submit" variant="secondary" className="hidden sm:inline-flex">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={params.lat != null ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            if (params.lat != null) {
              geo.clear();
              update({ lat: undefined, lng: undefined, sort: params.sort === "nearest" ? "recommended" : params.sort });
            } else {
              geo.request();
            }
          }}
          loading={geo.status === "locating"}
          aria-pressed={params.lat != null}
        >
          <LocateFixed /> {params.lat != null ? "Near me" : "Use my location"}
        </Button>
        {geo.status === "denied" ? <span className="text-xs text-ink-500">Location blocked — showing Chennai.</span> : null}

        <Button type="button" variant="outline" size="sm" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal /> Filters
          {activeFilters.length ? (
            <Badge variant="brand" size="sm">
              {activeFilters.length}
            </Badge>
          ) : null}
        </Button>

        <Button
          type="button"
          variant={params.open ? "primary" : "outline"}
          size="sm"
          onClick={() => update({ open: !params.open || undefined })}
          aria-pressed={!!params.open}
        >
          Open now
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-ink-500">
            Sort
          </label>
          <Select id="sort" value={params.sort} onChange={(e) => update({ sort: e.target.value })} className="h-9 w-52 md:h-9">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value} disabled={s.value === "nearest" && params.lat == null}>
                {s.label}
                {s.value === "nearest" && params.lat == null ? " (share location)" : ""}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {activeFilters.length ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {activeFilters.map((f) => (
            <Badge key={f} variant="outline">
              {f}
            </Badge>
          ))}
          <button
            type="button"
            className="text-brand-700 hover:underline"
            onClick={() => update({ open: undefined, maxDistance: undefined, minRating: undefined, maxPrice: undefined, maxWait: undefined })}
          >
            Clear all
          </button>
        </div>
      ) : null}

      <FiltersDialog
        key={filtersOpen ? "open" : "closed"}
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        params={params}
        onApply={update}
        hasLocation={params.lat != null}
      />
    </div>
  );
}

function FiltersDialog({
  open,
  onClose,
  params,
  onApply,
  hasLocation,
}: {
  open: boolean;
  onClose: () => void;
  params: ShopSearchParams;
  onApply: (patch: Patch) => void;
  hasLocation: boolean;
}) {
  const [draft, setDraft] = React.useState({
    maxDistance: params.maxDistance != null ? String(params.maxDistance) : "",
    minRating: params.minRating != null ? String(params.minRating) : "",
    maxPrice: params.maxPrice != null ? String(params.maxPrice) : "",
    maxWait: params.maxWait != null ? String(params.maxWait) : "",
    open: !!params.open,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Filters"
      description="Narrow down shops that fit your plan."
      footer={
        <>
          <Button variant="ghost" onClick={() => setDraft({ maxDistance: "", minRating: "", maxPrice: "", maxWait: "", open: false })}>
            Reset
          </Button>
          <Button
            onClick={() => {
              onApply({
                maxDistance: draft.maxDistance || undefined,
                minRating: draft.minRating || undefined,
                maxPrice: draft.maxPrice || undefined,
                maxWait: draft.maxWait === "" ? undefined : draft.maxWait,
                open: draft.open || undefined,
              });
              onClose();
            }}
          >
            Apply filters
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Distance" htmlFor="f-distance" disabled={!hasLocation} hint={!hasLocation ? "Share your location to filter by distance" : undefined}>
          <Select id="f-distance" value={draft.maxDistance} disabled={!hasLocation} onChange={(e) => setDraft({ ...draft, maxDistance: e.target.value })}>
            <option value="">Any distance</option>
            <option value="1">Within 1 km</option>
            <option value="3">Within 3 km</option>
            <option value="5">Within 5 km</option>
            <option value="10">Within 10 km</option>
          </Select>
        </Field>
        <Field label="Rating" htmlFor="f-rating">
          <Select id="f-rating" value={draft.minRating} onChange={(e) => setDraft({ ...draft, minRating: e.target.value })}>
            <option value="">Any rating</option>
            <option value="3">3★ and up</option>
            <option value="4">4★ and up</option>
            <option value="4.5">4.5★ and up</option>
          </Select>
        </Field>
        <Field label="Starting price" htmlFor="f-price">
          <Select id="f-price" value={draft.maxPrice} onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value })}>
            <option value="">Any price</option>
            <option value="100">Under ₹100</option>
            <option value="200">Under ₹200</option>
            <option value="300">Under ₹300</option>
            <option value="500">Under ₹500</option>
          </Select>
        </Field>
        <Field label="Waiting time" htmlFor="f-wait">
          <Select id="f-wait" value={draft.maxWait} onChange={(e) => setDraft({ ...draft, maxWait: e.target.value })}>
            <option value="">Any wait</option>
            <option value="0">No wait</option>
            <option value="15">Under 15 min</option>
            <option value="30">Under 30 min</option>
            <option value="60">Under 1 hour</option>
          </Select>
        </Field>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm text-ink-800">
        <input type="checkbox" checked={draft.open} onChange={(e) => setDraft({ ...draft, open: e.target.checked })} className="size-4 accent-brand-600" />
        Only show shops open now
      </label>
    </Dialog>
  );
}

function Field({ label, htmlFor, children, disabled, hint }: { label: string; htmlFor: string; children: React.ReactNode; disabled?: boolean; hint?: string }) {
  return (
    <div className={disabled ? "opacity-60" : undefined}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink-800">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}
