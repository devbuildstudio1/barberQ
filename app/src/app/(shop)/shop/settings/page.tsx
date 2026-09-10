import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getOwnedShop } from "@/lib/auth/guards";
import { ShopStatusControls } from "@/components/shop/shop-status-controls";
import { ShopSettingsForm } from "./shop-settings-form";

export const metadata: Metadata = { title: "Shop settings", robots: { index: false } };

export default async function ShopSettingsPage() {
  const shop = await getOwnedShop();
  if (!shop) notFound();

  return (
    <div className="space-y-8">
      <div>
        <PageHeader title="Shop settings" description="Your public profile, hours and live availability." />
        {shop.status === "approved" ? (
          <ShopStatusControls shopId={shop.id} isOpen={shop.is_open} queuePaused={shop.queue_paused} />
        ) : null}
      </div>
      <ShopSettingsForm shop={shop} />
    </div>
  );
}
