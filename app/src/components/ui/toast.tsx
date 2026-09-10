"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  title: string;
  description?: string;
  kind?: ToastKind;
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, "title" | "kind">> {
  id: number;
  description?: string;
  duration: number;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (opts: ToastOptions) => {
      const id = ++counter;
      const item: ToastItem = {
        id,
        title: opts.title,
        description: opts.description,
        kind: opts.kind ?? "info",
        duration: opts.duration ?? (opts.kind === "error" ? 6000 : 4000),
      };
      setItems((prev) => [...prev.slice(-3), item]);
      window.setTimeout(() => dismiss(id), item.duration);
    },
    [dismiss],
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, kind: "success" }),
      error: (title, description) => toast({ title, description, kind: "error" }),
      info: (title, description) => toast({ title, description, kind: "info" }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end safe-bottom"
        aria-live="polite"
        aria-relevant="additions"
      >
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const icons: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="text-success-600" />,
  error: <AlertCircle className="text-danger-600" />,
  warning: <AlertTriangle className="text-warning-700" />,
  info: <Info className="text-brand-600" />,
};

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  return (
    <div
      role={item.kind === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-pop animate-toast-in",
      )}
    >
      <span className="mt-0.5 shrink-0 [&_svg]:size-5" aria-hidden>
        {icons[item.kind]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-950">{item.title}</p>
        {item.description ? <p className="mt-0.5 text-sm text-ink-600">{item.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-sm p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
        aria-label="Dismiss notification"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
