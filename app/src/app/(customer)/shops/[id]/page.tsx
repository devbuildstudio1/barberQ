import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, MessageSquare, Navigation, Phone, Scissors, Store } from "lucide-react";
import { BarberCard } from "@/components/customer/barber-card";
import { QueueIndicator, queueState } from "@/components/customer/queue-indicator";
import { ServiceCard } from "@/components/customer/service-card";
import { MapView } from "@/components/maps/map-view";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Rating } from "@/components/ui/rating";
import { getShopDetails } from "@/lib/shops/queries";
import { cn, formatRelative, formatTime } from "@/lib/utils";
import { directionsUrl } from "@/lib/utils/geo";
import { ShopLiveQueue } from "./shop-live-queue";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const details = await getShopDetails(id).catch(() => null);
  if (!details) return { title: "Shop not found" };
  const { shop } = details;
  const title = `${shop.name} — Barber in ${shop.city ?? "Chennai"}`;
  const description = `${shop.name}: ${shop.description ?? "live queue, prices and reviews"}. Join the queue online and skip the wait. Rated ${Number(shop.rating).toFixed(1)}/5 from ${shop.review_count} reviews.`;
  return {
    title,
    description,
    alternates: { canonical: `/shops/${shop.id}` },
    openGraph: { title, description, images: shop.image ? [{ url: shop.image }] : undefined, type: "website" },
  };
}

