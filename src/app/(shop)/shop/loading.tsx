import { Skeleton } from "@/components/ui/skeleton";

export default function ShopAreaLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-56" />
      <Skeleton className="h-40" />
    </div>
  );
}
