import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/dashboard", "/shops/"],
        // Personal and operational areas add no value to search results.
        disallow: ["/api/", "/admin", "/shop/", "/my-queue", "/notifications", "/profile", "/login", "/register", "/verify"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
