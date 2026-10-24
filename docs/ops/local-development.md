# Local development

## Prerequisites

- Node 22.12+ (`.nvmrc`) — `nvm use`
- pnpm 10 — `corepack enable && corepack prepare pnpm@10.33.0 --activate`
- Docker, running (the local Supabase stack needs it)
- Supabase CLI via `npx supabase` (pinned as a dev dependency)

## First run

```bash
pnpm install
cp .env.example .env.local
pnpm db:start
```

`pnpm db:start` prints the local API URL, anon key and service-role key. Put them in `.env.local`. The local keys are fixed per machine and are not secrets, but `.env.local` is gitignored regardless — the habit matters more than the particular file.

```bash
pnpm db:reset   # apply migrations and seed
pnpm dev        # web on :3000, mobile via Expo
```

## A note on install

pnpm 10 blocks dependency build scripts by default. The Supabase CLI installs its
binary in a `postinstall`, so `package.json` lists it (and esbuild) under
`pnpm.onlyBuiltDependencies`. Without that entry `pnpm db:start` fails with
`supabase: not found` after an apparently successful install.

The two apps pin React differently on purpose: `react-native` 0.74.5 requires
React 18.2.0 exactly, while the web app is free to move ahead.

## Everyday commands

```bash
pnpm dev                  # all apps via turbo
pnpm --filter @tenaville/web dev
pnpm --filter @tenaville/mobile dev

pnpm db:diff -- add_lease_renewal   # generate a migration from local schema changes
pnpm db:reset                       # re-apply migrations + seed from scratch
pnpm db:types                       # regenerate Postgres types into packages/db
pnpm db:lint                        # Supabase schema lint, including RLS checks

pnpm lint && pnpm typecheck && pnpm test
pnpm test:isolation       # cross-tenant isolation suite
pnpm docs:reqs            # traceability vs the PRD
```

## Working on a migration

1. Change the schema locally, or write the SQL by hand.
2. `pnpm db:diff -- descriptive_name` to capture it in `supabase/migrations/`.
3. Add RLS: enable it on the new table and write a policy. A table with RLS enabled and no policy denies everything; a table **without** RLS enabled denies nothing — the second mistake is the dangerous one.
4. Add a pgTAP test in `supabase/tests/` asserting the policy actually restricts.
5. Extend the isolation suite in `packages/db/src/__tests__/isolation/` for the new table.
6. `pnpm db:reset && pnpm db:lint && pnpm test:isolation`.
7. `pnpm db:types` so application types match.

Migrations are forward-only. A mistake in a migration that has run anywhere other than your machine is fixed by a new migration, not by editing the old one.

## Seed data

`supabase/seed/` creates at least two organisations with deliberately similar-looking data, so an isolation bug is visible rather than plausible. It contains no real customer data, ever — a production extract in a seed file is a data-protection incident.
