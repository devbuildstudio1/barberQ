# Deploying QueueCut to Cloudflare

Two Workers, one repository:

| Worker | Source | What it is |
| --- | --- | --- |
| `queuecut-app` | `app/` | The product. A Worker running the Next.js server through [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). |
| `queuecut-website` | `website/` | The marketing site. Static assets only — `next build` with `output: "export"`. No Worker script, so no invocation cost and no cold start. |

Everything below is done from the Cloudflare dashboard. The repository already
carries the configuration the dashboard needs (`wrangler.jsonc` in each package,
`open-next.config.ts` in `app/`).

## 1. Create the R2 bucket first

**R2 → Create bucket → `queuecut-app-cache`**

`app/wrangler.jsonc` binds this bucket as the incremental cache. The app's
`revalidate` pages (the marketing page, the sitemap) use it so revalidation is
shared across isolates instead of being per-instance. The first deploy fails if
the bucket does not exist.

## 2. Create the app Worker

**Workers & Pages → Create → Workers → Import a repository** → connect
`devbuildstudio1/barberQ`.

| Field | Value |
| --- | --- |
| Worker name | `queuecut-app` |
| Root directory | `app` |
| Build command | `cd .. && pnpm install --frozen-lockfile && cd app && pnpm exec opennextjs-cloudflare build` |
| Deploy command | `npx wrangler deploy` |

The build command installs from the repository root on purpose: `pnpm-lock.yaml`
lives there, and `app/` is a workspace package that cannot install on its own.

### Build variables (Settings → Build → Build variables and secrets)

`NEXT_PUBLIC_*` values are **inlined into the bundle at build time**. Setting them
only as runtime variables produces a build with `undefined` everywhere.

```
NEXT_PUBLIC_SUPABASE_URL       https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  <anon key>
NEXT_PUBLIC_APP_URL            https://queuecut-app.<subdomain>.workers.dev
NEXT_PUBLIC_MAPS_API_KEY       <browser-restricted key, or leave unset>
```

`app/next.config.ts` derives `images.remotePatterns` from
`NEXT_PUBLIC_SUPABASE_URL` at build time. Miss it and Supabase Storage images
fail in production.

**Never add `SUPABASE_SERVICE_ROLE_KEY` here or as a runtime variable.** It
bypasses Row Level Security and the application never reads it at runtime — it
exists for local tooling, seeds and test fixtures only.

`NEXT_PUBLIC_APP_URL` is a chicken-and-egg: you do not know the `workers.dev`
subdomain until the first deploy. Deploy once with it unset, read the URL off the
Worker, set the variable, then retry the deployment.

## 3. Create the website Worker

**Workers & Pages → Create → Workers → Import a repository** → same repository.

| Field | Value |
| --- | --- |
| Worker name | `queuecut-website` |
| Root directory | `website` |
| Build command | `cd .. && pnpm install --frozen-lockfile && cd website && pnpm exec next build` |
| Deploy command | `npx wrangler deploy` |

### Build variables

```
NEXT_PUBLIC_APP_URL            https://queuecut-app.<subdomain>.workers.dev
NEXT_PUBLIC_SITE_URL           https://queuecut-website.<subdomain>.workers.dev
NEXT_PUBLIC_SUPABASE_URL       https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  <anon key>
```

The site reads Supabase **at build time only**, and only data RLS already makes
public (approved shops). If the variables are unset it still builds and renders
fallback copy. `NEXT_PUBLIC_APP_URL` drives every call to action through
`appLink` in `website/src/lib/config.ts`, and `NEXT_PUBLIC_SITE_URL` drives
canonical URLs, the sitemap and `robots.txt`.

Because the site is a static export, the shop counts and platform numbers are
frozen at build time. Trigger a rebuild to refresh them — a deploy hook on a
schedule works if you want them current.

## 4. Point Supabase at the new origins

**Supabase dashboard → Authentication → URL Configuration**

- Site URL: the app's `workers.dev` URL (later, the custom domain).
- Redirect URLs: add the same origin. Sign-in, registration and email
  confirmation redirects all fail silently against an origin that is not listed.

## 5. Custom domains, later

**Worker → Settings → Domains & Routes → Add custom domain.** After adding one:

1. Update `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` build variables.
2. Update the Supabase Site URL and redirect allowlist.
3. Redeploy both Workers — the URLs are baked into the bundles.

## Things that differ from a Node deployment

**`src/proxy.ts` runs on Node middleware support that OpenNext marks
experimental.** The build prints:

> `WARN Node.js middleware support is experimental in cloudflare, and not officially maintained by OpenNext maintainers. Use at your own risk.`

Next 16 renamed middleware to Proxy and forces it onto the Node.js runtime — the
`runtime` config option is rejected in a Proxy file, so there is no opting out.
Exercise the auth redirects (`/my-queue`, `/shop/*`, `/admin/*` while signed out)
on the deployed Worker before trusting it. This is a rendering concern, not a
security one: real authorization lives in the database behind RLS.

**Proxy runs at the origin, not at the edge.** A redirect for a signed-out user
now costs a round trip to the origin region.

**Image optimization goes through the `IMAGES` binding** (Cloudflare Images),
bound in `app/wrangler.jsonc`. There is no `sharp` on Workers. Transformations
are billed per request — to opt out instead, set `images: { unoptimized: true }`
in `app/next.config.ts` and drop the binding.

**The website's security headers moved.** `headers()` in `next.config.ts` is not
supported in a static export, so they are served by Cloudflare from
`website/public/_headers`. The app still sets its headers through
`app/next.config.ts`, which works normally on a Worker.

## Deploying by hand

With `wrangler` authenticated locally:

```bash
pnpm deploy:app        # opennextjs-cloudflare build && deploy --keep-vars
pnpm deploy:website    # next build && wrangler deploy --keep-vars
```

`--keep-vars` stops a CLI deploy from wiping variables set in the dashboard.

Preview the app Worker locally, on `workerd` rather than Node:

```bash
pnpm --filter @queuecut/app preview
```

Local development is unchanged — `pnpm dev` and `pnpm dev:website` still run the
normal Next.js dev server.
