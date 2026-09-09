import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/forms/auth-card";
import { LoginTabs } from "./login-tabs";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
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
      <LoginTabs next={next} />
    </AuthCard>
  );
}
