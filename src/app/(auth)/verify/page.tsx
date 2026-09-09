import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/forms/auth-card";
import { OtpForm } from "@/components/forms/otp-form";

export const metadata: Metadata = { title: "Verify code", robots: { index: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ phone?: string; name?: string; next?: string }> }) {
  const { phone, name, next } = await searchParams;
  if (!phone) redirect("/login");
  const masked = phone.replace(/(\+\d{2})\d+(\d{4})$/, "$1 •••••• $2");
  return (
    <AuthCard
      title="Enter the code"
      description={`We sent a 6-digit code to ${masked}.`}
      footer={
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Use a different number
        </Link>
      }
    >
      <OtpForm phone={phone} name={name} next={next} />
    </AuthCard>
  );
}
