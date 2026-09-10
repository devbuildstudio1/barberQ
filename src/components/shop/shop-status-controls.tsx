"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DoorClosed, DoorOpen, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useAction } from "@/hooks/use-action";
import { setQueuePausedAction, setShopOpenAction } from "@/lib/queue/actions";
import { cn } from "@/lib/utils";

interface Props {
  shopId: string;
  isOpen: boolean;
  queuePaused: boolean;
  /** Compact variant for the dashboard header. */
  compact?: boolean;
  className?: string;
}

/** Open/close the shop and pause/resume the queue. Used in the header and settings. */
export function ShopStatusControls({ shopId, isOpen, queuePaused, compact, className }: Props) {
  const router = useRouter();
  const [confirmClose, setConfirmClose] = React.useState(false);

  const openAction = useAction(setShopOpenAction, {
    onSuccess: ({ open }) => {
      setConfirmClose(false);
      router.refresh();
      return void open;
    },
  });
  const pauseAction = useAction(setQueuePausedAction, {
    onSuccess: () => router.refresh(),
  });

  const toggleOpen = () => {
    if (isOpen) setConfirmClose(true);
    else void openAction.run({ shop_id: shopId, open: true });
  };

  if (compact) {
    return (
      <>
        <div className={cn("flex items-center gap-2", className)}>
          <Badge variant={isOpen ? "success" : "neutral"} dot pulse={isOpen} className="hidden sm:inline-flex">
            {isOpen ? "Open" : "Closed"}
          </Badge>
          {isOpen ? (
            <Button size="sm" variant={queuePaused ? "primary" : "outline"} loading={pauseAction.pending} onClick={() => pauseAction.run({ shop_id: shopId, paused: !queuePaused })}>
              {queuePaused ? <Play /> : <Pause />}
              <span className="hidden sm:inline">{queuePaused ? "Resume queue" : "Pause queue"}</span>
            </Button>
          ) : null}
          <Button size="sm" variant={isOpen ? "outline" : "primary"} loading={openAction.pending} onClick={toggleOpen}>
            {isOpen ? <DoorClosed /> : <DoorOpen />}
            <span className="hidden sm:inline">{isOpen ? "Close shop" : "Open shop"}</span>
          </Button>
        </div>
        <CloseDialog open={confirmClose} onClose={() => setConfirmClose(false)} onConfirm={async () => void (await openAction.run({ shop_id: shopId, open: false }))} loading={openAction.pending} />
      </>
    );
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      <StatusTile
        title="Shop status"
        state={isOpen ? "Open" : "Closed"}
        tone={isOpen ? "success" : "neutral"}
        description={isOpen ? "Customers can find you and join the queue." : "You're hidden from new walk-ins until you open."}
        action={
          <Button variant={isOpen ? "outline" : "primary"} loading={openAction.pending} onClick={toggleOpen}>
            {isOpen ? <DoorClosed /> : <DoorOpen />}
            {isOpen ? "Close shop" : "Open shop"}
          </Button>
        }
      />
      <StatusTile
        title="Queue"
        state={!isOpen ? "Closed" : queuePaused ? "Paused" : "Active"}
        tone={!isOpen ? "neutral" : queuePaused ? "warning" : "success"}
        description={queuePaused ? "New customers can't join. Existing tokens keep their place." : "New customers can join the queue."}
        action={
          <Button variant={queuePaused ? "primary" : "outline"} disabled={!isOpen} loading={pauseAction.pending} onClick={() => pauseAction.run({ shop_id: shopId, paused: !queuePaused })}>
            {queuePaused ? <Play /> : <Pause />}
            {queuePaused ? "Resume queue" : "Pause queue"}
          </Button>
        }
      />
      <CloseDialog open={confirmClose} onClose={() => setConfirmClose(false)} onConfirm={async () => void (await openAction.run({ shop_id: shopId, open: false }))} loading={openAction.pending} />
    </div>
  );
}

function CloseDialog({ open, onClose, onConfirm, loading }: { open: boolean; onClose: () => void; onConfirm: () => Promise<void>; loading: boolean }) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      destructive
      title="Close the shop?"
      description="Customers won't be able to join the queue. People already in today's queue keep their tokens."
      confirmLabel="Close shop"
    />
  );
}

function StatusTile({
  title,
  state,
  tone,
  description,
  action,
}: {
  title: string;
  state: string;
  tone: "success" | "warning" | "neutral";
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-xs font-bold tracking-wider text-ink-500 uppercase">{title}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold",
          tone === "success" && "text-success-700",
          tone === "warning" && "text-warning-700",
          tone === "neutral" && "text-ink-700",
        )}
      >
        {state}
      </p>
      <p className="mt-1 text-sm text-ink-500">{description}</p>
      <div className="mt-4">{action}</div>
    </div>
  );
}
