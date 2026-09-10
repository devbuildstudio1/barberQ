import { MapPin, Navigation } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { directionsUrl } from "@/lib/utils/geo";
import { cn } from "@/lib/utils";

interface MapViewProps {
  lat: number | null;
  lng: number | null;
  label: string;
  address?: string;
  className?: string;
}

/**
 * Map abstraction. With NEXT_PUBLIC_MAPS_API_KEY set, renders a Google Maps
 * embed; otherwise a clean placeholder with a directions link. Swap the
 * implementation here to move to Mapbox or an interactive SDK later.
 */
export function MapView({ lat, lng, label, address, className }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;
  const hasCoords = lat != null && lng != null;

  if (apiKey && hasCoords) {
    const src = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${lat},${lng}&zoom=16`;
    return (
      <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
        <iframe title={`Map showing ${label}`} src={src} className="aspect-[16/9] w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex aspect-[16/9] w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-sunken text-center",
        className,
      )}
      role="img"
      aria-label={`Map placeholder for ${label}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden
      />
      <div className="relative z-10 flex flex-col items-center gap-2 px-4">
        <span className="flex size-10 items-center justify-center rounded-full bg-brand-600 text-white shadow-pop">
          <MapPin className="size-5" aria-hidden />
        </span>
        <p className="text-sm font-semibold text-ink-900">{label}</p>
        {address ? <p className="max-w-xs text-xs text-ink-500">{address}</p> : null}
        <a
          href={directionsUrl(lat, lng, `${label} ${address ?? ""}`)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1")}
        >
          <Navigation /> Get directions
        </a>
      </div>
    </div>
  );
}
