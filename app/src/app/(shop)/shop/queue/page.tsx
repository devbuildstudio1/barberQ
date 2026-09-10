import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { getOwnedShop } from "@/lib/auth/guards";
import { getShopQueueBoard } from "@/lib/queue/queries";
import { QueueBoardView } from "./queue-board";

export const metadata: Metadata = { title: "Today's queue", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ShopQueuePage() {
  const shop = await getOwnedShop();
  if (!shop) notFound();

  if (shop.status !== "approved") {
    return (
      <Alert tone="warning" title="Queue is not live yet">
        Your shop must be approved before customers can join the queue.
      </Alert>
    );
  }

  const board = await getShopQueueBoard(shop.id);

  return (
    <QueueBoardView
      shop={{ id: shop.id, name: shop.name, is_open: shop.is_open, queue_paused: shop.queue_paused }}
      initialBoard={board}
    />
  );
}
