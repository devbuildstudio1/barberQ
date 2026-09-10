import type { Metadata } from "next";
import Link from "next/link";
import { ListOrdered } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatsCard } from "@/components/ui/stats-card";
import { listActiveQueuesForAdmin } from "@/lib/admin/queries";
import { formatMinutes } from "@/lib/utils";

export const metadata: Metadata = { title: "Queues", robots: { index: false } };

interface QueueRow {
  id: string;
  token_prefix: string;
  status: string;
  current_token: number | null;
  waiting_count: number;
  last_token_number: number;
  shop: { id: string; name: string; city: string | null; is_open: boolean; queue_paused: boolean } | null;
  barber: { id: string; name: string } | null;
}

export default async function AdminQueuesPage() {
  const queues = (await listActiveQueuesForAdmin()) as unknown as QueueRow[];
  const totalWaiting = queues.reduce((n, q) => n + q.waiting_count, 0);
  const active = queues.filter((q) => q.waiting_count > 0).length;

  const columns: Column<QueueRow>[] = [
    {
      key: "shop",
      header: "Shop",
      render: (q) =>
        q.shop ? (
          <div className="min-w-0">
            <Link href={`/shops/${q.shop.id}`} target="_blank" className="font-semibold text-ink-950 hover:underline">
              {q.shop.name}
            </Link>
            <p className="text-xs text-ink-500">{q.shop.city ?? "—"}</p>
          </div>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    { key: "queue", header: "Queue", render: (q) => <span className="text-ink-700">{q.barber?.name ?? "Any barber"}</span> },
    {
      key: "state",
      header: "State",
      render: (q) => (
        <Badge variant={!q.shop?.is_open ? "neutral" : q.shop.queue_paused ? "warning" : "success"} dot>
          {!q.shop?.is_open ? "Closed" : q.shop.queue_paused ? "Paused" : "Active"}
        </Badge>
      ),
    },
    { key: "waiting", header: "Waiting", align: "right", render: (q) => <span className="font-semibold tabular">{q.waiting_count}</span> },
    {
      key: "current",
      header: "Current",
      align: "right",
      hideOnMobile: true,
      render: (q) => <span className="tabular text-ink-700">{q.current_token != null ? `${q.token_prefix}-${q.current_token}` : "—"}</span>,
    },
    {
      key: "issued",
      header: "Issued today",
      align: "right",
      hideOnMobile: true,
      render: (q) => <span className="tabular text-ink-700">{q.last_token_number}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard label="Queues today" value={queues.length} icon={<ListOrdered />} />
        <StatsCard label="With customers waiting" value={active} tone="warning" />
        <StatsCard label="People waiting now" value={totalWaiting} tone="brand" hint={totalWaiting > 0 ? `~${formatMinutes(totalWaiting * 20)} of work` : undefined} />
      </div>
      <DataTable
        caption="Today's queues across all shops"
        columns={columns}
        rows={queues}
        rowKey={(q) => q.id}
        empty={<EmptyState icon={<ListOrdered />} title="No queues today" description="Queues appear here once shops open for the day." />}
      />
    </div>
  );
}
