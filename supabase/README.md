# Database

Postgres via Supabase. Migrations are forward-only SQL; RLS is the tenant boundary.

```
supabase/
├── config.toml     local stack configuration
├── seed/*.sql      seed files, listed in config.toml's [db.seed] sql_paths
├── migrations/     forward-only SQL, timestamp-prefixed
└── tests/          pgTAP tests, primarily RLS policy assertions
```

## Rules

1. **Every organisation-scoped table:** `organisation_id uuid not null`, RLS enabled, at least one policy, and a pgTAP test asserting the policy restricts. A table with RLS enabled and no policy denies everything; a table without RLS enabled denies nothing — the second mistake is the one that leaks.
2. **Forward-only.** A migration that has run anywhere but your machine is corrected by a new migration, never by editing the old one.
3. **Money columns are `bigint` kobo, suffixed `_kobo`** so the unit is unmissable (PRD §10.1).
4. **Contractual dates are `date`.** A rent due date must not shift with a timezone. Event timestamps are `timestamptz` in UTC (§10.6).
5. **Append-only financial tables.** `payments`, `payment_allocations`, `landlord_ledger_entries` get triggers and column grants that prevent amount-changing updates and deletes — the invariant belongs in the database, not only in application code ([ADR 0004](../docs/decisions/0004-append-only-financial-history.md)).
6. **Receipt numbers come from a server-side sequence** per organisation (per branch where configured). Never client-assigned (RENT-13).
7. **`snake_case`, plural table names.** British spelling in domain names, matching the PRD: `organisations`, not `organizations`.

## Seed data

Seed files are listed in `config.toml` under `[db.seed] sql_paths`, in
dependency order. They are **not** included from one entrypoint with psql's
`\ir`: the CLI sends the seed as a batch over the wire, where a meta-command is
a syntax error — which only shows up under `supabase start`, not under a psql
harness.

Seed data creates at least two organisations with deliberately similar-looking tenants, properties and amounts, so a cross-tenant bug shows up as obviously wrong data rather than as plausible data.

Never seed from a production extract. A real customer record in a seed file is a data-protection incident, not a convenience.

## Tests

`tests/` holds pgTAP tests, run by `supabase test db`. Their main job is asserting that policies restrict as intended — a policy regression caught at the database rather than inferred from an application failure.

The broader cross-tenant suite lives in `packages/db/src/__tests__/isolation/` and runs as a required CI job (PRD §16.2).

## Commands

```bash
pnpm db:start                      # start the local stack
pnpm db:reset                      # re-apply migrations and seed
pnpm db:diff -- descriptive_name   # capture local schema changes as a migration
pnpm db:lint                       # schema lint, including RLS checks
pnpm db:types                      # regenerate types into packages/db
```