export default async function ShopPage({ params }: Params) {
  const { id } = await params;
  const details = await getShopDetails(id);
  if (!details) notFound();
  const { shop, barbers, services, reviews, live, queues } = details;
  const state = queueState(live.is_open, live.queue_paused);
  const activeServices = services.filter((s) => s.status === "active");
  const gallery = [shop.image, ...shop.images.filter((i) => i !== shop.image)].filter((i): i is string => !!i).slice(0, 5);
  const primaryQueue = queues.find((q) => q.barber_id === null) ?? queues[0] ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: shop.name,
    description: shop.description ?? undefined,
    image: shop.image ?? undefined,
    telephone: shop.phone ?? undefined,
    address: { "@type": "PostalAddress", streetAddress: shop.address, addressLocality: shop.city ?? undefined, addressCountry: "IN" },
    geo: shop.latitude != null && shop.longitude != null ? { "@type": "GeoCoordinates", latitude: shop.latitude, longitude: shop.longitude } : undefined,
    aggregateRating: shop.review_count > 0 ? { "@type": "AggregateRating", ratingValue: Number(shop.rating), reviewCount: shop.review_count } : undefined,
    openingHours: `Mo-Su ${shop.opening_time.slice(0, 5)}-${shop.closing_time.slice(0, 5)}`,
    priceRange: "₹",
  };

  return (
    <article className="pb-24 md:pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Gallery */}
      <div className="container-page pt-4 sm:pt-6">
        <div className={cn("grid gap-2 overflow-hidden rounded-xl", gallery.length > 1 ? "grid-cols-4 grid-rows-2" : "grid-cols-1")}>
          {gallery.length === 0 ? (
            <div className="flex aspect-[21/9] items-center justify-center bg-ink-100 text-ink-300">
              <Store className="size-12" aria-hidden />
            </div>
          ) : (
            gallery.map((src, i) => (
              <div
                key={src}
                className={cn(
                  "relative bg-ink-100",
                  gallery.length === 1 ? "aspect-[21/9]" : i === 0 ? "col-span-4 row-span-2 aspect-[16/9] sm:col-span-2" : "hidden aspect-[4/3] sm:block",
                  gallery.length > 1 && i > 0 && "sm:col-span-1",
                )}
              >
                <Image src={src} alt={i === 0 ? `${shop.name} storefront` : `${shop.name} photo ${i + 1}`} fill priority={i === 0} sizes={i === 0 ? "(max-width: 640px) 100vw, 50vw" : "25vw"} className="object-cover" />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="container-page mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-10">
          {/* Header */}
          <header>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-ink-950">{shop.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
                  <Rating value={Number(shop.rating)} count={shop.review_count} size="md" />
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-4 text-ink-400" aria-hidden />
                    {formatTime(shop.opening_time)} – {formatTime(shop.closing_time)}
                  </span>
                  {shop.phone ? (
                    <a href={`tel:${shop.phone}`} className="inline-flex items-center gap-1 hover:text-ink-950">
                      <Phone className="size-4 text-ink-400" aria-hidden /> {shop.phone}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-sm text-ink-600">
              <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
              {shop.address}
              {shop.city ? `, ${shop.city}` : ""}
            </p>
            {shop.description ? <p className="mt-4 max-w-2xl text-ink-700">{shop.description}</p> : null}
          </header>

          {/* Mobile queue status */}
          <div className="lg:hidden">
            <ShopLiveQueue shopId={shop.id} initialLive={live} initialSnapshot={primaryQueue} queueIds={queues.map((q) => q.queue_id)} />
          </div>

          {/* Barbers */}
          <section aria-labelledby="barbers-h">
            <h2 id="barbers-h" className="text-xl font-bold text-ink-950">
              Barbers
            </h2>
            {barbers.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">Walk-in chairs — first available barber serves you.</p>
            ) : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {barbers.map((b) => (
                  <li key={b.id}>
                    <BarberCard barber={b} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Services */}
          <section aria-labelledby="services-h">
            <h2 id="services-h" className="text-xl font-bold text-ink-950">
              Services &amp; prices
            </h2>
            {activeServices.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">No services listed yet.</p>
            ) : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {activeServices.map((s) => (
                  <li key={s.id}>
                    <ServiceCard service={s} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Location */}
          <section aria-labelledby="location-h">
            <div className="flex items-center justify-between">
              <h2 id="location-h" className="text-xl font-bold text-ink-950">
                Location
              </h2>
              <a href={directionsUrl(shop.latitude, shop.longitude, `${shop.name} ${shop.address}`)} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Navigation /> Get Directions
              </a>
            </div>
            <MapView lat={shop.latitude} lng={shop.longitude} label={shop.name} address={shop.address} className="mt-3" />
          </section>

          {/* Reviews */}
          <section aria-labelledby="reviews-h">
            <h2 id="reviews-h" className="text-xl font-bold text-ink-950">
              Reviews <span className="text-base font-medium text-ink-500">({shop.review_count})</span>
            </h2>
            {reviews.length === 0 ? (
              <EmptyState icon={<MessageSquare />} title="No reviews yet" description="Reviews come from customers after a completed visit." className="mt-3" />
            ) : (
              <ul className="mt-3 space-y-3">
                {reviews.map((r) => (
                  <li key={r.id}>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.reviewer_name} src={r.reviewer_image} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink-950">{r.reviewer_name}</p>
                            <p className="text-xs text-ink-500">
                              {formatRelative(r.created_at)}
                              {r.barber_name ? ` · with ${r.barber_name}` : ""}
                            </p>
                          </div>
                          <Rating value={r.rating} />
                        </div>
                        {r.review ? <p className="mt-3 text-sm text-ink-700">{r.review}</p> : null}
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Sticky sidebar (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <ShopLiveQueue shopId={shop.id} initialLive={live} initialSnapshot={primaryQueue} queueIds={queues.map((q) => q.queue_id)} />
            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="flex items-center gap-2 text-sm text-ink-700">
                  <Scissors className="size-4 text-ink-400" aria-hidden />
                  {activeServices.length} services · {barbers.length || "walk-in"} {barbers.length === 1 ? "barber" : "barbers"}
                </p>
                <p className="flex items-center gap-2 text-sm text-ink-700">
                  <Clock className="size-4 text-ink-400" aria-hidden />
                  Open {formatTime(shop.opening_time)} – {formatTime(shop.closing_time)}
                </p>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface/95 p-3 backdrop-blur md:hidden">
        <div className="container-page flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <QueueIndicator isOpen={live.is_open} queuePaused={live.queue_paused} waitingCount={live.waiting_count} estimatedWaitMinutes={live.estimated_wait_minutes} />
          </div>
          <Link href={state === "open" ? `/shops/${shop.id}/join` : "#"} aria-disabled={state !== "open"} className={cn(buttonVariants({ size: "lg" }), state !== "open" && "pointer-events-none opacity-50")}>
            Join Queue
          </Link>
        </div>
      </div>
    </article>
  );
}
