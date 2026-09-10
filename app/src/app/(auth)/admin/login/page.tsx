import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AuthCard } from "@/components/forms/auth-card";
import { EmailLoginForm } from "@/components/forms/email-login-form";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthCard title="Admin console" description="Restricted area. Authorised staff only.">
      <div className="mb-4 flex items-center gap-2 rounded-md bg-ink-100 px-3 py-2 text-xs font-medium text-ink-600">
        <ShieldCheck className="size-4" aria-hidden /> All actions are audited.
      </div>
      <EmailLoginForm expectRole="admin" next={next} submitLabel="Sign in to console" />
    </AuthCard>
  );
}
