import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const revalidate = 3600;

/** Public pages only: discovery and every approved shop. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${appUrl}/dashboard`, changeFrequency: "hourly", priority: 1 },
    { url: `${appUrl}/shop/register`, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const supabase = await createClient();
    const { data } = await supabase.from("shops").select("id, updated_at").eq("status", "approved").limit(5000);
    return [
      ...staticEntries,
      ...(data ?? []).map((shop) => ({
        url: `${appUrl}/shops/${shop.id}`,
        lastModified: new Date(shop.updated_at),
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    // A database hiccup shouldn't break the sitemap entirely.
    return staticEntries;
  }
}
