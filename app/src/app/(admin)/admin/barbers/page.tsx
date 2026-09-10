import type { Metadata } from "next";
import { Scissors } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/admin/filter-bar";
import { listBarbersForAdmin } from "@/lib/admin/queries";
import { BarbersTable, type AdminBarberRow } from "./barbers-table";

export const metadata: Metadata = { title: "Barbers", robots: { index: false } };

export default async function AdminBarbersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const barbers = (await listBarbersForAdmin(q)) as unknown as AdminBarberRow[];

  return (
    <div>
      <FilterBar search={q} searchPlaceholder="Search barbers by name" />
      <BarbersTable barbers={barbers} empty={<EmptyState icon={<Scissors />} title="No barbers found" description={q ? "Try a different search term." : "Barbers appear here once shop owners add them."} />} />
    </div>
  );
}
