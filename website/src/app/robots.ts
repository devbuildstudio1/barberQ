import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Static export: emit this as a file at build time rather than a route handler.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
