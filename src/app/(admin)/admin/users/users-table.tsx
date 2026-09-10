"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useAction } from "@/hooks/use-action";
import { setUserActiveAction } from "@/lib/admin/actions";
import { formatDate } from "@/lib/utils";
import type { User } from "@/types/domain";

export function UsersTable({ users, empty }: { users: User[]; empty: React.ReactNode }) {
  const router = useRouter();
  const [target, setTarget] = React.useState<User | null>(null);

  const toggle = useAction(setUserActiveAction, {
    successMessage: "Account updated",
    onSuccess: () => {
      setTarget(null);
      router.refresh();
    },
  });

  const columns: Column<User>[] = [
    {
      key: "user",
      header: "User",
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar src={u.profile_image} name={u.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-950">{u.name ?? "Unnamed"}</p>
            <p className="truncate text-xs text-ink-500">{u.phone ?? u.email ?? "—"}</p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", render: (u) => <Badge variant={u.role === "admin" ? "dark" : u.role === "shop_owner" ? "brand" : "neutral"}>{u.role.replace("_", " ")}</Badge> },
    { key: "status", header: "Status", render: (u) => <Badge variant={u.is_active ? "success" : "danger"} dot>{u.is_active ? "Active" : "Deactivated"}</Badge> },
    { key: "joined", header: "Joined", hideOnMobile: true, render: (u) => <span className="whitespace-nowrap text-ink-600">{formatDate(u.created_at)}</span> },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (u) => (
        <Button size="xs" variant={u.is_active ? "danger-soft" : "outline"} onClick={() => setTarget(u)}>
          {u.is_active ? "Deactivate" : "Reactivate"}
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable caption="Platform users" columns={columns} rows={users} rowKey={(u) => u.id} empty={empty} />
      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        loading={toggle.pending}
        destructive={target?.is_active ?? false}
        title={target?.is_active ? `Deactivate ${target?.name ?? "this user"}?` : `Reactivate ${target?.name ?? "this user"}?`}
        description={
          target?.is_active
            ? "They won't be able to join queues or manage shops until reactivated. Existing data is kept."
            : "They regain access to the platform immediately."
        }
        confirmLabel={target?.is_active ? "Deactivate" : "Reactivate"}
        onConfirm={async () => {
          if (target) await toggle.run({ user_id: target.id, is_active: !target.is_active });
        }}
      />
    </>
  );
}
