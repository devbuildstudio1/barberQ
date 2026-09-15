import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, SearchX, Star, Store } from "lucide-react";
import { ShopCard } from "@/components/customer/shop-card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatsCard } from "@/components/ui/stats-card";
import { getCurrentProfile } from "@/lib/auth/profile";
import { homeFor } from "@/lib/auth/redirects";
import { getMyActiveQueueEntry, getMyReviewableVisits } from "@/lib/queue/queries";
import { searchShops } from "@/lib/shops/queries";
import { cn, formatMinutes } from "@/lib/utils";
import { shopSearchSchema } from "@/lib/validation/queue";
import { ReviewPrompt } from "../my-queue/review-prompt";
import { ActiveTicket } from "./active-ticket";
import { ShopsToolbar } from "./shops-toolbar";

export const metadata: Metadata = {
  title: "Find a barber near you",
  description: "Compare barber shops by live wait time, rating, distance and price. Join the queue from your phone.",
  alternates: { canonical: "/dashboard" },
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = shopSearchSchema.safeParse(flat);
  const params = parsed.success ? parsed.data : shopSearchSchema.parse({});

  const profile = await getCurrentProfile();
  const isCustomer = profile?.role === "customer";
  const [shops, active, reviewable] = await Promise.all([
    searchShops(params),
    isCustomer ? getMyActiveQueueEntry() : null,
    isCustomer ? getMyReviewableVisits() : [],
  ]);

  const hasLocation = params.lat != null && params.lng != null;
  const hasFilters = Boolean(params.q || params.open || params.maxDistance || params.minRating || params.maxPrice || params.maxWait != null);
  const openNow = shops.filter((s) => s.is_open && !s.queue_paused).sort((a, b) => a.estimated_wait_minutes - b.estimated_wait_minutes);
  const quickest = openNow[0];
  const topRated = shops.filter((s) => Number(s.rating) >= 4).length;
  const firstName = profile?.name?.trim().split(/\s+/)[0];

  return (
    <div className="container-page space-y-10 py-6 sm:py-8">
      {profile ? (
        <section aria-labelledby="welcome-h" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-brand-700">Dashboard</p>
              <h1 id="welcome-h" className="mt-1 text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
                {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
              </h1>
            </div>
            {!isCustomer ? (
              <Link href={homeFor(profile.role)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Go to your workspace <ArrowRight />
              </Link>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {isCustomer ? <ActiveTicket initial={active} userId={profile.id} className="lg:col-span-2" /> : null}
            <DiscoveryStats
              className={isCustomer ? "lg:grid-cols-1" : "lg:col-span-3 lg:grid-cols-3"}
              openCount={openNow.length}
              total={shops.length}
              quickest={quickest}
              topRated={topRated}
            />
          </div>
        </section>
      ) : (
        <section aria-labelledby="welcome-h" className="relative overflow-hidden rounded-xl bg-ink-950 p-6 text-white sm:p-10">
          <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden>
            <div className="absolute -top-24 -right-16 size-72 rounded-full bg-brand-400 blur-3xl" />
            <div className="absolute -bottom-32 -left-10 size-72 rounded-full bg-accent-400 blur-3xl" />
          </div>
          <div className="relative grid gap-8">
            <div>
              <h1 id="welcome-h" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Skip the wait at <span className="text-brand-300">barbers near you.</span>
              </h1>
              <p className="mt-3 max-w-lg text-white/70">
                Live wait times, one-tap queue joining and a token that tells you exactly when to walk in.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/login?next=%2Fdashboard" className={buttonVariants()}>
                  Sign in
                </Link>
                <Link href="/register" className={buttonVariants({ variant: "outline" })}>
                  Create account
                </Link>
              </div>
            </div>
            <DiscoveryStats className="hidden text-ink-950 sm:grid" openCount={openNow.length} total={shops.length} quickest={quickest} topRated={topRated} />
          </div>
        </section>
      )}

      {reviewable.length > 0 ? (
        <section aria-labelledby="review-h">
          <h2 id="review-h" className="text-lg font-bold text-ink-950">
            How was your last visit?
          </h2>
          <div className="mt-3 max-w-2xl">
            <ReviewPrompt visit={reviewable[0]} />
          </div>
        </section>
      ) : null}

      {!hasFilters && openNow.length > 0 ? (
        <section aria-labelledby="quick-h">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="quick-h" className="text-lg font-bold text-ink-950">
                Open now · shortest wait
              </h2>
              <p className="text-sm text-ink-500">Walk in sooner at these shops.</p>
            </div>
            <Link href="/dashboard?open=true&sort=wait#find" className="text-sm font-semibold text-brand-700 hover:underline">
              See all
            </Link>
          </div>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Open shops with the shortest wait">
            {openNow.slice(0, 3).map((shop) => (
              <li key={shop.id}>
                <ShopCard shop={shop} priority />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="find" aria-labelledby="find-h" className="scroll-mt-20">
        <div className="mb-5">
          <h2 id="find-h" className="text-xl font-bold tracking-tight text-ink-950 sm:text-2xl">
            Find a barber
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            {shops.length} {shops.length === 1 ? "shop" : "shops"}
            {params.q ? ` matching “${params.q}”` : ""}
            {hasLocation ? " near you" : " in Chennai"} · live wait times
          </p>
        </div>

        <ShopsToolbar params={params} />

        {shops.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title="No barbers found nearby."
            description={params.q ? "Try a different name or clear the filters." : "Try widening your filters or searching another area."}
            action={
              <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
                Clear filters
              </Link>
            }
            className="mt-6"
          />
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Shops">
            {shops.map((shop, i) => (
              <li key={shop.id}>
                <ShopCard shop={shop} priority={hasFilters && i < 3} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DiscoveryStats({
  openCount,
  total,
  quickest,
  topRated,
  className,
}: {
  openCount: number;
  total: number;
  quickest: { name: string; waiting_count: number; estimated_wait_minutes: number } | undefined;
  topRated: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-3", className)}>
      <StatsCard label="Open now" value={openCount} hint={`of ${total} ${total === 1 ? "shop" : "shops"}`} icon={<Store />} tone="success" />
      <StatsCard
        label="Shortest wait"
        value={quickest ? (quickest.waiting_count === 0 ? "None" : `~${formatMinutes(quickest.estimated_wait_minutes)}`) : "—"}
        hint={quickest?.name ?? "No shops open"}
        icon={<Clock />}
        tone="brand"
      />
      <StatsCard label="Rated 4★+" value={topRated} hint="by customers" icon={<Star />} tone="warning" />
    </div>
  );
}
