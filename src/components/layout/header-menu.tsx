"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, ListOrdered, LogOut, User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { SessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function HeaderMenu({ user, name, image }: { user: SessionUser; name?: string | null; image?: string | null }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const dashboardHref = user.role === "admin" ? "/admin/dashboard" : user.role === "shop_owner" ? "/shop/dashboard" : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full p-0.5 hover:bg-ink-100"
      >
        <Avatar name={name ?? user.email ?? user.phone ?? "You"} src={image} size="sm" />
        <ChevronDown className="size-4 text-ink-500" aria-hidden />
        <span className="sr-only">Account menu</span>
      </button>
      <div
        role="menu"
        className={cn(
          "absolute right-0 mt-2 w-52 origin-top-right rounded-lg border border-border bg-surface p-1 shadow-pop",
          open ? "animate-fade-up" : "hidden",
        )}
      >
        {dashboardHref ? (
          <MenuLink href={dashboardHref} icon={<LayoutDashboard />} onClick={() => setOpen(false)}>
            Dashboard
          </MenuLink>
        ) : null}
        <MenuLink href="/my-queue" icon={<ListOrdered />} onClick={() => setOpen(false)}>
          My queue
        </MenuLink>
        <MenuLink href="/profile" icon={<User />} onClick={() => setOpen(false)}>
          Profile
        </MenuLink>
        <button
          type="button"
          role="menuitem"
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-danger-700 hover:bg-danger-50 [&_svg]:size-4"
        >
          <LogOut aria-hidden /> Sign out
        </button>
      </div>
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-800 hover:bg-ink-100 [&_svg]:size-4 [&_svg]:text-ink-500"
    >
      {icon}
      {children}
    </Link>
  );
}
