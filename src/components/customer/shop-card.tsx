import Image from "next/image";
import Link from "next/link";
import { MapPin, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Rating } from "@/components/ui/rating";
import { cn, formatDistance, formatINR, formatMinutes, pluralize } from "@/lib/utils";
import { queueState } from "./queue-indicator";
import type { ShopListing } from "@/types/domain";

interface ShopCardProps {
  shop: ShopListing;
  variant?: "grid" | "row";
  priority?: boolean;
  className?: string;
}

export function ShopCard({ shop, variant = "grid", priority, className }: ShopCardProps) {
  const state = queueState(shop.is_open, shop.queue_paused);
  const href = `/shops/${shop.id}`;
  const canJoin = state === "open";

  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-shadow hover:shadow-card-hover",
        variant === "grid" ? "flex-col" : "flex-row",
        className,
      )}
    >
      <div className={cn("relative shrink-0 overflow-hidden bg-ink-100", variant === "grid" ? "aspect-[16/10] w-full" : "w-28 sm:w-40")}>
        {shop.image ? (
          <Image
            src={shop.image}
            alt=""
            fill
            priority={priority}
            sizes={variant === "grid" ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" : "160px"}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-ink-300">
            <Store className="size-8" aria-hidden />
          </div>
        )}
        <div className="absolute top-2 left-2">
          {state === "open" ? (
            <Badge variant="success" dot pulse className="shadow-sm">
              Open
            </Badge>
          ) : state === "paused" ? (
            <Badge variant="warning" dot className="shadow-sm">
              Paused
            </Badge>
          ) : (
            <Badge variant="dark" className="shadow-sm">
              Closed
            </Badge>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-base font-semibold text-ink-950">
            <Link href={href} className="after:absolute after:inset-0 after:content-['']">
              {shop.name}
            </Link>
          </h3>
          <Rating value={Number(shop.rating)} count={shop.review_count} />
        </div>
        <p className="mt-1 flex items-center gap-1 text-sm text-ink-500">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {shop.distance_km != null ? `${formatDistance(shop.distance_km)} · ` : ""}
            {shop.city ?? shop.address}
          </span>
        </p>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-surface-muted px-1 py-2">
            <dt className="text-[11px] font-medium text-ink-500">In queue</dt>
            <dd className="text-sm font-bold text-ink-950 tabular">{state === "closed" ? "—" : shop.waiting_count}</dd>
          </div>
          <div className="rounded-md bg-surface-muted px-1 py-2">
            <dt className="text-[11px] font-medium text-ink-500">Est. wait</dt>
            <dd className="text-sm font-bold text-ink-950 tabular">
              {state === "closed" ? "—" : shop.waiting_count === 0 ? "None" : `~${formatMinutes(shop.estimated_wait_minutes)}`}
            </dd>
          </div>
          <div className="rounded-md bg-surface-muted px-1 py-2">
            <dt className="text-[11px] font-medium text-ink-500">From</dt>
            <dd className="text-sm font-bold text-ink-950 tabular">{shop.min_price != null ? formatINR(Number(shop.min_price)) : "—"}</dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="text-xs text-ink-500">
            {shop.barber_count > 0 ? pluralize(shop.barber_count, "barber") : "Walk-in"}
          </span>
          <Link
            href={canJoin ? `${href}/join` : href}
            className={cn("relative z-10", buttonVariants({ size: "sm", variant: canJoin ? "primary" : "outline" }))}
            aria-label={`${canJoin ? "Join queue at" : "View"} ${shop.name}`}
          >
            {canJoin ? "Join Queue" : "View shop"}
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ShopCardSkeleton({ variant = "grid" }: { variant?: "grid" | "row" }) {
  return (
    <div className={cn("flex overflow-hidden rounded-lg border border-border bg-surface", variant === "grid" ? "flex-col" : "flex-row")} aria-hidden>
      <div className={cn("animate-pulse bg-ink-200/70", variant === "grid" ? "aspect-[16/10] w-full" : "w-28 sm:w-40")} />
      <div className="flex-1 space-y-3 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-ink-200/70" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-ink-200/70" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-12 animate-pulse rounded bg-ink-200/70" />
          <div className="h-12 animate-pulse rounded bg-ink-200/70" />
          <div className="h-12 animate-pulse rounded bg-ink-200/70" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded bg-ink-200/70 ml-auto" />
      </div>
    </div>
  );
}
