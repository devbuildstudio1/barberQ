import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth/guards";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Your profile", robots: { index: false } };

export default async function ProfilePage() {
  const profile = await requireProfile("/login", "/profile");
  return (
    <div className="container-page max-w-2xl py-8">
      <PageHeader title="Your profile" description="How we address you and reach you." />
      <Card>
        <CardContent>
          <ProfileForm profile={{ name: profile.name, email: profile.email, phone: profile.phone, profile_image: profile.profile_image, role: profile.role }} />
        </CardContent>
      </Card>
    </div>
  );
}
