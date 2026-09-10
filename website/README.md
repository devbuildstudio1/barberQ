# @queuecut/website

Public marketing site for QueueCut. It explains the product, shows real shops and real platform
numbers, and hands visitors to the app. No authentication, no writes.

```bash
pnpm dev:website     # http://localhost:3001   (from the repository root)
```

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Hero, how it works, customer features, shop pitch, social proof |
| `/features` | Full feature breakdown for customers and shops |
| `/for-barbers` | Onboarding steps, benefits, pricing and FAQ |
| `/about` | Why the product exists |
| `/contact` | Support, sales and shop registration routes |
| `/privacy`, `/terms` | Legal |

`robots.txt` and `sitemap.xml` are generated from `src/app/robots.ts` and `src/app/sitemap.ts`.

## Conventions

- Every call to action points at the product app through `appLink` in `src/lib/config.ts`, which is
  driven by `NEXT_PUBLIC_APP_URL`. Never hardcode an app URL in a page.
- Brand copy lives in `BRAND` in the same file so names, contact details and the tagline change once.
- Design tokens in `src/app/globals.css` mirror the app's. Keep them in step when the brand changes;
  the site deliberately has no build-time dependency on product code.
- Data comes from Supabase on the server via `src/lib/data.ts`, using the anon key and only data Row
  Level Security already makes public: approved shops and the `get_public_stats` aggregates. Pages set
  `revalidate` so they stay cacheable instead of hitting the database per request.
- Every query must degrade gracefully. If Supabase is unset, slow or unreachable the helpers return
  fallbacks and the page hides live sections, so the marketing site survives a database outage.
- No client-side data fetching, no auth, no writes. If a page needs a session, it belongs in the app.
