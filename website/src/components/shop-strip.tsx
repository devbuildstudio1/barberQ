import Image from "next/image";
import { Clock, MapPin, Star, Store, Users } from "lucide-react";
import { APP_URL } from "@/lib/config";
import { formatINR, formatMinutes, type PublicShop } from "@/lib/data";
import { cn } from "@/lib/cn";

/**
 * Real shops pulled from the public directory. Each card links into the app,
 * which is where joining a queue actually happens.
 */
export function ShopStrip({ shops }: { shops: PublicShop[] }) {
  if (shops.length === 0) return null;

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {shops.map((shop, i) => (
        <li key={shop.id}>
          <ShopCard shop={shop} priority={i < 3} />
        </li>
      ))}
    </ul>
  );
}

function ShopCard({ shop, priority }: { shop: PublicShop; priority?: boolean }) {
  const state = !shop.isOpen ? "closed" : shop.queuePaused ? "paused" : "open";

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-shadow hover:shadow-card-hover">
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-100">
        {shop.image ? (
          <Image
            src={shop.image}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-ink-300">
            <Store className="size-8" aria-hidden />
          </div>
        )}
        <span
          className={cn(
            "absolute top-2 left-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold shadow-sm",
            state === "open" && "border-green-200 bg-success-50 text-success-700",
            state === "paused" && "border-amber-200 bg-warning-50 text-warning-700",
            state === "closed" && "border-ink-900 bg-ink-950 text-white",
          )}
        >
          <span className="size-1.5 rounded-full bg-current" aria-hidden />
          {state === "open" ? "Open" : state === "paused" ? "Paused" : "Closed"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold text-ink-950">
            <a href={`${APP_URL}/shops/${shop.id}`} className="after:absolute after:inset-0 after:content-['']">
              {shop.name}
            </a>
          </h3>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm">
            <Star className="size-3.5 fill-accent-400 text-accent-400" aria-hidden />
            <span className="font-semibold text-ink-900 tabular">{shop.rating.toFixed(1)}</span>
            <span className="text-ink-500 tabular">({shop.reviewCount})</span>
          </span>
        </div>

        <p className="mt-1 flex items-center gap-1 text-sm text-ink-500">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{shop.city ?? shop.address}</span>
        </p>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-surface-muted px-1 py-2">
            <dt className="text-[11px] font-medium text-ink-500">In queue</dt>
            <dd className="text-sm font-bold text-ink-950 tabular">{state === "closed" ? "—" : shop.waitingCount}</dd>
          </div>
          <div className="rounded-md bg-surface-muted px-1 py-2">
            <dt className="text-[11px] font-medium text-ink-500">Est. wait</dt>
            <dd className="text-sm font-bold text-ink-950 tabular">
              {state === "closed" ? "—" : shop.waitingCount === 0 ? "None" : `~${formatMinutes(shop.estimatedWaitMinutes)}`}
            </dd>
          </div>
          <div className="rounded-md bg-surface-muted px-1 py-2">
            <dt className="text-[11px] font-medium text-ink-500">From</dt>
            <dd className="text-sm font-bold text-ink-950 tabular">{shop.minPrice == null ? "—" : formatINR(shop.minPrice)}</dd>
          </div>
        </dl>

        <p className="mt-auto flex items-center gap-1.5 pt-4 text-xs text-ink-500">
          <Users className="size-3.5" aria-hidden />
          {shop.barberCount > 0 ? `${shop.barberCount} ${shop.barberCount === 1 ? "barber" : "barbers"}` : "Walk-in"}
          <span className="ml-auto inline-flex items-center gap-1 font-semibold text-brand-700">
            <Clock className="size-3.5" aria-hidden /> View live queue
          </span>
        </p>
      </div>
    </article>
  );
}
