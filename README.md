# QueueCut — Barber Queue Management Platform

Customers find nearby barber shops, compare live wait times, join a queue remotely and track their
token in real time. Shop owners run the day's queue from one screen. Admins approve shops and watch
platform activity.

Built with Next.js (App Router), TypeScript, Tailwind CSS and Supabase (PostgreSQL, Auth, Realtime,
Storage).

---

## Quick start

```bash
pnpm install
pnpm supabase start          # boots Postgres, Auth, Realtime, Storage in Docker
cp .env.example .env.local   # then paste the keys printed by `supabase start`
pnpm db:reset                # applies migrations and seeds demo data
pnpm dev
```

Open http://localhost:3000.

### Demo accounts

Created by `supabase/seed.sql`. Local development only.

| Role | Sign in with | Credentials |
| --- | --- | --- |
| Customer | Phone OTP at `/login` | `9000000001` … `9000000007`, code `123456` |
| Shop owner | Email at `/shop/login` | `owner1@queuecut.dev` … `owner6@queuecut.dev` / `Password123!` |
| Admin | Email at `/admin/login` | `admin@queuecut.dev` / `Password123!` |

The fixed OTP codes come from `[auth.sms.test_otp]` in `supabase/config.toml`. Adding a number there
requires restarting the stack (`pnpm supabase stop && pnpm supabase start`); a database reset alone
does not reload auth configuration.

---

## Architecture

```
Browser ──► Next.js (Server Components, Server Actions, Route Handlers)
                │
                └──► Supabase Postgres
                       ├─ Row Level Security on every table
                       ├─ SECURITY DEFINER functions for queue transitions
                       └─ Realtime (Postgres changes) ──► Browser
```

Three decisions shape everything else.

**All queue mutations live in the database.** `join_queue`, `call_next`, `start_service`,
`complete_service`, `cancel_queue_entry` and `mark_no_show` are `SECURITY DEFINER` functions. Clients
hold no `INSERT`/`UPDATE` grants on `queue_entries`, so the state machine, ownership checks and token
allocation cannot be bypassed by any client — including a future mobile app talking to Supabase
directly. Token numbers are allocated under a row lock on the queue, and a partial unique index is
the last line of defence against a customer holding two active tokens at one shop on one day.

**Authorization is enforced in Postgres, not the UI.** Every table has RLS enabled and denies by
default. The edge proxy (`src/proxy.ts`) only avoids rendering pages a user can't use; it is never
the security boundary. The application has no service-role client, so every runtime query runs as the
signed-in user.

**Realtime carries change signals, not data.** Customers subscribe to the public `queues` row (no
personal data) plus their own `queue_entries` row. A change invalidates a React Query cache entry,
which refetches through a `SECURITY DEFINER` read model. Other customers' names and phone numbers are
never on the wire. Channels are ref-counted and watched (`src/lib/supabase/realtime.ts`) so a dropped
socket cannot silently leave the UI stale.

### Layout

```
src/
  app/
    (marketing)/      landing page
    (auth)/           login, register, verify, shop + admin login
    (customer)/       discovery, shop details, join queue, my-queue, notifications, profile
    (shop)/shop/      owner dashboard, queue board, barbers, services, settings
    (admin)/admin/    dashboard, shops, users, barbers, queues, reviews, reports
    api/              REST route handlers
  components/         ui kit, layout, customer, shop, admin, queue, forms
  hooks/              realtime queue, notifications, geolocation, action runner
  lib/
    supabase/         browser, server and proxy clients; realtime channel registry
    auth/             session, profile, guards, auth server actions
    queue/            queue server actions and read models
    shops/            discovery queries and shop/barber/service actions
    admin/            admin queries and moderation actions
    recommendations/  ranking score (isolated, swappable)
    validation/       Zod schemas shared by forms, actions and routes
    errors/           error codes, user-facing messages, safe mapping
supabase/
  migrations/         schema, functions, RLS, storage, realtime
  seed.sql            demo data
tests/
  unit/               pure logic
  integration/        against a real Postgres
  e2e/                Playwright, desktop and mobile
```

---

## The queue engine

States and the only permitted transitions:

```
WAITING ──► CALLED ──► SERVING ──► COMPLETED
   │           │
   │           └──► NO_SHOW
   ├──► CANCELLED
   └──► NO_SHOW
```

Every transition is validated server-side; an invalid one raises `INVALID_QUEUE_STATE`. Only one
customer can be `CALLED` or `SERVING` per queue at a time, so two staff members tapping "Call next"
simultaneously cannot both succeed.

A shop has one queue per barber per day, plus one shared "any barber" queue. Each gets its own token
prefix (`A-`, `B-`, `C-`…).

### Wait-time estimation

```
estimated_wait = (remaining time of the customer being served
                  + sum of durations of everyone ahead)
                 / number of available barbers
```

Implemented in `estimate_wait_minutes` and always presented as an estimate. It is deliberately
isolated so it can later be driven by observed service durations rather than the configured ones.

### Recommendation ranking

`src/lib/recommendations/score.ts` combines a review-count-weighted rating, distance, current wait,
review confidence and availability into one score. It is pure, unit-tested and swappable.

---

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public key; RLS protects the data |
| `SUPABASE_SERVICE_ROLE_KEY` | tooling only | Bypasses RLS. Never shipped to the client; used by tests and scripts |
| `NEXT_PUBLIC_APP_URL` | recommended | Canonical URL for metadata, Open Graph and sitemap |
| `NEXT_PUBLIC_MAPS_API_KEY` | optional | Google Maps embed. Without it a styled placeholder with directions is shown |

---

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build and serve |
| `pnpm typecheck` | TypeScript, no emit |
| `pnpm lint` | ESLint |
| `pnpm test` | Unit tests |
| `pnpm test:integration` | Integration tests against local Supabase |
| `pnpm test:e2e` | Playwright, desktop and mobile |
| `pnpm check` | typecheck + lint + unit tests |
| `pnpm db:reset` | Re-apply migrations and reseed |
| `pnpm db:types` | Regenerate `src/types/database.ts` from the schema |

Integration and E2E tests need the local Supabase stack running and expect the seed data.

---

## Deployment

1. Create a Supabase project and push the migrations (`supabase link`, then `supabase db push`).
2. Deploy to Vercel and set the environment variables above. Do not set the service role key there:
   the application does not use it.
3. Set `NEXT_PUBLIC_APP_URL` to the production URL.
4. Configure a real SMS provider under `[auth.sms]` and remove the `test_otp` block, which exists only
   for local development.
5. Add the production URL to the Supabase Auth redirect allow-list.

Security headers, image remote patterns and the Supabase image host are configured in
`next.config.ts`.

---

## Out of scope for this MVP

Payments, appointment booking, loyalty programmes, promotions, multi-branch management, in-app chat
and native mobile apps. The backend is API-first and all business rules live in the database, so a
mobile client can be added without reimplementing any of them.
