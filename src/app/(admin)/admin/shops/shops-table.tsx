"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Ban, RotateCcw, X } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { setShopStatusAction } from "@/lib/admin/actions";
import type { AdminShopRow } from "@/lib/admin/queries";
import { formatDate } from "@/lib/utils";
import type { ShopStatus } from "@/types/domain";

const STATUS_VARIANT: Record<ShopStatus, "warning" | "success" | "danger" | "neutral"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  suspended: "danger",
};

type PendingAction = { shop: AdminShopRow; status: ShopStatus; needsReason: boolean };

export function ShopsTable({ shops, empty }: { shops: AdminShopRow[]; empty: React.ReactNode }) {
  const router = useRouter();
  const [action, setAction] = React.useState<PendingAction | null>(null);
  const [reason, setReason] = React.useState("");

  const setStatus = useAction(setShopStatusAction, {
    successMessage: "Shop updated",
    onSuccess: () => {
      setAction(null);
      setReason("");
      router.refresh();
    },
  });

  const run = (shop: AdminShopRow, status: ShopStatus) => {
    const needsReason = status === "rejected" || status === "suspended";
    setAction({ shop, status, needsReason });
    setReason("");
  };

  const columns: Column<AdminShopRow>[] = [
    {
      key: "shop",
      header: "Shop",
      render: (s) => (
        <div className="min-w-0">
          <Link href={`/shops/${s.id}`} target="_blank" className="inline-flex items-center gap-1 font-semibold text-ink-950 hover:underline">
            {s.name} <ExternalLink className="size-3 text-ink-400" aria-hidden />
          </Link>
          <p className="text-xs text-ink-500">
            {Number(s.rating).toFixed(1)}★ · {s.review_count} reviews
          </p>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      hideOnMobile: true,
      render: (s) => (
        <div className="min-w-0">
          <p className="truncate text-ink-900">{s.owner?.name ?? "—"}</p>
          <p className="truncate text-xs text-ink-500">{s.owner?.phone ?? s.owner?.email ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      hideOnMobile: true,
      render: (s) => (
        <div className="max-w-56">
          <p className="truncate text-ink-700">{s.city ?? "—"}</p>
          <p className="truncate text-xs text-ink-500">{s.address}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (s) => (
        <div className="space-y-1">
          <Badge variant={STATUS_VARIANT[s.status]} dot>
            {s.status}
          </Badge>
          {s.rejection_reason ? <p className="max-w-40 text-xs text-ink-500">{s.rejection_reason}</p> : null}
        </div>
      ),
    },
    { key: "submitted", header: "Submitted", hideOnMobile: true, render: (s) => <span className="whitespace-nowrap text-ink-600">{formatDate(s.created_at)}</span> },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (s) => (
        <div className="flex justify-end gap-1">
          {s.status === "pending" ? (
            <>
              <Button size="xs" variant="success" onClick={() => run(s, "approved")}>
                <Check /> Approve
              </Button>
              <Button size="xs" variant="danger-soft" onClick={() => run(s, "rejected")}>
                <X /> Reject
              </Button>
            </>
          ) : s.status === "approved" ? (
            <Button size="xs" variant="danger-soft" onClick={() => run(s, "suspended")}>
              <Ban /> Suspend
            </Button>
          ) : (
            <Button size="xs" variant="outline" onClick={() => run(s, "approved")}>
              <RotateCcw /> Restore
            </Button>
          )}
        </div>
      ),
    },
  ];

  const verb = action?.status === "approved" ? "Approve" : action?.status === "rejected" ? "Reject" : "Suspend";

  return (
    <>
      <DataTable caption="Shops awaiting review and their status" columns={columns} rows={shops} rowKey={(s) => s.id} empty={empty} />

      <Dialog
        open={!!action}
        onClose={() => setAction(null)}
        locked={setStatus.pending}
        title={`${verb} ${action?.shop.name ?? "shop"}?`}
        description={
          action?.status === "approved"
            ? "The shop becomes publicly discoverable and the owner is notified."
            : action?.status === "rejected"
              ? "The owner is notified and the shop stays hidden from customers."
              : "The shop is hidden and closed immediately. The owner is notified."
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setAction(null)} disabled={setStatus.pending}>
              Cancel
            </Button>
            <Button
              variant={action?.status === "approved" ? "primary" : "danger"}
              loading={setStatus.pending}
              onClick={() => {
                if (!action) return;
                void setStatus.run({ shop_id: action.shop.id, status: action.status, reason: reason.trim() || undefined });
              }}
            >
              {verb}
            </Button>
          </>
        }
      >
        {action?.needsReason ? (
          <div>
            <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-ink-800">
              Reason for the owner
            </label>
            <Textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Address could not be verified. Please resubmit with a valid shop address."
            />
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
