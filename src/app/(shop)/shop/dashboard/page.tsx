import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, ExternalLink, ListOrdered, Scissors, Star, Users } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
import { PageHeader } from "@/components/layout/page-header";
import { getOwnedShop } from "@/lib/auth/guards";
import { getShopQueueBoard } from "@/lib/queue/queries";
import { createClient } from "@/lib/supabase/server";
import { formatMinutes, formatTime, pluralize } from "@/lib/utils";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function ShopDashboardPage() {
  const shop = await getOwnedShop();
  if (!shop) notFound();

  const supabase = await createClient();
  const [board, barbersRes, servicesRes] = await Promise.all([
    shop.status === "approved" ? getShopQueueBoard(shop.id) : Promise.resolve(null),
    supabase.from("barbers").select("id, status", { count: "exact" }).eq("shop_id", shop.id),
    supabase.from("services").select("id, status", { count: "exact" }).eq("shop_id", shop.id),
  ]);

  const activeBarbers = (barbersRes.data ?? []).filter((b) => b.status === "active").length;
  const activeServices = (servicesRes.data ?? []).filter((s) => s.status === "active").length;
  const waiting = board?.queues.reduce((n, q) => n + q.waiting_count, 0) ?? 0;
  const wait = board?.queues.reduce((n, q) => Math.max(n, q.estimated_wait_minutes), 0) ?? 0;
  const serving = board?.entries.find((e) => e.status === "serving" || e.status === "called") ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={shop.name}
        description={`${shop.address} · ${formatTime(shop.opening_time)} – ${formatTime(shop.closing_time)}`}
        actions={
          shop.status === "approved" ? (
            <Link href={`/shops/${shop.id}`} className={buttonVariants({ variant: "outline", size: "sm" })} target="_blank">
              <ExternalLink /> View public page
            </Link>
          ) : null
        }
      />

      {shop.status === "pending" ? (
        <Alert tone="warning" title="Your shop is awaiting approval">
          Customers can&apos;t find you yet. Meanwhile, add your barbers and services so you&apos;re ready on day one.
        </Alert>
      ) : shop.status === "rejected" ? (
        <Alert tone="danger" title="Registration was not approved">
          {shop.rejection_reason ?? "Please review your details and contact support."}
        </Alert>
      ) : shop.status === "suspended" ? (
        <Alert tone="danger" title="Your shop is suspended">
          {shop.rejection_reason ?? "Contact support to restore your listing."}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Waiting now" value={waiting} icon={<ListOrdered />} tone="brand" hint={waiting > 0 ? `~${formatMinutes(wait)} queue` : "Queue is empty"} />
        <StatsCard label="Completed today" value={board?.completed_today ?? 0} icon={<CheckCircle2 />} tone="success" />
        <StatsCard label="Active barbers" value={activeBarbers} icon={<Users />} hint={`${barbersRes.data?.length ?? 0} total`} />
        <StatsCard label="Active services" value={activeServices} icon={<Scissors />} hint={`${servicesRes.data?.length ?? 0} total`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-wider text-ink-500 uppercase">Now serving</h2>
              <Link href="/shop/queue" className="text-sm font-semibold text-brand-700 hover:underline">
                Open queue
              </Link>
            </div>
            {serving ? (
              <div className="mt-3">
                <p className="text-5xl font-black tracking-tight text-ink-950 tabular">
                  {serving.token_prefix}-{serving.token_number}
                </p>
                <p className="mt-2 text-ink-700">
                  {serving.customer_name} · {serving.service_name}
                </p>
                <p className="text-sm text-ink-500">{serving.status === "called" ? "Called — waiting for the customer" : "Service in progress"}</p>
              </div>
            ) : (
              <div className="mt-3 text-ink-500">
                <p className="text-lg font-semibold text-ink-700">Nobody in the chair</p>
                <p className="text-sm">{waiting > 0 ? `${pluralize(waiting, "customer")} waiting — call the next one.` : "Your queue is empty."}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-bold tracking-wider text-ink-500 uppercase">Shop health</h2>
            <dl className="mt-3 divide-y divide-border text-sm">
              <Row icon={<Star className="size-4" />} label="Rating" value={`${Number(shop.rating).toFixed(1)} / 5 (${shop.review_count} reviews)`} />
              <Row icon={<Clock className="size-4" />} label="Opening hours" value={`${formatTime(shop.opening_time)} – ${formatTime(shop.closing_time)}`} />
              <Row icon={<ListOrdered className="size-4" />} label="Queues today" value={String(board?.queues.length ?? 0)} />
            </dl>
            {activeServices === 0 ? (
              <Alert tone="warning" className="mt-4">
                Add at least one service before customers can join your queue.{" "}
                <Link href="/shop/services" className="font-semibold underline">
                  Add services
                </Link>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="flex items-center gap-2 text-ink-500">
        <span className="text-ink-400" aria-hidden>
          {icon}
        </span>
        {label}
      </dt>
      <dd className="font-semibold text-ink-950">{value}</dd>
    </div>
  );
}
