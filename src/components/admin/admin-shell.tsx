"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, ListOrdered, MessageSquare, Scissors, Store, Users } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/layout/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/shops", label: "Shops", icon: Store },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/barbers", label: "Barbers", icon: Scissors },
  { href: "/admin/queues", label: "Queues", icon: ListOrdered },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
];

const TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/shops": "Shops",
  "/admin/users": "Users",
  "/admin/barbers": "Barbers",
  "/admin/queues": "Queues",
  "/admin/reviews": "Reviews",
  "/admin/reports": "Reports",
};

export function AdminShell({ user, children }: { user: { name: string | null; image?: string | null; roleLabel: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <DashboardShell nav={NAV} title={TITLES[pathname] ?? "Admin"} subtitle="Admin console" user={user}>
      {children}
    </DashboardShell>
  );
}
