import type { Metadata } from "next";
import { Clock, Heart, ShieldCheck, Users } from "lucide-react";
import { Cta, Section, SectionHeading, Stat } from "@/components/ui";
import { BRAND, appLink } from "@/lib/config";
import { approx, getPlatformStats } from "@/lib/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About",
  description: `Why we built ${BRAND.name}: local barbershops run on walk-ins, and walk-ins run on waiting. We replaced the bench with a live queue.`,
  alternates: { canonical: "/about" },
};

const VALUES = [
  { icon: Clock, title: "Respect people's time", text: "Every decision is judged by one question: does this get someone out of a waiting chair?" },
  { icon: Users, title: "Work for both sides", text: "A queue only works if the shop trusts it too. The dashboard is as considered as the customer app." },
  { icon: ShieldCheck, title: "Earn trust with data", text: "Reviews require a real completed visit. Wait times are estimates and we say so." },
  { icon: Heart, title: "Built for local shops", text: "Independent barbers, not chains. Free to list, quick to set up, no hardware to buy." },
];

export default async function AboutPage() {
  const stats = await getPlatformStats();

  return (
    <>
      <Section tone="muted" className="py-14 sm:py-16">
        <SectionHeading
          eyebrow="About us"
          title="We got tired of Saturday mornings"
          description="An hour on a bench for a twenty-minute haircut. The shop wasn't disorganised; it just had no way to tell you when to arrive."
        />
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl space-y-5 text-lg leading-relaxed text-ink-700">
          <p>
            Local barbershops run on walk-ins. That is their strength: no appointment, no commitment, turn up and get a cut.
            It is also the problem, because &ldquo;turn up&rdquo; means someone has to guess when the shop is quiet, and the
            guess is usually wrong.
          </p>
          <p>
            {BRAND.name} keeps the walk-in model and removes the guesswork. Customers see the live queue before they leave
            home, take a token remotely, and watch their position move. Shops get an ordered list and a single button to
            advance it.
          </p>
          <p>
            We started in Chennai because that is where we stood on the pavement waiting for a chair. The product is deliberately
            small: find a shop, join a queue, get called. Everything else can wait until those three things are excellent.
          </p>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading eyebrow="What we care about" title="Four things we won't compromise on" />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-lg border border-border bg-surface-muted p-6">
              <span className="flex size-11 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                <v.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold text-ink-950">{v.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{v.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 rounded-xl border border-border bg-surface p-8 shadow-card sm:grid-cols-2 lg:grid-cols-4">
          <Stat value="2026" label="Founded in Chennai" />
          <Stat value={stats.live && stats.approvedShops > 0 ? approx(stats.approvedShops) : "New"} label="Shops on the platform" />
          <Stat
            value={stats.live && stats.completedServices > 0 ? approx(stats.completedServices) : "Live"}
            label={stats.live && stats.completedServices > 0 ? "Haircuts served through the queue" : "Queue positions, in seconds"}
          />
          <Stat value="Free" label="For customers and shops" />
        </div>
        <div className="mt-10 text-center">
          <Cta href={appLink.findBarber} size="lg">
            Find a barber near you
          </Cta>
        </div>
      </Section>
    </>
  );
}
