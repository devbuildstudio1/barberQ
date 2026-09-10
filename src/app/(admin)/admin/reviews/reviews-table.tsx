"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Rating } from "@/components/ui/rating";
import { useAction } from "@/hooks/use-action";
import { deleteReviewAction, setReviewHiddenAction } from "@/lib/admin/actions";
import { formatDate } from "@/lib/utils";
import type { Review } from "@/types/domain";

export interface AdminReviewRow extends Review {
  shop: { id: string; name: string } | null;
  user: { id: string; name: string | null } | null;
}

export function ReviewsTable({ reviews, empty }: { reviews: AdminReviewRow[]; empty: React.ReactNode }) {
  const router = useRouter();
  const [target, setTarget] = React.useState<AdminReviewRow | null>(null);

  const toggle = useAction(setReviewHiddenAction, { successMessage: "Review updated", onSuccess: () => router.refresh() });
  const remove = useAction(deleteReviewAction, {
    successMessage: "Review deleted",
    onSuccess: () => {
      setTarget(null);
      router.refresh();
    },
  });

  const columns: Column<AdminReviewRow>[] = [
    {
      key: "review",
      header: "Review",
      render: (r) => (
        <div className="max-w-md">
          <Rating value={r.rating} showValue={false} />
          <p className="mt-1 text-ink-800">{r.review ?? <span className="text-ink-400">No written review</span>}</p>
          <p className="mt-1 text-xs text-ink-500">
            {r.user?.name ?? "Customer"} · {formatDate(r.created_at)}
          </p>
        </div>
      ),
    },
    {
      key: "shop",
      header: "Shop",
      render: (r) =>
        r.shop ? (
          <Link href={`/shops/${r.shop.id}`} target="_blank" className="text-ink-900 hover:underline">
            {r.shop.name}
          </Link>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    { key: "visibility", header: "Visibility", render: (r) => <Badge variant={r.is_hidden ? "danger" : "success"} dot>{r.is_hidden ? "Hidden" : "Visible"}</Badge> },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="xs" variant="outline" loading={toggle.pending} onClick={() => toggle.run({ review_id: r.id, hidden: !r.is_hidden })}>
            {r.is_hidden ? <Eye /> : <EyeOff />}
            {r.is_hidden ? "Show" : "Hide"}
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Delete review" onClick={() => setTarget(r)}>
            <Trash2 className="text-danger-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable caption="Customer reviews" columns={columns} rows={reviews} rowKey={(r) => r.id} empty={empty} />
      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        loading={remove.pending}
        destructive
        title="Delete this review?"
        description="This permanently removes the review and recalculates the shop's rating. Hiding it is usually enough."
        confirmLabel="Delete review"
        onConfirm={async () => {
          if (target) await remove.run({ review_id: target.id });
        }}
      />
    </>
  );
}
