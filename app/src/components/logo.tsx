import Link from "next/link";
import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

export const APP_NAME = "QueueCut";

export function Logo({ className, href = "/", light }: { className?: string; href?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-bold tracking-tight", className)} aria-label={`${APP_NAME} home`}>
      <span className="flex size-8 items-center justify-center rounded-md bg-brand-600 text-white">
        <Scissors className="size-4" aria-hidden />
      </span>
      <span className={cn("text-lg", light ? "text-white" : "text-ink-950")}>{APP_NAME}</span>
    </Link>
  );
}
