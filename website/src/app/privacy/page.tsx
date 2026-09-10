import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${BRAND.name} handles your personal data.`,
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  {
    title: "What we collect",
    body: "Your name and mobile number when you create an account, and an email address if you add one. When you join a queue we store which shop, service and barber you chose, and the timestamps of your token. Shop owners additionally provide their shop's address, hours, photos, services and staff.",
  },
  {
    title: "Why we collect it",
    body: "To place you in a queue, tell you when your turn is approaching, and show the shop who is waiting. Shop owners see the name and number of customers currently in their own queue so they can call you. That is the entire purpose.",
  },
  {
    title: "What other customers can see",
    body: "Token numbers and counts only. Other customers never see your name, your number or which service you booked.",
  },
  {
    title: "How long we keep it",
    body: "Queue history is retained so you can see past visits and leave a review. You can ask us to delete your account and its history at any time.",
  },
  {
    title: "Who else sees it",
    body: "Nobody. We do not sell personal data and we do not share it with advertisers. We use Supabase to host the database and Vercel to serve the site; both act as processors on our behalf.",
  },
  {
    title: "Your choices",
    body: `You can edit or delete your profile in the app, leave any queue you have joined, and request deletion of your account by emailing ${BRAND.email}.`,
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Section tone="muted" className="py-14 sm:py-16">
        <SectionHeading eyebrow="Legal" title="Privacy" description="Plain language, because a privacy policy nobody reads protects nobody." />
      </Section>
      <Section>
        <div className="mx-auto max-w-3xl divide-y divide-border">
          {SECTIONS.map((s) => (
            <section key={s.title} className="py-6">
              <h2 className="text-lg font-semibold text-ink-950">{s.title}</h2>
              <p className="mt-2 leading-relaxed text-ink-600">{s.body}</p>
            </section>
          ))}
          <p className="py-6 text-sm text-ink-500">
            This summary describes the MVP. Contact {BRAND.email} with any question about your data.
          </p>
        </div>
      </Section>
    </>
  );
}
