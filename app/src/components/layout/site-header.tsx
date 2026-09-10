import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/profile";
import { NotificationBell } from "./notification-bell";
import { HeaderMenu } from "./header-menu";

const NAV = [
  { href: "/shops", label: "Find a barber" },
  { href: "/my-queue", label: "My queue" },
  { href: "/shop/register", label: "For barbers" },
];

export async function SiteHeader() {
  const profile = await getCurrentProfile();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <NotificationBell userId={profile.id} />
              <HeaderMenu
                user={{ id: profile.id, role: profile.role, email: profile.email, phone: profile.phone }}
                name={profile.name}
                image={profile.profile_image}
              />
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-medium text-ink-700 hover:text-ink-950 sm:block">
                Sign in
              </Link>
              <Link href="/shops" className={buttonVariants({ size: "sm" })}>
                Find a Barber
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
