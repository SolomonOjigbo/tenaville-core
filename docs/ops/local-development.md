# Local development

## Prerequisites

- Node 24.3+ (`.nvmrc`) — `nvm use`
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

Both apps share one React major. `react-native` 0.87.1 requires React `^19.2.3`,
and Next 16 accepts `^19.0.0`, so there is no reason to split them — a split
React major would stop `packages/ui` and any shared hook from serving both.

The Node floor comes from `react-native` 0.87.1, whose `engines` are
`^22.13.0 || ^24.3.0 || >= 26.0.0`. Node 24 is the LTS line inside that range.

`expo-router` declares further peers (`react-native-screens`,
`react-native-safe-area-context`, `react-native-reanimated` and others). Install
them with `npx expo install <pkg>` when mobile work starts rather than by hand —
it resolves the versions that match the installed SDK.

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

## Verifying the schema without the full stack

`pnpm db:verify` (also `pnpm test:isolation`) runs `tools/db-verify.sh`: it starts a
throwaway `supabase/postgres` container, applies every migration, loads the seed,
and runs the pgTAP suite. It needs Docker but not the Supabase stack — useful
because `supabase start` pulls from `public.ecr.aws`, which rate-limits
anonymous pulls, and because it is the same sequence CI runs.

Two things that script knows which cost an afternoon to learn:

**Probe readiness over TCP, not the Unix socket.** The Postgres entrypoint runs
its init scripts against a temporary server listening only on the socket, then
shuts it down and starts the real one. `pg_isready` over the socket reports
ready _during_ init, so anything applied then lands on a server about to be
discarded — surfacing later as stale relation OIDs, `tuple concurrently
updated`, or `the database system is shutting down`. The init server never
listens on TCP.

**The image creates pg_graphql's event triggers without installing the
extension**, leaving them referencing `graphql.increment_schema_version()`.
Arbitrary DDL then fails with `could not open relation with OID`. Installing
`pg_graphql` repairs it, and matches hosted Supabase.

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
