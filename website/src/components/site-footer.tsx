import Link from "next/link";
import { Mail, MapPin, Phone, Scissors } from "lucide-react";
import { BRAND, appLink } from "@/lib/config";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features", external: false },
      { href: "/for-barbers", label: "For barbers", external: false },
      { href: appLink.findBarber, label: "Find a barber", external: true },
      { href: appLink.register, label: "Create account", external: true },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About", external: false },
      { href: "/contact", label: "Contact", external: false },
      { href: "/privacy", label: "Privacy", external: false },
      { href: "/terms", label: "Terms", external: false },
    ],
  },
  {
    title: "Shop owners",
    links: [
      { href: appLink.shopRegister, label: "List your shop", external: true },
      { href: appLink.shopLogin, label: "Shop login", external: true },
      { href: "/for-barbers#pricing", label: "Pricing", external: false },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-bold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-md bg-brand-600 text-white">
              <Scissors className="size-4" aria-hidden />
            </span>
            <span className="text-lg text-ink-950">{BRAND.name}</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-ink-500">{BRAND.description}</p>
          <ul className="mt-4 space-y-2 text-sm text-ink-600">
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-ink-400" aria-hidden />
              <a href={`mailto:${BRAND.email}`} className="hover:text-ink-950">
                {BRAND.email}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-ink-400" aria-hidden />
              <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`} className="hover:text-ink-950">
                {BRAND.phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-ink-400" aria-hidden />
              {BRAND.city}
            </li>
          </ul>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-sm font-semibold text-ink-950">{col.title}</h2>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.href} className="text-sm text-ink-600 hover:text-ink-950">
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className="text-sm text-ink-600 hover:text-ink-950">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-4 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
          <p>Wait times shown in the app are estimates and may vary.</p>
        </div>
      </div>
    </footer>
  );
}
