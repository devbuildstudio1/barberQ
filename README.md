# QueueCut

Barber queue management platform. Customers find nearby shops, compare live wait times, join a queue
remotely and track their token in real time. Shop owners run the day's queue from one screen. Admins
approve shops and monitor activity.

This is a pnpm workspace with two deployable sites and one shared database.

```
.
├── app/          Product app — customer queue, shop dashboard, admin console
├── website/      Marketing site — what QueueCut is, features, pricing, contact
└── supabase/     Shared database: migrations, seed, local config
```

| Package | Runs on | What it is |
| --- | --- | --- |
| `app` | port 3000 | The product. Next.js App Router, Supabase auth, realtime queue, RLS |
| `website` | port 3001 | Public marketing site. Read-only public data, no auth |

They deploy separately: the website at the apex domain, the app at `app.` — the website's calls to
action deep-link into the app via `NEXT_PUBLIC_APP_URL`.

---

## Quick start

```bash
pnpm install
pnpm db:start                          # Postgres, Auth, Realtime, Storage in Docker
cp app/.env.example app/.env.local     # paste the keys printed by db:start
cp website/.env.example website/.env.local
pnpm db:reset                          # migrations + demo data

pnpm dev            # product app  → http://localhost:3000
pnpm dev:website    # marketing    → http://localhost:3001
```

### Demo accounts

Created by `supabase/seed.sql`. Local development only.

| Role | Sign in with | Credentials |
| --- | --- | --- |
| Customer | Phone OTP at `/login` | `9000000001` … `9000000007`, code `123456` |
| Shop owner | Email at `/shop/login` | `owner1@queuecut.dev` … `owner6@queuecut.dev` / `Password123!` |
| Admin | Email at `/admin/login` | `admin@queuecut.dev` / `Password123!` |

The fixed OTP codes come from `[auth.sms.test_otp]` in `supabase/config.toml`. Adding a number there
requires restarting the stack (`pnpm db:stop && pnpm db:start`); a database reset alone does not
reload auth configuration.

---

## Commands

Run from the repository root.

| Command | What it does |
| --- | --- |
| `pnpm dev` / `pnpm dev:website` | Development server for the app / the website |
| `pnpm build` | Build both packages |
| `pnpm typecheck` / `pnpm lint` | Across both packages |
| `pnpm test` | App unit tests |
| `pnpm test:integration` | App integration tests against local Supabase |
| `pnpm test:e2e` | Playwright, desktop and mobile |
| `pnpm check` | typecheck + lint + unit tests |
| `pnpm db:start` / `pnpm db:stop` | Local Supabase stack |
| `pnpm db:reset` | Re-apply migrations and reseed |
| `pnpm db:types` | Regenerate `app/src/types/database.ts` from the schema |

Integration and E2E tests need the local stack running with the seed data.

---

## Architecture

```
Browser ──► website ──► Supabase (read-only: approved shops, public stats)
       │
       └──► app ──► Supabase Postgres
                     ├─ Row Level Security on every table
                     ├─ SECURITY DEFINER functions for queue transitions
                     └─ Realtime (Postgres changes) ──► Browser
```

Three decisions shape everything else.

**All queue mutations live in the database.** `join_queue`, `call_next`, `start_service`,
`complete_service`, `cancel_queue_entry` and `mark_no_show` are `SECURITY DEFINER` functions. Clients
hold no `INSERT`/`UPDATE` grants on `queue_entries`, so the state machine, ownership checks and token
allocation cannot be bypassed by any client — including a future mobile app talking to Supabase
directly. Token numbers are allocated under a row lock, and a partial unique index is the last line of
defence against a customer holding two active tokens at one shop on one day.

**Authorization is enforced in Postgres, not the UI.** Every table has RLS enabled and denies by
default. The edge proxy (`app/src/proxy.ts`) only avoids rendering pages a user can't use; it is never
the security boundary. The app has no service-role client, so every runtime query runs as the
signed-in user.

**Realtime carries change signals, not data.** Customers subscribe to the public `queues` row (no
personal data) plus their own `queue_entries` row. A change invalidates a React Query cache entry,
which refetches through a `SECURITY DEFINER` read model. Other customers' names and numbers are never
on the wire. Channels are ref-counted and watched (`app/src/lib/supabase/realtime.ts`) so a dropped
socket cannot silently leave the UI stale.

### The queue engine

```
WAITING ──► CALLED ──► SERVING ──► COMPLETED
   │           │
   │           └──► NO_SHOW
   ├──► CANCELLED
   └──► NO_SHOW
```

Every transition is validated server-side; an invalid one raises `INVALID_QUEUE_STATE`. Only one
customer can be `CALLED` or `SERVING` per queue at a time, so two staff members tapping "Call next"
simultaneously cannot both succeed. A shop has one queue per barber per day plus a shared "any barber"
queue, each with its own token prefix (`A-`, `B-`, `C-`…).

Wait time is estimated as the remaining time of the customer being served, plus the durations of
everyone ahead, divided by the barbers on duty. It is always presented as an estimate and is isolated
in `estimate_wait_minutes` so it can later use observed durations instead of configured ones.

---

## Environment

`app/.env.local`

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public key; RLS protects the data |
| `SUPABASE_SERVICE_ROLE_KEY` | tooling only | Bypasses RLS. Never shipped to the client; used by tests and scripts |
| `NEXT_PUBLIC_APP_URL` | recommended | Canonical app URL for metadata and auth redirects |
| `NEXT_PUBLIC_MAPS_API_KEY` | optional | Google Maps embed. Without it a styled placeholder with directions is shown |

`website/.env.local`

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | yes | Where every call to action points |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical marketing URL for metadata and the sitemap |
| `NEXT_PUBLIC_SUPABASE_URL` | optional | Read-only access to the public shop directory and platform stats |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | optional | Same anon key as the app; RLS limits it to approved shops |

The marketing site degrades gracefully: with Supabase unset or unreachable it still builds and renders,
falling back to static copy and hiding the live shop strip. A database outage cannot take it down.

---

## Deployment

Both packages deploy to Vercel as separate projects from the same repository.

**Website** — root directory `website`, build `pnpm build`. Set `NEXT_PUBLIC_APP_URL` to the app's
domain, `NEXT_PUBLIC_SITE_URL` to its own, and the two public Supabase variables so the home page shows
real shops. Pages revalidate every five minutes rather than rendering per request.

**App** — root directory `app`, build `pnpm build`. Set the Supabase variables and
`NEXT_PUBLIC_APP_URL`. Do not set the service role key: the app does not use it.

**Database** — `supabase link` then `supabase db push` from the repository root. Configure a real SMS
provider under `[auth.sms]` and remove the `test_otp` block, which exists only for local development.
Add the app's production URL to the Supabase Auth redirect allow-list.

---

## Out of scope for this MVP

Payments, appointment booking, loyalty programmes, promotions, multi-branch management, in-app chat
and native mobile apps. The backend is API-first and all business rules live in the database, so a
mobile client can be added without reimplementing any of them.
