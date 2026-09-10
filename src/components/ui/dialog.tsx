"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** Prevent closing via backdrop/Escape (e.g. while submitting). */
  locked?: boolean;
}

const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" };

/**
 * Accessible modal built on the native <dialog> element: focus trap, Escape,
 * backdrop, inert background and scroll lock are provided by the platform.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = "md", locked }: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descId = React.useId();

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (!locked) onClose();
      }}
      onClick={(e) => {
        if (locked) return;
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        // A capped height with an internally scrolling body keeps long forms
        // usable on small screens without the footer sliding out of reach.
        // The layout keys off the [open] attribute rather than the :open
        // pseudo-class, which older browsers don't match on <dialog> — without
        // it the flex column silently degrades and the body overlaps the footer.
        "fixed inset-0 m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface p-0 text-ink-950 shadow-pop [&[open]]:flex [&[open]]:animate-fade-up",
        sizes[size],
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 p-5 pb-0">
        <div>
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description ? (
            <p id={descId} className="mt-1 text-sm text-ink-500">
              {description}
            </p>
          ) : null}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close dialog" disabled={locked}>
          <X />
        </Button>
      </div>
      {children ? <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div> : <div className="h-5 shrink-0" />}
      {footer ? (
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end">{footer}</div>
      ) : null}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  loading,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      locked={loading}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={() => void onConfirm()} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
