import { ShopCardSkeleton } from "@/components/customer/shop-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShopsLoading() {
  return (
    <div className="container-page py-6 sm:py-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
      <Skeleton className="mt-5 h-11 w-full" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ShopCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
