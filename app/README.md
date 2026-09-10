# @queuecut/app

The product: customer queue experience, shop owner dashboard and admin console.

```bash
pnpm dev             # http://localhost:3000   (from the repository root)
```

See the root `README.md` for architecture, the queue state machine, environment variables and demo
accounts.

## Layout

```
src/
  app/
    (marketing)/   landing page
    (auth)/        login, register, verify, shop + admin login
    (customer)/    discovery, shop details, join queue, my-queue, notifications, profile
    (shop)/shop/   owner dashboard, queue board, barbers, services, settings
    (admin)/admin/ dashboard, shops, users, barbers, queues, reviews, reports
    api/           REST route handlers
  components/      ui kit, layout, customer, shop, admin, queue, forms
  hooks/           realtime queue, notifications, geolocation, action runner
  lib/
    supabase/      browser, server and proxy clients; realtime channel registry
    auth/          session, profile, guards, auth server actions
    queue/         queue server actions and read models
    shops/         discovery queries and shop/barber/service actions
    admin/         admin queries and moderation actions
    recommendations/ ranking score (isolated, swappable)
    validation/    Zod schemas shared by forms, actions and routes
    errors/        error codes, user-facing messages, safe mapping
tests/
  unit/            pure logic
  integration/     against a real Postgres
  e2e/             Playwright, desktop and mobile
```

## Rules

- Never mutate `queue_entries` from application code. Every transition goes through the
  `SECURITY DEFINER` functions in `supabase/migrations/*_functions.sql`.
- Never add a service-role client here. Runtime queries run as the signed-in user so RLS is in force.
- Authorization is checked in the database; `src/proxy.ts` is routing convenience, not a boundary.
- Map failures to a code in `src/lib/errors`; raw Postgres messages must never reach the UI.
