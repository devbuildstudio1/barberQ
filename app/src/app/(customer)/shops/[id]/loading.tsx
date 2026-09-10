import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function ShopLoading() {
  return (
    <div className="container-page pt-4 sm:pt-6">
      <Skeleton className="aspect-[21/9] w-full rounded-xl sm:aspect-[16/6]" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-3 h-4 w-80" />
            <SkeletonText lines={3} className="mt-4 max-w-2xl" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </div>
        <div className="hidden lg:block">
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
