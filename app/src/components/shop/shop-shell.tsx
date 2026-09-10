"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListOrdered, Scissors, Settings, Users } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/layout/dashboard-shell";
import { ShopStatusControls } from "./shop-status-controls";
import type { ShopStatus } from "@/types/domain";

const NAV: NavItem[] = [
  { href: "/shop/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/shop/queue", label: "Today's queue", icon: ListOrdered },
  { href: "/shop/barbers", label: "Barbers", icon: Users },
  { href: "/shop/services", label: "Services", icon: Scissors },
  { href: "/shop/settings", label: "Shop settings", icon: Settings },
];

const TITLES: Record<string, string> = {
  "/shop/dashboard": "Dashboard",
  "/shop/queue": "Today's queue",
  "/shop/barbers": "Barbers",
  "/shop/services": "Services",
  "/shop/settings": "Shop settings",
};

interface Props {
  user: { name: string | null; image?: string | null; roleLabel: string };
  shop: { id: string; name: string; status: ShopStatus; is_open: boolean; queue_paused: boolean };
  children: React.ReactNode;
}

export function ShopShell({ user, shop, children }: Props) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? shop.name;

  return (
    <DashboardShell
      nav={NAV}
      title={title}
      subtitle={shop.name}
      user={user}
      headerSlot={shop.status === "approved" ? <ShopStatusControls shopId={shop.id} isOpen={shop.is_open} queuePaused={shop.queue_paused} compact /> : <PendingChip status={shop.status} />}
    >
      {children}
    </DashboardShell>
  );
}

function PendingChip({ status }: { status: ShopStatus }) {
  const map = {
    pending: { text: "Awaiting approval", cls: "bg-warning-50 text-warning-700 border-amber-200" },
    rejected: { text: "Registration rejected", cls: "bg-danger-50 text-danger-700 border-red-200" },
    suspended: { text: "Suspended", cls: "bg-danger-50 text-danger-700 border-red-200" },
    approved: { text: "Approved", cls: "bg-success-50 text-success-700 border-green-200" },
  }[status];
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${map.cls}`}>{map.text}</span>;
}
