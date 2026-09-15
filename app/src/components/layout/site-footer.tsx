import Link from "next/link";
import { Logo, APP_NAME } from "@/components/logo";

const columns = [
  {
    title: "Customers",
    links: [
      { href: "/dashboard", label: "Find a barber" },
      { href: "/my-queue", label: "Track my queue" },
      { href: "/register", label: "Create account" },
    ],
  },
  {
    title: "Barbers",
    links: [
      { href: "/shop/register", label: "Register your shop" },
      { href: "/shop/login", label: "Shop login" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-500">
            Live queues for local barber shops. Join from anywhere, get a token, walk in when it&apos;s your turn.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="text-sm font-semibold text-ink-950">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-ink-600 hover:text-ink-950">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-4 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <p>Wait times are estimates and may vary.</p>
        </div>
      </div>
    </footer>
  );
}
