"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ShopAreaError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      variant="error"
      icon={<AlertTriangle />}
      title="Something went wrong"
      description="We couldn't load this page. Your queue data is safe."
      action={<Button onClick={reset}>Try again</Button>}
      className="mx-auto max-w-md"
    />
  );
}
