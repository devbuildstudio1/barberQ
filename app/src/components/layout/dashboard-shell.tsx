"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: React.ReactNode;
}

interface DashboardShellProps {
  nav: NavItem[];
  title: string;
  subtitle?: string;
  user: { name: string | null; image?: string | null; roleLabel: string };
  children: React.ReactNode;
  headerSlot?: React.ReactNode;
}

/**
 * Sidebar layout for shop owner and admin dashboards. Sidebar on desktop,
 * slide-over drawer on mobile/tablet.
 */
export function DashboardShell({ nav, title, subtitle, user, children, headerSlot }: DashboardShellProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Close the drawer on navigation (state adjustment during render, no effect needed).
  const [prevPath, setPrevPath] = React.useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-4">
        <Logo light href={nav[0]?.href ?? "/"} />
        <button
          type="button"
          className="rounded-md p-2 text-white/70 hover:bg-white/10 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="px-4 pb-4">
        <p className="text-xs font-semibold tracking-wider text-white/50 uppercase">{subtitle ?? title}</p>
      </div>
      <nav aria-label="Dashboard" className="flex-1 space-y-0.5 px-2">
        {nav.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/8 hover:text-white",
              )}
            >
              <Icon className="size-[18px]" aria-hidden />
              <span className="flex-1">{label}</span>
              {badge}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-1">
          <Avatar name={user.name ?? "?"} src={user.image} size="sm" className="bg-white/15 text-white" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name ?? "Account"}</p>
            <p className="truncate text-xs text-white/50">{user.roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md p-2 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-surface-muted">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-ink-950 lg:block" aria-label="Sidebar">
        <div className="sticky top-0 h-dvh">{sidebar}</div>
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-ink-950/60" onClick={() => setOpen(false)} aria-label="Close menu" />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-ink-950 shadow-pop animate-fade-up">{sidebar}</aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <h1 className="truncate text-lg font-semibold text-ink-950">{title}</h1>
          <div className="ml-auto flex items-center gap-2">{headerSlot}</div>
        </header>
        <main id="main" className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
