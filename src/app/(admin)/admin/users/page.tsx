import type { Metadata } from "next";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/admin/filter-bar";
import { listUsersForAdmin } from "@/lib/admin/queries";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "Users", robots: { index: false } };

const ROLES = ["customer", "shop_owner", "admin"] as const;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const { role, q } = await searchParams;
  const validRole = (ROLES as readonly string[]).includes(role ?? "") ? (role as (typeof ROLES)[number]) : undefined;
  const users = await listUsersForAdmin(validRole, q);

  return (
    <div>
      <FilterBar
        search={q}
        searchPlaceholder="Search by name, phone or email"
        filterKey="role"
        filterValue={validRole}
        filters={[{ value: "", label: "All" }, ...ROLES.map((r) => ({ value: r, label: r.replace("_", " ") }))]}
      />
      <UsersTable users={users} empty={<EmptyState icon={<Users />} title="No users found" description={q ? "Try a different search term." : "Users appear here as they sign up."} />} />
    </div>
  );
}
