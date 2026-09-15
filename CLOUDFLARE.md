# Deploying QueueCut to Cloudflare

Two Workers, one repository:

| Worker | Source | What it is |
| --- | --- | --- |
| `barberq-app` | `app/` | The product. A Worker running the Next.js server through [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). |
| `barberq-website` | `website/` | The marketing site. Static assets only — `next build` with `output: "export"`. No Worker script, so no invocation cost and no cold start. |

Everything below is done from the Cloudflare dashboard. The repository already
carries the configuration the dashboard needs (`wrangler.jsonc` in each package,
`open-next.config.ts` in `app/`).

## 1. Create the app Worker

**Workers & Pages → Create → Workers → Import a repository** → connect
`devbuildstudio1/barberQ`.

| Field | Value |
| --- | --- |
| Worker name | `barberq-app` |
| Root directory | `app` |
| Build command | `pnpm exec opennextjs-cloudflare build` |
| Deploy command | `npx wrangler deploy` |

Cloudflare installs dependencies from the repository root before the build command
runs, so the command only builds. It must be the OpenNext build, not `pnpm run build`:
plain `next build` leaves no `.open-next/` and `wrangler deploy` then fails with
"Could not find compiled Open Next config".

### No R2 cache

`app/open-next.config.ts` sets no incremental cache, so OpenNext uses its built-in
`dummy` cache and the Worker needs no R2 bucket. The trade-off: `revalidate` pages
(the marketing page, the sitemap) re-render per isolate instead of sharing a cache.
To share one, enable R2, create a bucket, bind it as `NEXT_INC_CACHE_R2_BUCKET` in
`app/wrangler.jsonc` and set `incrementalCache` to the `r2-incremental-cache` override.

### Build variables (Settings → Build → Build variables and secrets)

`NEXT_PUBLIC_*` values are **inlined into the bundle at build time**. Setting them
only as runtime variables produces a build with `undefined` everywhere.

```
NEXT_PUBLIC_SUPABASE_URL       https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  <anon key>
NEXT_PUBLIC_APP_URL            https://barberq-app.<subdomain>.workers.dev
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

## 2. Create the website Worker

**Workers & Pages → Create → Workers → Import a repository** → same repository.

| Field | Value |
| --- | --- |
| Worker name | `barberq-website` |
| Root directory | `website` |
| Build command | `cd .. && pnpm install --frozen-lockfile && cd website && pnpm exec next build` |
| Deploy command | `npx wrangler deploy` |

### Build variables

```
NEXT_PUBLIC_APP_URL            https://barberq-app.<subdomain>.workers.dev
NEXT_PUBLIC_SITE_URL           https://barberq-website.<subdomain>.workers.dev
```

The site is fully static and never talks to Supabase, so it needs no database
variables. `NEXT_PUBLIC_APP_URL` drives every call to action through
`appLink` in `website/src/lib/config.ts`, and `NEXT_PUBLIC_SITE_URL` drives
canonical URLs, the sitemap and `robots.txt`.

## 3. Point Supabase at the new origins

**Supabase dashboard → Authentication → URL Configuration**

- Site URL: the app's `workers.dev` URL (later, the custom domain).
- Redirect URLs: add the same origin. Sign-in, registration and email
  confirmation redirects all fail silently against an origin that is not listed.

## 4. Custom domains, later

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

## Troubleshooting

**Build fails with `Missing/invalid public environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY`,
usually while prerendering `/shop/register`.**

The variables are not reaching `next build`. Almost always they were set under
Settings → Variables & Secrets, which is runtime-only, instead of Settings →
Build → Build variables and secrets. `NEXT_PUBLIC_*` is inlined during the build,
so a runtime value never reaches the code.

The page named in the error is incidental: it is simply the first route whose
render touches the environment. `getCurrentProfile()` throws before `cookies()`
is reached, so Next.js cannot mark the route dynamic and reports it as a
prerender failure.

**A deploy succeeds but the Worker you configured stays empty.**

`wrangler deploy` takes the Worker name from `wrangler.jsonc`, not from the
dashboard. If they disagree it creates a second Worker under the name in the
file. Keep `name` in `app/wrangler.jsonc` and `website/wrangler.jsonc` matching
the Workers you created, along with the `WORKER_SELF_REFERENCE` service name.

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
