"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="container-page flex flex-1 items-center justify-center py-20">
      <EmptyState
        variant="error"
        icon={<AlertTriangle />}
        title="Something went wrong"
        description="We hit an unexpected error. Please try again."
        action={<Button onClick={reset}>Try again</Button>}
        className="w-full max-w-md"
      />
    </main>
  );
}
