import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { requireProfile } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { NotificationsList } from "./notifications-list";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const profile = await requireProfile("/login", "/notifications");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);

  return (
    <div className="container-page max-w-2xl py-6 sm:py-10">
      <PageHeader title="Notifications" description="Queue updates and shop announcements." />
      <NotificationsList userId={profile.id} initial={data ?? []} />
    </div>
  );
}
