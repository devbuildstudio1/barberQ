import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { AuthCard } from "@/components/forms/auth-card";
import { EmailLoginForm } from "@/components/forms/email-login-form";

export const metadata: Metadata = { title: "Shop login", robots: { index: false } };

export default async function ShopLoginPage({ searchParams }: { searchParams: Promise<{ next?: string; confirm?: string }> }) {
  const { next, confirm } = await searchParams;
  return (
    <AuthCard
      title="Shop owner login"
      description="Manage your queue, barbers and services."
      footer={
        <>
          Don&apos;t have a shop account?{" "}
          <Link href="/shop/register" className="font-medium text-brand-700 hover:underline">
            Register your shop
          </Link>
        </>
      }
    >
      {confirm ? (
        <Alert tone="success" title="Check your email" className="mb-4">
          Confirm your email address, then sign in below.
        </Alert>
      ) : null}
      <EmailLoginForm expectRole="shop_owner" next={next} />
    </AuthCard>
  );
}
