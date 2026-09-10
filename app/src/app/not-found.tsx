import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main id="main" className="container-page flex flex-1 items-center justify-center py-20">
      <EmptyState
        icon={<SearchX />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Link href="/" className={buttonVariants()}>
            Back to home
          </Link>
        }
        className="w-full max-w-md"
      />
    </main>
  );
}
