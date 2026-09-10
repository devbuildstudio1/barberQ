import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms",
  description: `The terms that apply when you use ${BRAND.name}.`,
  alternates: { canonical: "/terms" },
};

const SECTIONS = [
  {
    title: "What the service does",
    body: `${BRAND.name} lets you see a barbershop's live queue and take a place in it remotely. We are not the barbershop. The haircut, the price and the service quality are the shop's responsibility.`,
  },
  {
    title: "Wait times are estimates",
    body: "Estimated waits are calculated from the services queued ahead of you and the barbers on duty. Real cuts run long and short. Treat the estimate as guidance, not a guarantee, and arrive with a margin.",
  },
  {
    title: "Holding your place",
    body: "A token holds your position while you are waiting. If you are not present when the shop calls you, they may mark you as a no-show and move on. You can rejoin at the back of the queue.",
  },
  {
    title: "One queue at a time per shop",
    body: "You may hold one active token per shop per day. Cancel your existing token before taking another.",
  },
  {
    title: "Reviews",
    body: "Only customers with a completed visit can review a shop, once per visit. We remove reviews that are abusive, fraudulent or unrelated to the service.",
  },
  {
    title: "Shop obligations",
    body: "Shops must keep their hours, prices and staff availability accurate, honour the queue order, and serve customers who arrive when called. We may suspend a listing that repeatedly misleads customers.",
  },
  {
    title: "Availability",
    body: "We aim to keep the service running but do not guarantee uninterrupted availability. If the service is unavailable, shops fall back to their usual walk-in process.",
  },
];

export default function TermsPage() {
  return (
    <>
      <Section tone="muted" className="py-14 sm:py-16">
        <SectionHeading eyebrow="Legal" title="Terms of use" description="The short version of what you can expect from us, and what we expect in return." />
      </Section>
      <Section>
        <div className="mx-auto max-w-3xl divide-y divide-border">
          {SECTIONS.map((s) => (
            <section key={s.title} className="py-6">
              <h2 className="text-lg font-semibold text-ink-950">{s.title}</h2>
              <p className="mt-2 leading-relaxed text-ink-600">{s.body}</p>
            </section>
          ))}
          <p className="py-6 text-sm text-ink-500">Questions about these terms: {BRAND.email}</p>
        </div>
      </Section>
    </>
  );
}
