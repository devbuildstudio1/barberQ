import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Store, Clock, Users } from "lucide-react";
import { AuthCard } from "@/components/forms/auth-card";
import { OwnerSignupForm } from "@/components/forms/owner-signup-form";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getOwnedShop } from "@/lib/auth/guards";
import { ShopRegisterForm } from "@/components/shop/shop-register-form";

export const metadata: Metadata = {
  title: "Register your barbershop",
  description: "List your barbershop, run a live digital queue and let customers join from anywhere.",
};

export default async function ShopRegisterPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div className="space-y-6 lg:pt-8">
          <h1 className="text-3xl font-bold tracking-tight text-ink-950">Run your shop with a live queue</h1>
          <ul className="space-y-4 text-ink-700">
            {[
              { icon: Users, text: "Customers join from their phone and arrive when it's their turn." },
              { icon: Clock, text: "Call next, start and complete with one tap." },
              { icon: Store, text: "Free listing with live wait times to attract walk-ins." },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <AuthCard
          title="Create owner account"
          description="Step 1 of 2 — your login details."
          footer={
            <>
              Already registered?{" "}
              <Link href="/shop/login" className="font-medium text-brand-700 hover:underline">
                Sign in
              </Link>
            </>
          }
        >
          <OwnerSignupForm />
        </AuthCard>
      </div>
    );
  }

  if (profile.role === "customer") {
    return (
      <AuthCard title="Switch to a shop account" description="Shop registration requires an owner account with email and password.">
        <p className="text-sm text-ink-600">
          You&apos;re signed in as a customer. Sign out and create a separate owner account to register a shop.
        </p>
      </AuthCard>
    );
  }

  const shop = await getOwnedShop();
  if (shop) redirect("/shop/dashboard");

  return (
    <div className="w-full max-w-2xl">
      <AuthCard title="Register your shop" description="Step 2 of 2 — tell customers about your shop. We'll review it within 24 hours.">
        <ShopRegisterForm ownerName={profile.name ?? ""} ownerPhone={profile.phone ?? ""} ownerEmail={profile.email ?? ""} />
      </AuthCard>
    </div>
  );
}
