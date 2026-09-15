import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/forms/auth-card";
import { AuthDivider } from "@/components/forms/auth-divider";
import { GoogleSignInButton } from "@/components/forms/google-sign-in-button";
import { PhoneLoginForm } from "@/components/forms/phone-login-form";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthCard
      title="Create your account"
      description="One-time code to your phone. No passwords to remember."
      footer={
        <>
          Already have an account?{" "}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-brand-700 hover:underline">
            Sign in
          </Link>
          <span className="mx-2 text-ink-300">·</span>
          <Link href="/shop/register" className="font-medium text-brand-700 hover:underline">
            Own a barbershop?
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <GoogleSignInButton next={next} label="Sign up with Google" />
        <AuthDivider />
        <PhoneLoginForm mode="register" next={next} />
      </div>
    </AuthCard>
  );
}
