import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getOwnedShop } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ServicesManager } from "./services-manager";

export const metadata: Metadata = { title: "Services", robots: { index: false } };

export default async function ShopServicesPage() {
  const shop = await getOwnedShop();
  if (!shop) notFound();

  const supabase = await createClient();
  const { data: services } = await supabase.from("services").select("*").eq("shop_id", shop.id).order("sort_order").order("created_at");

  return (
    <div>
      <PageHeader title="Services" description="Prices and durations drive your wait-time estimates, so keep durations realistic." />
      <ServicesManager shopId={shop.id} initialServices={services ?? []} />
    </div>
  );
}
