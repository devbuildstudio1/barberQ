import type { Metadata } from "next";
import Link from "next/link";
import { ListOrdered } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth/guards";
import { getMyActiveQueueEntry, getMyQueueHistory, getMyReviewableVisits } from "@/lib/queue/queries";
import { formatINR, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LiveQueue } from "./live-queue";
import { ReviewPrompt } from "./review-prompt";

export const metadata: Metadata = { title: "My queue", robots: { index: false } };

const statusVariant = { completed: "success", cancelled: "neutral", no_show: "danger" } as const;

export default async function MyQueuePage() {
  const profile = await requireProfile("/login", "/my-queue");
  const [active, reviewable, history] = await Promise.all([getMyActiveQueueEntry(), getMyReviewableVisits(), getMyQueueHistory(8)]);

  return (
    <div className="container-page max-w-2xl py-6 sm:py-10">
      <LiveQueue initial={active} userId={profile.id} />

      {reviewable.length > 0 ? (
        <section className="mt-8" aria-labelledby="review-h">
          <h2 id="review-h" className="text-lg font-bold text-ink-950">
            How was your last visit?
          </h2>
          <div className="mt-3 space-y-3">
            {reviewable.slice(0, 2).map((v) => (
              <ReviewPrompt key={v.queue_entry_id} visit={v} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10" aria-labelledby="history-h">
        <h2 id="history-h" className="text-lg font-bold text-ink-950">
          Recent visits
        </h2>
        {history.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-border-strong p-8 text-center">
            <ListOrdered className="mx-auto size-6 text-ink-300" aria-hidden />
            <p className="mt-2 text-sm text-ink-500">No visits yet. Your completed and cancelled tokens will show here.</p>
            <Link href="/dashboard" className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-4`}>
              Find a barber
            </Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 p-3">
                <span className="w-14 shrink-0 text-center text-sm font-bold text-ink-700 tabular">
                  {h.queue?.token_prefix ?? "A"}-{h.token_number}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-950">{h.shop?.name}</p>
                  <p className="truncate text-xs text-ink-500">
                    {h.service?.name} · {formatINR(Number(h.service?.price ?? 0))} · {formatDate(h.joined_at)}
                  </p>
                </div>
                <Badge variant={statusVariant[h.status as keyof typeof statusVariant] ?? "neutral"} size="sm">
                  {h.status.replace("_", " ")}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
