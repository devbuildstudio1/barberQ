"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { setBarberStatusAction } from "@/lib/admin/actions";
import type { Barber } from "@/types/domain";

export interface AdminBarberRow extends Barber {
  shop: { id: string; name: string; status: string } | null;
}

export function BarbersTable({ barbers, empty }: { barbers: AdminBarberRow[]; empty: React.ReactNode }) {
  const router = useRouter();
  const toggle = useAction(setBarberStatusAction, { successMessage: "Barber updated", onSuccess: () => router.refresh() });

  const columns: Column<AdminBarberRow>[] = [
    {
      key: "barber",
      header: "Barber",
      render: (b) => (
        <div className="flex items-center gap-3">
          <Avatar src={b.image} name={b.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-950">{b.name}</p>
            <p className="truncate text-xs text-ink-500">
              {b.experience_years > 0 ? `${b.experience_years} yrs` : "New"}
              {b.specialization ? ` · ${b.specialization}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "shop",
      header: "Shop",
      render: (b) =>
        b.shop ? (
          <Link href={`/shops/${b.shop.id}`} target="_blank" className="text-ink-900 hover:underline">
            {b.shop.name}
          </Link>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    { key: "status", header: "Status", render: (b) => <Badge variant={b.status === "active" ? "success" : "neutral"} dot>{b.status}</Badge> },
    {
      key: "availability",
      header: "Availability",
      hideOnMobile: true,
      render: (b) => <span className="capitalize text-ink-600">{b.availability.replace("_", " ")}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (b) => (
        <Button
          size="xs"
          variant={b.status === "active" ? "danger-soft" : "outline"}
          loading={toggle.pending}
          onClick={() => toggle.run({ barber_id: b.id, status: b.status === "active" ? "inactive" : "active" })}
        >
          {b.status === "active" ? "Deactivate" : "Reactivate"}
        </Button>
      ),
    },
  ];

  return <DataTable caption="Barbers across all shops" columns={columns} rows={barbers} rowKey={(b) => b.id} empty={empty} />;
}
