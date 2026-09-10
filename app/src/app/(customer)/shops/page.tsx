import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { ShopCard } from "@/components/customer/shop-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { searchShops } from "@/lib/shops/queries";
import { shopSearchSchema } from "@/lib/validation/queue";
import { ShopsToolbar } from "./shops-toolbar";

export const metadata: Metadata = {
  title: "Find a barber near you",
  description: "Compare barber shops by live wait time, rating, distance and price. Join the queue from your phone.",
  alternates: { canonical: "/shops" },
};

export default async function ShopsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = shopSearchSchema.safeParse(flat);
  const params = parsed.success ? parsed.data : shopSearchSchema.parse({});
  const shops = await searchShops(params);
  const hasLocation = params.lat != null && params.lng != null;

  return (
    <div className="container-page py-6 sm:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">Find a barber</h1>
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
            <Link href="/shops" className={buttonVariants({ variant: "outline" })}>
              Clear filters
            </Link>
          }
          className="mt-6"
        />
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Shops">
          {shops.map((shop, i) => (
            <li key={shop.id}>
              <ShopCard shop={shop} priority={i < 3} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
