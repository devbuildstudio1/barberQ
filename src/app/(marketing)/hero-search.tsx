"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LocateFixed, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/use-geolocation";

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const geo = useGeolocation();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (geo.location) {
      params.set("lat", String(geo.location.lat));
      params.set("lng", String(geo.location.lng));
      params.set("sort", "nearest");
    }
    router.push(`/shops${params.size ? `?${params}` : ""}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl bg-white p-2 shadow-pop sm:flex-row" role="search">
      <label className="sr-only" htmlFor="hero-q">
        Search shops or barbers
      </label>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-400" aria-hidden />
        <input
          id="hero-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search shop or barber name"
          className="h-12 w-full rounded-lg bg-transparent pr-3 pl-10 text-base text-ink-950 placeholder:text-ink-400 focus:outline-none"
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="lg"
        onClick={geo.request}
        loading={geo.status === "locating"}
        className="justify-start text-ink-700 sm:justify-center"
        aria-label={geo.location ? "Using your current location" : "Use my location"}
      >
        <LocateFixed className={geo.location ? "text-brand-600" : undefined} />
        <span className="sm:hidden lg:inline">{geo.location ? "Near me" : "Use location"}</span>
      </Button>
      <Button type="submit" size="lg" className="sm:px-8">
        Find a Barber
      </Button>
    </form>
  );
}
