# QueueCut — working notes

Read README.md first: it covers the architecture, commands and demo accounts.

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
- After changing the schema, run `pnpm db:reset` then `pnpm db:types`.
- After changing `supabase/config.toml` auth settings, restart the stack — `db reset` does not reload
  auth configuration.

## Checks before calling something done

```bash
pnpm check              # typecheck + lint + unit tests
pnpm test:integration   # needs the local stack
pnpm test:e2e           # needs the local stack and seed data
```
