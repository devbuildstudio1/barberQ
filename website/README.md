# @queuecut/website

Public marketing site for QueueCut. Static, no database, no authentication: it exists to explain the
product and hand visitors to the app.

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
- No client-side data fetching. Pages should stay statically renderable so the marketing site is fast
  and indexable even when the app or database is down.
