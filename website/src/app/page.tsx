import {
  ArrowRight,
  BellRing,
  Clock,
  MapPin,
  Scissors,
  Search,
  Smartphone,
  Star,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import { Cta, FeatureCard, Section, SectionHeading, Stat } from "@/components/ui";
import { BRAND, SITE_URL, appLink } from "@/lib/config";

const STEPS = [
  { icon: Search, title: "Find a barber", text: "Browse shops near you with live queue counts, wait times and prices." },
  { icon: Ticket, title: "Join remotely", text: "Pick a service and barber, then get a digital token instantly." },
  { icon: BellRing, title: "Walk in on time", text: "Track your position live. We ping you as your turn approaches." },
];

const CUSTOMER_FEATURES = [
  { icon: <Clock />, title: "Live wait times", text: "Every shop shows how many people are in line and roughly how long that takes." },
  { icon: <Users />, title: "Choose your barber", text: "Queue for a specific barber or take the first available chair." },
  { icon: <Smartphone />, title: "Track from anywhere", text: "Position, people ahead and estimated wait update on your phone without refreshing." },
  { icon: <Star />, title: "Honest ratings", text: "Reviews come only from customers who actually completed a visit." },
];

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND.name,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    description: BRAND.description,
    url: SITE_URL,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden>
          <div className="absolute -top-32 -left-32 size-[32rem] rounded-full bg-brand-400 blur-3xl" />
          <div className="absolute -right-24 -bottom-40 size-[28rem] rounded-full bg-accent-400 blur-3xl" />
        </div>
        <div className="container-page relative grid gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-brand-200 uppercase">
              <span className="size-1.5 rounded-full bg-brand-300" aria-hidden /> Live queues in Chennai
            </p>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              No more waiting <span className="text-brand-300">in line.</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/70">{BRAND.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Cta href={appLink.findBarber} size="lg" variant="primary">
                Find a Barber <ArrowRight />
              </Cta>
              <Cta href="/for-barbers" size="lg" variant="light">
                I own a barbershop
              </Cta>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-6">
              {[
                ["0 min", "spent in a plastic chair"],
                ["Live", "queue position"],
                ["Free", "for customers"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-2xl font-bold tracking-tight">{value}</dt>
                  <dd className="mt-0.5 text-xs text-white/60">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mx-auto w-full max-w-sm lg:max-w-none">
            <TokenPreview />
          </div>
        </div>
      </section>

      {/* How it works */}
      <Section tone="muted">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps between you and a fresh cut"
          description="No calls, no appointments to remember, no guessing when the shop is quiet."
        />
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-lg border border-border bg-surface-muted p-6">
              <span className="absolute top-4 right-4 text-4xl font-black text-ink-200 tabular" aria-hidden>
                {i + 1}
              </span>
              <span className="flex size-11 items-center justify-center rounded-md bg-brand-600 text-white">
                <s.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-ink-950">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Customer features */}
      <Section>
        <SectionHeading
          eyebrow="For customers"
          title="Everything you need to skip the wait"
          description="Built mobile-first, because you'll check your position from the sofa, the office or the bus."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CUSTOMER_FEATURES.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title}>
              {f.text}
            </FeatureCard>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Cta href="/features" variant="outline">
            See all features <ArrowRight />
          </Cta>
        </div>
      </Section>

      {/* For barbers */}
      <Section tone="dark">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading
              eyebrow="For barbers"
              title="Run your shop, not a waiting room"
              description="One screen to call the next customer, start the service and complete it. Your queue stays in order and your customers stop crowding the door."
              align="left"
              invert
            />
            <ul className="mt-8 space-y-4">
              {[
                { icon: TrendingUp, text: "Fewer no-shows: customers get pinged before their turn." },
                { icon: Users, text: "Separate queues per barber, or one shared walk-in line." },
                { icon: MapPin, text: "A free listing that shows your live wait time to nearby customers." },
              ].map((b) => (
                <li key={b.text} className="flex gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-brand-200">
                    <b.icon className="size-4" aria-hidden />
                  </span>
                  <span className="text-white/80">{b.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Cta href={appLink.shopRegister} variant="accent" size="lg">
                List your shop free
              </Cta>
              <Cta href="/for-barbers" variant="ghost" size="lg" className="text-white hover:bg-white/10 hover:text-white">
                How it works for shops
              </Cta>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-2 shadow-pop">
            <div className="rounded-lg bg-surface p-5 text-ink-950">
              <p className="text-xs font-bold tracking-wider text-ink-500 uppercase">Today&apos;s queue</p>
              <div className="mt-4 rounded-lg border border-border bg-surface-muted p-4">
                <p className="text-xs font-bold tracking-wider text-ink-500 uppercase">Now serving</p>
                <p className="mt-1 text-4xl font-black tracking-tight tabular">A-22</p>
                <p className="mt-1 text-sm text-ink-600">John · Haircut · ₹150</p>
              </div>
              <ul className="mt-3 space-y-2">
                {[
                  ["A-23", "Rahul", "Haircut"],
                  ["A-24", "Arun", "Beard Trim"],
                  ["A-25", "Karthik", "Haircut + Beard"],
                ].map(([token, name, service]) => (
                  <li key={token} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                    <span className="w-12 text-sm font-bold text-ink-700 tabular">{token}</span>
                    <span className="flex-1 truncate text-sm text-ink-800">{name}</span>
                    <span className="truncate text-xs text-ink-500">{service}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-md bg-brand-600 py-2.5 text-center text-sm font-bold text-white">CALL NEXT</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Social proof */}
      <Section tone="muted">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-2">
            <Stat value="0 min" label="Time spent waiting in a chair" />
            <Stat value="Live" label="Queue position, updated in seconds" />
            <Stat value="Free" label="For customers and for shops" />
            <Stat value="24 hr" label="Shop listings reviewed within" />
          </div>
          <figure className="rounded-lg border border-border bg-surface p-8 shadow-card">
            <div className="flex gap-1" aria-label="Rated 5 out of 5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-5 fill-accent-400 text-accent-400" aria-hidden />
              ))}
            </div>
            <blockquote className="mt-4 text-lg leading-relaxed text-ink-800">
              &ldquo;Saturday used to mean an hour on a bench. Now I join from home, get a token, and walk in when the app says
              I&apos;m next. My barber likes it more than I do.&rdquo;
            </blockquote>
            <figcaption className="mt-4 text-sm text-ink-500">Rahul S. · Nungambakkam, Chennai</figcaption>
          </figure>
        </div>
      </Section>

      {/* Final CTA */}
      <Section>
        <div className="rounded-xl bg-brand-700 px-8 py-14 text-center text-white">
          <Scissors className="mx-auto size-8 text-brand-200" aria-hidden />
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Your next cut, without the wait</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Find a barber near you, see who&apos;s free right now and take your place in line from wherever you are.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Cta href={appLink.findBarber} variant="accent" size="lg">
              Find a Barber <ArrowRight />
            </Cta>
            <Cta href={appLink.shopRegister} variant="light" size="lg">
              List your shop
            </Cta>
          </div>
        </div>
      </Section>
    </>
  );
}

function TokenPreview() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-pop backdrop-blur">
      <div className="rounded-xl bg-surface p-5 text-ink-950">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold tracking-wider text-ink-500 uppercase">Your queue</p>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success-600">
            <span className="size-1.5 rounded-full bg-success-500 animate-pulse-dot" aria-hidden /> Live
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-sm text-ink-500">Token</p>
            <p className="text-5xl font-black tracking-tight tabular">A-27</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-ink-500">Now serving</p>
            <p className="text-2xl font-bold tabular">A-22</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-surface-muted p-3">
            <p className="text-xs text-ink-500">People ahead</p>
            <p className="text-2xl font-bold tabular">4</p>
          </div>
          <div className="rounded-md bg-surface-muted p-3">
            <p className="text-xs text-ink-500">Estimated wait</p>
            <p className="text-2xl font-bold tabular">~20 min</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-100">
          <div className="h-full w-2/3 rounded-full bg-brand-500" />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-600">
          <MapPin className="size-4 text-ink-400" aria-hidden /> Classic Cuts · Haircut
        </p>
      </div>
    </div>
  );
}
