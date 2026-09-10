import Link from "next/link";
import { Store } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ShopNotFound() {
  return (
    <div className="container-page py-16">
      <EmptyState
        icon={<Store />}
        title="Shop not found"
        description="This shop doesn't exist, isn't approved yet, or has been removed."
        action={
          <Link href="/shops" className={buttonVariants()}>
            Browse barbers
          </Link>
        }
        className="mx-auto max-w-md"
      />
    </div>
  );
}
