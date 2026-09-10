import type { Metadata } from "next";
import { Mail, MapPin, MessageSquare, Phone, Store } from "lucide-react";
import { Cta, Section, SectionHeading } from "@/components/ui";
import { BRAND, appLink } from "@/lib/config";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with the ${BRAND.name} team about listing your barbershop, support or partnerships.`,
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  {
    icon: Store,
    title: "List your shop",
    text: "Register in about five minutes. Our team approves new listings within 24 hours.",
    action: { label: "Start registration", href: appLink.shopRegister, external: true },
  },
  {
    icon: MessageSquare,
    title: "Support",
    text: "Trouble with a token, a queue or your shop dashboard? Email us and we'll reply the same working day.",
    action: { label: `Email ${BRAND.email}`, href: `mailto:${BRAND.email}`, external: true },
  },
  {
    icon: Phone,
    title: "Talk to a human",
    text: "Monday to Saturday, 9am to 7pm IST.",
    action: { label: BRAND.phone, href: `tel:${BRAND.phone.replace(/\s/g, "")}`, external: true },
  },
];

export default function ContactPage() {
  return (
    <>
      <Section tone="muted" className="py-14 sm:py-16">
        <SectionHeading eyebrow="Contact" title="We'd like to hear from you" description="Shop owners, customers and anyone curious about how the queue works." />
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {CHANNELS.map((c) => (
            <div key={c.title} className="flex flex-col rounded-lg border border-border bg-surface p-6 shadow-card">
              <span className="flex size-11 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                <c.icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-ink-950">{c.title}</h2>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-600">{c.text}</p>
              <Cta href={c.action.href} variant="outline" className="mt-5 self-start" external={c.action.external}>
                {c.action.label}
              </Cta>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 rounded-xl border border-border bg-surface p-8 sm:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-ink-950">Where we are</h2>
            <ul className="mt-4 space-y-3 text-ink-700">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
                {BRAND.city}
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
                <a href={`mailto:${BRAND.email}`} className="hover:text-ink-950">
                  {BRAND.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
                <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`} className="hover:text-ink-950">
                  {BRAND.phone}
                </a>
              </li>
            </ul>
          </div>
          <div className="rounded-lg bg-surface-muted p-6">
            <h2 className="text-lg font-semibold text-ink-950">Already a customer?</h2>
            <p className="mt-1.5 text-sm text-ink-600">
              Your queue, tokens and notifications live in the app. Sign in to check where you are in line.
            </p>
            <Cta href={appLink.signIn} className="mt-5">
              Sign in to the app
            </Cta>
          </div>
        </div>
      </Section>
    </>
  );
}
