import type { Metadata } from "next";
import { DailyBars } from "@/components/admin/daily-bars";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
import { getAdminStats, getDailyReport } from "@/lib/admin/queries";
import { formatDate } from "@/lib/utils";
import type { DailyReportRow } from "@/types/domain";

export const metadata: Metadata = { title: "Reports", robots: { index: false } };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days } = await searchParams;
  const window = Math.min(90, Math.max(7, Number(days) || 30));
  const [stats, rows] = await Promise.all([getAdminStats(), getDailyReport(window)]);

  const totals = rows.reduce(
    (acc, r) => ({
      joined: acc.joined + r.joined,
      completed: acc.completed + r.completed,
      cancelled: acc.cancelled + r.cancelled,
      no_show: acc.no_show + r.no_show,
      new_users: acc.new_users + r.new_users,
    }),
    { joined: 0, completed: 0, cancelled: 0, no_show: 0, new_users: 0 },
  );
  const completionRate = totals.joined > 0 ? Math.round((totals.completed / totals.joined) * 100) : 0;
  const noShowRate = totals.joined > 0 ? Math.round((totals.no_show / totals.joined) * 100) : 0;

  const columns: Column<DailyReportRow>[] = [
    { key: "date", header: "Date", render: (r) => <span className="whitespace-nowrap">{formatDate(r.date)}</span> },
    { key: "joined", header: "Joined", align: "right", render: (r) => <span className="tabular">{r.joined}</span> },
    { key: "completed", header: "Completed", align: "right", render: (r) => <span className="tabular text-success-700">{r.completed}</span> },
    { key: "cancelled", header: "Cancelled", align: "right", hideOnMobile: true, render: (r) => <span className="tabular text-ink-600">{r.cancelled}</span> },
    { key: "no_show", header: "No-show", align: "right", hideOnMobile: true, render: (r) => <span className="tabular text-danger-700">{r.no_show}</span> },
    { key: "new_users", header: "New users", align: "right", hideOnMobile: true, render: (r) => <span className="tabular">{r.new_users}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label={`Queue joins (${window}d)`} value={totals.joined} tone="brand" />
        <StatsCard label="Completion rate" value={`${completionRate}%`} tone="success" hint={`${totals.completed} completed`} />
        <StatsCard label="No-show rate" value={`${noShowRate}%`} tone={noShowRate > 15 ? "danger" : "default"} hint={`${totals.no_show} no-shows`} />
        <StatsCard label="New users" value={totals.new_users} hint={`${stats.total_users} total`} />
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-bold tracking-wider text-ink-500 uppercase">Daily activity</h2>
          <DailyBars rows={rows} className="mt-4" />
        </CardContent>
      </Card>

      <DataTable caption={`Daily queue activity for the last ${window} days`} columns={columns} rows={[...rows].reverse()} rowKey={(r) => r.date} />
    </div>
  );
}
