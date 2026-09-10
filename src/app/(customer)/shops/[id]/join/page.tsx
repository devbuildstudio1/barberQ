import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, DoorClosed, PauseCircle, Ticket } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireProfile } from "@/lib/auth/guards";
import { getMyActiveQueueEntry } from "@/lib/queue/queries";
import { getShopDetails } from "@/lib/shops/queries";
import { queueState } from "@/components/customer/queue-indicator";
import { JoinQueueForm } from "./join-queue-form";

export const metadata: Metadata = { title: "Join queue", robots: { index: false } };

export default async function JoinQueuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireProfile("/login", `/shops/${id}/join`);
  const [details, active] = await Promise.all([getShopDetails(id), getMyActiveQueueEntry()]);
  if (!details) notFound();
  const { shop, barbers, services, live, queues } = details;

  if (active && active.shop.id === shop.id) redirect("/my-queue");

  const state = queueState(live.is_open, live.queue_paused);
  const activeServices = services.filter((s) => s.status === "active");
  const availableBarbers = barbers.filter((b) => b.status === "active");

  return (
    <div className="container-page max-w-2xl py-6 sm:py-10">
      <Link href={`/shops/${shop.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-ink-950">
        <ArrowLeft className="size-4" aria-hidden /> Back to {shop.name}
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">Join the queue</h1>
      <p className="mt-1 text-ink-500">{shop.name}</p>

      {state === "closed" ? (
        <EmptyState
          icon={<DoorClosed />}
          title="This shop is currently closed."
          description="You can join the queue once the shop opens."
          action={
            <Link href={`/shops/${shop.id}`} className={buttonVariants({ variant: "outline" })}>
              View shop details
            </Link>
          }
          className="mt-8"
        />
      ) : state === "paused" ? (
        <EmptyState
          icon={<PauseCircle />}
          title="Queue temporarily paused."
          description="The shop isn't taking new customers right now. Please check back in a few minutes."
          action={
            <Link href={`/shops/${shop.id}`} className={buttonVariants({ variant: "outline" })}>
              Back to shop
            </Link>
          }
          className="mt-8"
        />
      ) : activeServices.length === 0 ? (
        <EmptyState icon={<Ticket />} title="No services available" description="This shop hasn't listed any services yet." className="mt-8" />
      ) : active ? (
        <EmptyState
          icon={<Ticket />}
          title="You're already in a queue"
          description={`You have an active token at ${active.shop.name}. Finish or leave that queue before joining another.`}
          action={
            <Link href="/my-queue" className={buttonVariants()}>
              View my queue
            </Link>
          }
          className="mt-8"
        />
      ) : (
        <JoinQueueForm shop={{ id: shop.id, name: shop.name }} barbers={availableBarbers} services={activeServices} queues={queues} live={live} />
      )}
    </div>
  );
}
