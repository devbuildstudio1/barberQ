import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/admin/filter-bar";
import { listReviewsForAdmin } from "@/lib/admin/queries";
import { ReviewsTable, type AdminReviewRow } from "./reviews-table";

export const metadata: Metadata = { title: "Reviews", robots: { index: false } };

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ visibility?: string }> }) {
  const { visibility } = await searchParams;
  const hidden = visibility === "hidden" ? true : visibility === "visible" ? false : undefined;
  const reviews = (await listReviewsForAdmin(hidden)) as unknown as AdminReviewRow[];

  return (
    <div>
      <FilterBar
        filterKey="visibility"
        filterValue={visibility}
        filters={[
          { value: "", label: "All" },
          { value: "visible", label: "Visible" },
          { value: "hidden", label: "Hidden" },
        ]}
        searchPlaceholder="Search reviews"
      />
      <ReviewsTable reviews={reviews} empty={<EmptyState icon={<MessageSquare />} title="No reviews yet" description="Reviews appear here after customers complete a visit." />} />
    </div>
  );
}
