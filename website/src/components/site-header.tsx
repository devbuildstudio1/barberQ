"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Scissors, X } from "lucide-react";
import { BRAND, NAV, appLink } from "@/lib/config";
import { buttonClass } from "./ui";
import { cn } from "@/lib/cn";

export function SiteHeader() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close the mobile menu on navigation, without an effect.
  const [prevPath, setPrevPath] = React.useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-2 font-bold tracking-tight" aria-label={`${BRAND.name} home`}>
          <span className="flex size-8 items-center justify-center rounded-md bg-brand-600 text-white">
            <Scissors className="size-4" aria-hidden />
          </span>
          <span className="text-lg text-ink-950">{BRAND.name}</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href ? "text-ink-950" : "text-ink-600 hover:bg-ink-100 hover:text-ink-950",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a href={appLink.signIn} className="px-3 py-2 text-sm font-medium text-ink-700 hover:text-ink-950">
            Sign in
          </a>
          <a href={appLink.findBarber} className={buttonClass("primary", "sm")}>
            Find a Barber
          </a>
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-ink-700 hover:bg-ink-100 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div id="mobile-nav" hidden={!open} className="border-t border-border bg-surface md:hidden">
        <nav aria-label="Mobile" className="container-page flex flex-col py-3">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-2 py-2.5 text-base font-medium text-ink-800 hover:bg-ink-100">
              {item.label}
            </Link>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            <a href={appLink.signIn} className={buttonClass("outline", "md", "w-full")}>
              Sign in
            </a>
            <a href={appLink.findBarber} className={buttonClass("primary", "md", "w-full")}>
              Find a Barber
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
