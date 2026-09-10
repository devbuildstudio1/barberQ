import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, ListOrdered, MessageSquare, Scissors, Store, Users } from "lucide-react";
import { DailyBars } from "@/components/admin/daily-bars";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
import { getAdminStats, getDailyReport, listShopsForAdmin } from "@/lib/admin/queries";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin dashboard", robots: { index: false } };

export default async function AdminDashboardPage() {
  const [stats, report, pending] = await Promise.all([getAdminStats(), getDailyReport(14), listShopsForAdmin("pending")]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Users" value={stats.total_users.toLocaleString("en-IN")} icon={<Users />} tone="brand" hint={`${stats.total_customers} customers`} />
        <StatsCard label="Shops" value={stats.total_shops.toLocaleString("en-IN")} icon={<Store />} hint={`${stats.approved_shops} approved`} />
        <StatsCard label="Active queues" value={stats.active_queues.toLocaleString("en-IN")} icon={<ListOrdered />} tone="warning" hint={`${stats.waiting_now} people waiting`} />
        <StatsCard label="Completed services" value={stats.completed_services.toLocaleString("en-IN")} icon={<CheckCircle2 />} tone="success" hint={`${stats.completed_today} today`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Pending approvals" value={stats.pending_shops} icon={<Clock />} tone={stats.pending_shops > 0 ? "warning" : "default"} />
        <StatsCard label="Barbers" value={stats.total_barbers} icon={<Scissors />} />
        <StatsCard label="Reviews" value={stats.total_reviews} icon={<MessageSquare />} />
        <StatsCard label="Approved shops" value={stats.approved_shops} icon={<Store />} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-bold tracking-wider text-ink-500 uppercase">Queue activity — last 14 days</h2>
            <DailyBars rows={report} className="mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-wider text-ink-500 uppercase">Awaiting approval</h2>
              <Link href="/admin/shops?status=pending" className="text-sm font-semibold text-brand-700 hover:underline">
                Review all
              </Link>
            </div>
            {pending.length === 0 ? (
              <p className="mt-4 text-sm text-ink-500">Nothing waiting. Every shop has been reviewed.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {pending.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink-950">{s.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        {s.owner?.name ?? "Unknown owner"} · {formatDate(s.created_at)}
                      </p>
                    </div>
                    <Link href="/admin/shops?status=pending" className={buttonVariants({ size: "xs", variant: "outline" })}>
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
