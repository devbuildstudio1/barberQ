import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getOwnedShop } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { BarbersManager } from "./barbers-manager";

export const metadata: Metadata = { title: "Barbers", robots: { index: false } };

export default async function ShopBarbersPage() {
  const shop = await getOwnedShop();
  if (!shop) notFound();

  const supabase = await createClient();
  const { data: barbers } = await supabase.from("barbers").select("*").eq("shop_id", shop.id).order("created_at");

  return (
    <div>
      <PageHeader title="Barbers" description="Add your team, set who's available, and control who customers can book." />
      <BarbersManager shopId={shop.id} initialBarbers={barbers ?? []} />
    </div>
  );
}
