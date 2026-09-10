/** Where the product app lives. Every call to action on this site points there. */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Canonical URL of this marketing site. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

export const BRAND = {
  name: "QueueCut",
  tagline: "No more waiting in line.",
  description:
    "Find barber shops near you, see live wait times, join the queue from your phone and walk in exactly when it's your turn.",
  email: "hello@queuecut.in",
  phone: "+91 44 4000 1234",
  city: "Chennai, India",
} as const;

export const NAV = [
  { href: "/features", label: "Features" },
  { href: "/for-barbers", label: "For barbers" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

/** Deep links into the product app. */
export const appLink = {
  findBarber: `${APP_URL}/shops`,
  signIn: `${APP_URL}/login`,
  register: `${APP_URL}/register`,
  shopRegister: `${APP_URL}/shop/register`,
  shopLogin: `${APP_URL}/shop/login`,
} as const;
