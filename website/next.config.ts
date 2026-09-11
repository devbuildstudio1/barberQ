import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Fully static build: the marketing site is deployed as Cloudflare Workers
  // static assets, so it keeps serving even if the app or database is down.
  output: "export",
  images: {
    // `next/image` optimisation needs a server; a static export has none.
    unoptimized: true,
  },
  // Security headers cannot come from `headers()` in a static export — they are
  // served by Cloudflare from `public/_headers` instead.
};

export default nextConfig;
