import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/forms/auth-card";
import { AuthDivider } from "@/components/forms/auth-divider";
import { GoogleSignInButton } from "@/components/forms/google-sign-in-button";
import { Alert } from "@/components/ui/alert";
import { LoginTabs } from "./login-tabs";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const CALLBACK_ERRORS: Record<string, string> = {
  oauth: "Google sign-in didn't complete. Please try again.",
  deactivated: "This account has been deactivated.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const errorMessage = error ? CALLBACK_ERRORS[error] : undefined;
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to join queues and track your turn."
      footer={
        <>
          New here?{" "}
          <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-medium text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}
        <GoogleSignInButton next={next} />
        <AuthDivider />
        <LoginTabs next={next} />
      </div>
    </AuthCard>
  );
}
