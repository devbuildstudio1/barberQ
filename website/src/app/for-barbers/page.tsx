import type { Metadata } from "next";
import { ArrowRight, Check, Clock, IndianRupee, Store, TrendingUp, Users } from "lucide-react";
import { Cta, Section, SectionHeading } from "@/components/ui";
import { appLink } from "@/lib/config";
import { approx, getPlatformStats } from "@/lib/data";

export const metadata: Metadata = {
  title: "For barbers",
  description:
    "List your barbershop free, run a live digital queue and fill quiet hours with walk-ins who know exactly when to arrive.",
  alternates: { canonical: "/for-barbers" },
};

const STEPS = [
  { n: 1, title: "Register your shop", text: "Name, address, hours and a photo. It takes about five minutes." },
  { n: 2, title: "We review it", text: "Our team approves listings within 24 hours to keep the directory trustworthy." },
  { n: 3, title: "Add barbers and services", text: "Set prices and realistic durations. Durations drive the wait estimates customers see." },
  { n: 4, title: "Open your queue", text: "Customers start joining. Call next, start, complete. That's the whole loop." },
];

const BENEFITS = [
  { icon: TrendingUp, title: "Fill the quiet hours", text: "Customers nearby can see when your chairs are free and come in before they'd otherwise bother." },
  { icon: Users, title: "Fewer no-shows", text: "People get pinged at two ahead, one ahead and when they're next, so they arrive on time." },
  { icon: Clock, title: "Calmer shop floor", text: "Nobody crowds the door asking how long. The token order is visible and settled." },
  { icon: Store, title: "A listing that works", text: "Rating, prices, photos and live wait time, in front of customers searching in your area." },
];

const FAQ = [
  { q: "What does it cost?", a: "Listing your shop and running the queue is free during the MVP. We'll give existing shops plenty of notice before any paid plan appears, and there'll always be a free tier for single-chair shops." },
  { q: "Do I need new hardware?", a: "No. The dashboard runs in a browser on the phone, tablet or laptop you already have. A tablet at the counter works well." },
  { q: "What if a customer doesn't show up?", a: "Mark them as a no-show and the queue moves on immediately. They're notified and can rejoin at the back of the line." },
  { q: "Can each barber have their own queue?", a: "Yes. Customers can join a specific barber's line or the shared walk-in line, and each line gets its own token prefix." },
  { q: "Can I pause without closing?", a: "Yes. Pausing stops new customers joining while everyone already holding a token keeps their place." },
  { q: "What about walk-ins who don't use the app?", a: "Add them from the dashboard the same way you'd write a name on a pad. They get a token in the same order." },
];

export default async function ForBarbersPage() {
  const stats = await getPlatformStats();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="bg-ink-950 text-white">
        <div className="container-page grid gap-10 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-bold tracking-wider text-brand-300 uppercase">For barbershops</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Run your shop, not a waiting room</h1>
            <p className="mt-4 max-w-xl text-lg text-white/70">
              A live digital queue your customers can join from anywhere, and a dashboard that takes one tap per customer.
              Free to list.
            </p>
            {stats.live && stats.approvedShops > 0 ? (
              <p className="mt-3 text-sm text-white/50">
                {approx(stats.approvedShops)} {stats.approvedShops === 1 ? "shop is" : "shops are"} already running their queue on
                QueueCut{stats.activeBarbers > 0 ? `, with ${approx(stats.activeBarbers)} barbers` : ""}.
              </p>
            ) : null}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Cta href={appLink.shopRegister} variant="accent" size="lg">
                List your shop free <ArrowRight />
              </Cta>
              <Cta href={appLink.shopLogin} variant="light" size="lg">
                Shop login
              </Cta>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-white/60">What your customers see</p>
            <div className="mt-3 rounded-lg bg-surface p-4 text-ink-950">
              <p className="font-semibold">Classic Cuts</p>
              <p className="mt-1 text-sm text-ink-500">Anna Salai, Chennai · 4.6★ (128)</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ["In queue", "4"],
                  ["Est. wait", "~35 min"],
                  ["From", "₹150"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-md bg-surface-muted px-2 py-2">
                    <p className="text-[11px] text-ink-500">{k}</p>
                    <p className="text-sm font-bold tabular">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-md bg-brand-600 py-2 text-center text-sm font-semibold text-white">Join Queue</div>
            </div>
          </div>
        </div>
      </section>

      <Section tone="muted">
        <SectionHeading eyebrow="Getting started" title="Live in four steps" />
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-lg border border-border bg-surface-muted p-6">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-4 font-semibold text-ink-950">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <SectionHeading eyebrow="Why shops use it" title="It pays for itself in walk-ins" align="left" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex gap-4 rounded-lg border border-border bg-surface p-6 shadow-card">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                <b.icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-semibold text-ink-950">{b.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="pricing" tone="muted">
        <SectionHeading eyebrow="Pricing" title="Free while we grow with you" description="No card, no setup fee, no lock-in." />
        <div className="mx-auto mt-12 max-w-md rounded-xl border-2 border-brand-500 bg-surface p-8 shadow-card">
          <div className="flex items-baseline gap-1">
            <IndianRupee className="size-6 text-ink-700" aria-hidden />
            <span className="text-5xl font-bold tracking-tight text-ink-950">0</span>
            <span className="ml-1 text-ink-500">/ month</span>
          </div>
          <p className="mt-2 text-sm text-ink-600">Everything a single shop needs to run a live queue.</p>
          <ul className="mt-6 space-y-3">
            {[
              "Unlimited customers in the queue",
              "Unlimited barbers and services",
              "Live queue dashboard on any device",
              "Automatic customer notifications",
              "Public listing with live wait times",
              "Ratings and reviews",
            ].map((f) => (
              <li key={f} className="flex gap-2.5 text-sm text-ink-800">
                <Check className="mt-0.5 size-4 shrink-0 text-success-600" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <Cta href={appLink.shopRegister} size="lg" className="mt-8 w-full">
            List your shop free
          </Cta>
          <p className="mt-3 text-center text-xs text-ink-500">Approved within 24 hours.</p>
        </div>
      </Section>

      <Section>
        <SectionHeading eyebrow="Questions" title="Answers before you ask" />
        <dl className="mx-auto mt-10 max-w-3xl divide-y divide-border">
          {FAQ.map((f) => (
            <div key={f.q} className="py-5">
              <dt className="font-semibold text-ink-950">{f.q}</dt>
              <dd className="mt-1.5 text-ink-600">{f.a}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}
