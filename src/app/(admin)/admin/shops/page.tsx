import type { Metadata } from "next";
import { Store } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/admin/filter-bar";
import { listShopsForAdmin } from "@/lib/admin/queries";
import type { ShopStatus } from "@/types/domain";
import { ShopsTable } from "./shops-table";

export const metadata: Metadata = { title: "Shops", robots: { index: false } };

const STATUSES: ShopStatus[] = ["pending", "approved", "rejected", "suspended"];

export default async function AdminShopsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  const validStatus = STATUSES.includes(status as ShopStatus) ? (status as ShopStatus) : undefined;
  const shops = await listShopsForAdmin(validStatus, q);

  return (
    <div>
      <FilterBar
        search={q}
        searchPlaceholder="Search shops by name"
        filterValue={validStatus}
        filters={[{ value: "", label: "All" }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
      />
      <ShopsTable
        shops={shops}
        empty={
          <EmptyState
            icon={<Store />}
            title={validStatus === "pending" ? "No shops awaiting approval" : "No shops found"}
            description={q ? "Try a different search term." : "Shops appear here as owners register them."}
          />
        }
      />
    </div>
  );
}
