import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache override: OpenNext falls back to its "dummy" cache, so the
// Worker needs no R2 bucket. `revalidate` pages (the marketing page, the sitemap)
// re-render per isolate instead of sharing a cache. To share one, enable R2, create
// a bucket, bind it as NEXT_INC_CACHE_R2_BUCKET in wrangler.jsonc and set
// `incrementalCache` to the r2-incremental-cache override.
export default defineCloudflareConfig({});
