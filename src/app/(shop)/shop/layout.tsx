import { redirect } from "next/navigation";
import { getOwnedShop, requireRole } from "@/lib/auth/guards";
import { ShopShell } from "@/components/shop/shop-shell";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["shop_owner", "admin"], "/shop/login");
  const shop = await getOwnedShop();
  if (!shop) redirect("/shop/register");

  return (
    <ShopShell
      user={{ name: profile.name, image: profile.profile_image, roleLabel: "Shop owner" }}
      shop={{ id: shop.id, name: shop.name, status: shop.status, is_open: shop.is_open, queue_paused: shop.queue_paused }}
    >
      {children}
    </ShopShell>
  );
}
