import type { Metadata } from "next";
import {
  ArrowRight,
  BellRing,
  Clock,
  LayoutDashboard,
  ListOrdered,
  MapPin,
  PauseCircle,
  Scissors,
  Search,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Star,
  Ticket,
  UserCheck,
  Users,
} from "lucide-react";
import { Cta, FeatureCard, Section, SectionHeading } from "@/components/ui";
import { appLink } from "@/lib/config";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Live queue tracking, digital tokens, barber selection, wait-time estimates and a one-screen shop dashboard. Everything QueueCut does, in detail.",
  alternates: { canonical: "/features" },
};

const CUSTOMER = [
  { icon: <Search />, title: "Discovery that respects your time", text: "Search by shop or barber name, then filter by distance, rating, starting price, current wait and whether the shop is open right now." },
  { icon: <SlidersHorizontal />, title: "Sorting that matches intent", text: "Recommended, nearest, highest rated, shortest wait or lowest price. Closed shops never jump the queue with an empty line." },
  { icon: <Ticket />, title: "A real digital token", text: "Join from anywhere and receive a token like A-27, tied to the shop, the service and the barber you picked." },
  { icon: <Clock />, title: "Honest wait estimates", text: "The estimate adds up the actual services ahead of you and divides by the barbers on duty. It is always shown as an estimate." },
  { icon: <Smartphone />, title: "Live position, no refresh", text: "People ahead, the token being served and your estimated wait update the moment the shop advances the queue." },
  { icon: <BellRing />, title: "Alerts before your turn", text: "Notifications at two ahead, one ahead, and when you're next, so you can time the walk over." },
  { icon: <Users />, title: "Pick your barber", text: "Queue for a specific barber or take the first available chair, whichever gets you out sooner." },
  { icon: <Star />, title: "Reviews that mean something", text: "Only customers with a completed visit can review, and each visit can be reviewed once." },
];

const SHOP = [
  { icon: <ListOrdered />, title: "One-screen queue control", text: "Call next, start service, complete, no-show and cancel. The next customer is always one tap away." },
  { icon: <LayoutDashboard />, title: "A dashboard that answers the obvious", text: "Who's in the chair, how many are waiting, how long the queue runs and how many services you've finished today." },
  { icon: <PauseCircle />, title: "Open, close, pause", text: "Pause the queue during a rush without losing anyone's place, or close for the day in one tap." },
  { icon: <Scissors />, title: "Services and pricing", text: "Set price and duration per service in rupees. Durations drive the wait estimates customers see." },
  { icon: <UserCheck />, title: "Barber roster", text: "Add your team, mark who's available, on a break or off duty. Unavailable barbers can't be selected." },
  { icon: <MapPin />, title: "A listing that fills quiet hours", text: "Nearby customers see your live wait time, prices and rating, and can join before they leave home." },
];

export default function FeaturesPage() {
  return (
    <>
      <Section tone="muted" className="py-14 sm:py-16">
        <SectionHeading
          eyebrow="Features"
          title="Built around one promise: nobody waits in a chair"
          description="Everything below exists because a queue is only useful when both sides trust it."
        />
      </Section>

      <Section>
        <SectionHeading eyebrow="For customers" title="From finding a shop to rating the cut" align="left" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CUSTOMER.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title}>
              {f.text}
            </FeatureCard>
          ))}
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading eyebrow="For shops" title="Run the day from one screen" align="left" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title}>
              {f.text}
            </FeatureCard>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Trust"
              title="Your data stays yours"
              description="Queue positions are public; people are not. Customers see token numbers and counts, never other customers' names or numbers."
              align="left"
            />
            <ul className="mt-6 space-y-3 text-ink-700">
              {[
                "Every record is protected by database-level access rules, not just interface checks.",
                "Shop staff see only their own shop's queue.",
                "Sign in with a one-time code sent to your phone. No password to leak.",
                "Reviews are tied to a completed visit, so ratings can't be gamed.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Shield className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-surface p-8 shadow-card">
            <h3 className="text-lg font-semibold text-ink-950">Ready to try it?</h3>
            <p className="mt-2 text-sm text-ink-600">
              Finding a barber and joining a queue is free. Shops list for free too.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Cta href={appLink.findBarber} size="lg">
                Find a Barber <ArrowRight />
              </Cta>
              <Cta href={appLink.shopRegister} variant="outline" size="lg">
                List your shop
              </Cta>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
