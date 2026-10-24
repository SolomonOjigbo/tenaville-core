# @tenaville/db

Supabase clients, generated Postgres types, and the cross-tenant isolation suite.

```
src/
├── clients/      browser, server (user-scoped), and admin (service-role) clients
├── generated/    database.types.ts — generated, never hand-edited
└── __tests__/
    └── isolation/  the required-in-CI cross-tenant suite
```

## Three clients, three different risks

**Browser client** — anon key, user's session, RLS applies. Safe in client components.

**Server client** — the user's session resolved from cookies, RLS applies. The default for route handlers and server components.

**Admin client** — service-role key, **RLS does not apply**. For migrations and background jobs only. Using it to serve a user-initiated read removes tenant isolation silently and completely: no error, no log, just another organisation's data in the response. ESLint flags references to the key; a legitimate use needs an inline disable and a comment explaining why ([ADR 0002](../../docs/decisions/0002-supabase-postgres-rls.md)).

A background job that uses the admin client carries its own explicit organisation scoping. "It's a job, RLS doesn't apply" is the start of the reasoning, not the end of it.

## Generated types

`src/generated/database.types.ts` comes from `pnpm db:types`. Never edit it. If application types and the schema disagree, the schema is right — regenerate.

## Isolation tests

`src/__tests__/isolation/` runs as a required CI job via `pnpm test:isolation`. PRD §16.2 requires these to pass on every release.

The suite seeds at least two organisations with deliberately similar data and asserts, for every organisation-scoped table, that:

- organisation A's session cannot read, insert into, update or delete organisation B's rows;
- a landlord session reaches only their own assigned properties, statements and balances (OWN-3, LEDGER-5);
- a tenant session reaches only their own tenancy and lease (TENANT-1);
- analytics queries and exports apply the same restrictions as the main application (AN-13).

New table, new test. The PR template asks for it, and `supabase db lint` plus the pgTAP tests in `supabase/tests/` catch the table that shipped without RLS enabled.
