import Link from "next/link";
import { ArrowRight, BellRing, Clock, MapPin, Search, Smartphone, Star, Ticket, TrendingUp, Users } from "lucide-react";
import { ShopCard } from "@/components/customer/shop-card";
import { buttonVariants } from "@/components/ui/button";
import { searchShops } from "@/lib/shops/queries";
import { DEFAULT_LOCATION } from "@/lib/utils/geo";
import { cn } from "@/lib/utils";
import { HeroSearch } from "./hero-search";

export const revalidate = 60;

export default async function HomePage() {
  const shops = await searchShops({ lat: DEFAULT_LOCATION.lat, lng: DEFAULT_LOCATION.lng, sort: "recommended" }).catch(() => []);
  const nearby = [...shops].sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99)).slice(0, 3);
  const recommended = shops.slice(0, 3);
  const popular = [...shops].sort((a, b) => b.review_count - a.review_count).slice(0, 3);
  const openNow = shops.filter((s) => s.is_open && !s.queue_paused).sort((a, b) => a.estimated_wait_minutes - b.estimated_wait_minutes).slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden>
          <div className="absolute -top-32 -left-32 size-[32rem] rounded-full bg-brand-400 blur-3xl" />
          <div className="absolute -right-24 -bottom-40 size-[28rem] rounded-full bg-accent-400 blur-3xl" />
        </div>
        <div className="container-page relative grid gap-10 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-brand-200 uppercase">
              <span className="size-1.5 rounded-full bg-brand-300 animate-pulse-dot" aria-hidden /> Live queues in Chennai
            </p>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              No more waiting <span className="text-brand-300">in line.</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/70">
              See live wait times at barber shops near you, join the queue from your phone and walk in exactly when it&apos;s your turn.
            </p>
            <div className="mt-8">
              <HeroSearch />
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <Ticket className="size-4 text-brand-300" aria-hidden /> Digital token
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BellRing className="size-4 text-brand-300" aria-hidden /> Turn alerts
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4 text-brand-300" aria-hidden /> Live wait times
              </span>
            </div>
          </div>
          <div className="mx-auto w-full max-w-sm lg:max-w-none">
            <TokenPreview />
          </div>
        </div>
      </section>

      {/* Shop rails */}
      <div className="container-page space-y-14 py-14">
        {openNow.length > 0 ? (
          <ShopRail title="Open now, shortest wait" subtitle="Walk in sooner" href="/shops?sort=wait&open=true" shops={openNow} priority />
        ) : null}
        {nearby.length > 0 ? <ShopRail title="Nearby barbers" subtitle="Around Chennai" href="/shops?sort=nearest" shops={nearby} /> : null}
        {recommended.length > 0 ? <ShopRail title="Recommended for you" subtitle="Rated, close and quick" href="/shops?sort=recommended" shops={recommended} /> : null}
        {popular.length > 0 ? <ShopRail title="Popular this month" subtitle="Most reviewed" href="/shops?sort=rating" shops={popular} /> : null}
        {shops.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong p-10 text-center text-ink-500">No barbers found nearby yet.</div>
        ) : null}
      </div>

      {/* How it works */}
      <section className="border-y border-border bg-surface">
        <div className="container-page py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-950">How it works</h2>
            <p className="mt-2 text-ink-600">Three steps between you and a fresh cut. Zero minutes in a plastic chair.</p>
          </div>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { icon: Search, title: "Find a barber", text: "Browse shops near you with live queue counts, wait times and prices." },
              { icon: Ticket, title: "Join remotely", text: "Pick a service and barber. Get a token like A-27 instantly." },
              { icon: BellRing, title: "Walk in on time", text: "Track your position live. We ping you when you're next." },
            ].map((s, i) => (
              <li key={s.title} className="relative rounded-lg border border-border bg-surface-muted p-6">
                <span className="absolute top-4 right-4 text-4xl font-black text-ink-200 tabular" aria-hidden>
                  {i + 1}
                </span>
                <span className="flex size-11 items-center justify-center rounded-md bg-brand-600 text-white">
                  <s.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-ink-950">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Benefits */}
      <section className="container-page grid gap-10 py-16 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-ink-950">Built for customers. Loved by barbers.</h2>
          <ul className="mt-6 space-y-4">
            {[
              { icon: Smartphone, title: "Track from anywhere", text: "Position, people ahead and estimated wait update live on your phone." },
              { icon: Users, title: "Choose your barber", text: "Queue for a specific barber or the first available chair." },
              { icon: Star, title: "Honest ratings", text: "Reviews only from customers who actually got served." },
              { icon: TrendingUp, title: "Fewer no-shows for shops", text: "Owners run the queue with one-tap call, start and complete." },
            ].map((b) => (
              <li key={b.title} className="flex gap-4">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                  <b.icon className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-ink-950">{b.title}</p>
                  <p className="text-sm text-ink-600">{b.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-brand-700 p-8 text-white">
          <h3 className="text-2xl font-bold">Own a barbershop?</h3>
          <p className="mt-2 text-brand-100">List your shop free, run a live queue and fill quiet hours with walk-ins who know exactly when to arrive.</p>
          <Link href="/shop/register" className={cn(buttonVariants({ variant: "accent", size: "lg" }), "mt-6")}>
            Register your shop <ArrowRight />
          </Link>
        </div>
      </section>
    </>
  );
}

function ShopRail({ title, subtitle, href, shops, priority }: { title: string; subtitle: string; href: string; shops: Awaited<ReturnType<typeof searchShops>>; priority?: boolean }) {
  return (
    <section aria-labelledby={`rail-${title}`}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id={`rail-${title}`} className="text-xl font-bold tracking-tight text-ink-950 sm:text-2xl">
            {title}
          </h2>
          <p className="text-sm text-ink-500">{subtitle}</p>
        </div>
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
          See all <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shops.map((s, i) => (
          <ShopCard key={s.id} shop={s} priority={priority && i === 0} />
        ))}
      </div>
    </section>
  );
}

function TokenPreview() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-pop backdrop-blur">
      <div className="rounded-xl bg-surface p-5 text-ink-950">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold tracking-wider text-ink-500 uppercase">Your queue</p>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success-600">
            <span className="size-1.5 rounded-full bg-success-500 animate-pulse-dot" aria-hidden /> Live
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-sm text-ink-500">Token</p>
            <p className="text-5xl font-black tracking-tight tabular">A-27</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-ink-500">Now serving</p>
            <p className="text-2xl font-bold tabular">A-22</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-surface-muted p-3">
            <p className="text-xs text-ink-500">People ahead</p>
            <p className="text-2xl font-bold tabular">4</p>
          </div>
          <div className="rounded-md bg-surface-muted p-3">
            <p className="text-xs text-ink-500">Estimated wait</p>
            <p className="text-2xl font-bold tabular">~20 min</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-100">
          <div className="h-full w-2/3 rounded-full bg-brand-500" />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-600">
          <MapPin className="size-4 text-ink-400" aria-hidden /> Classic Cuts · Haircut
        </p>
      </div>
    </div>
  );
}
