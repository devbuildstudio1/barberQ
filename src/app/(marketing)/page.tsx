import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <section className="container-page py-20">
      <h1 className="text-4xl font-bold tracking-tight">No more waiting in line.</h1>
      <p className="mt-3 max-w-xl text-lg text-ink-600">
        Join your barber&apos;s queue from anywhere, get a digital token and track your turn live.
      </p>
      <Link href="/shops" className={`${buttonVariants({ size: "lg" })} mt-8`}>
        Find a Barber
      </Link>
    </section>
  );
}
