import { Skeleton } from "@/components/ui/skeleton";

export default function MyQueueLoading() {
  return (
    <div className="container-page max-w-2xl py-6 sm:py-10">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <Skeleton className="h-40 rounded-none" />
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-2.5" />
          <Skeleton className="h-20" />
          <Skeleton className="h-11" />
        </div>
      </div>
    </div>
  );
}
