import { SearchX } from "lucide-react";
import { Cta } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700" aria-hidden>
        <SearchX className="size-6" />
      </span>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-950">Page not found</h1>
      <p className="mt-2 max-w-md text-ink-600">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Cta href="/" className="mt-6">
        Back to home
      </Cta>
    </div>
  );
}
