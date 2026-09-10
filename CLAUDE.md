# QueueCut — working notes

Read README.md first: it covers the workspace layout, architecture, commands and demo accounts.

## Workspace

pnpm workspace with two deployable packages and one shared database.

- `app/` — the product (customer queue, shop dashboard, admin). Port 3000.
- `website/` — public marketing site. Read-only public data, no auth. Port 3001.
- `supabase/` — migrations, seed and local config, shared by both.

All commands run from the repository root; `pnpm dev` starts the app, `pnpm dev:website` the site.
Database scripts (`db:reset`, `db:types`) live at the root because `supabase/` is shared.

## Rules that matter here

- **Never mutate `queue_entries` from application code.** Every transition goes through the
  `SECURITY DEFINER` functions in `supabase/migrations/*_functions.sql`. Clients have no write grants
  on that table, and the state machine, ownership checks and token allocation live there.
- **Never add a service-role client to `src/`.** Runtime queries always run as the signed-in user so
  RLS is in force. Privileged work belongs in the Supabase CLI, seeds or test fixtures.
- **Authorization is checked in the database.** `src/proxy.ts` only avoids rendering unusable pages;
  it is not a security boundary. Any new table needs RLS policies plus explicit grants.
- **Errors reach users through `AppError`.** Map failures to a code in `src/lib/errors`; raw Postgres
  messages must never surface in the UI.
- **The marketing site reads, never writes.** It uses the anon key on the server for data RLS already
  makes public (approved shops, `get_public_stats`), behind `revalidate` so pages stay cacheable.
  Every query goes through `website/src/lib/data.ts`, which falls back to static copy on failure so a
  database outage cannot take the site down. Never add auth, sessions or writes there.
- Calls to action deep-link into the app through `appLink` in `website/src/lib/config.ts`.
- After changing the schema, run `pnpm db:reset` then `pnpm db:types`.
- After changing `supabase/config.toml` auth settings, restart the stack — `db reset` does not reload
  auth configuration.

## Checks before calling something done

```bash
pnpm check              # typecheck + lint + unit tests
pnpm test:integration   # needs the local stack
pnpm test:e2e           # needs the local stack and seed data
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
