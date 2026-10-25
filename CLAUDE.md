# Tenaville — working notes

Property-management SaaS for Nigerian agencies and landlords. Multi-tenant. The source of truth for scope is [PRD v3](docs/prd/Tenaville_Property_Management_PRD_v3.md); this file holds the rules that are costly to discover late.

## Stack

TypeScript everywhere. Next.js App Router (`apps/web`) with route handlers as the API. Expo/React Native staff app (`apps/mobile`). Supabase: Postgres with Row-Level Security, Auth, private Storage buckets. pnpm workspaces + Turborepo.

Modular monolith, not microservices. Domain modules in `packages/core/src/modules/`, one per PRD section 8 area.

## Non-negotiable invariants

Breaking any of these is a correctness bug, not a style preference. Each is a PRD requirement and several are launch exit criteria (§16.2).

1. **Money is integer kobo.** Never a float, never a JS `number` for arithmetic that must be exact. Postgres `bigint`. Use `@tenaville/money` — do not hand-roll kobo maths. (§10.1)
2. **Financial history is append-only.** Payments, allocations and ledger entries are corrected by a linked reversal or adjustment. No `UPDATE` that changes an amount, no `DELETE`. (§10.2, RENT-4)
3. **Client funds are separate from agency income** in the schema, the permissions and the reports — not just in a report filter. Caution deposits are client funds with their own lifecycle. (LEDGER-4, LEASE-13)
4. **Allocations reconcile.** The sum of a payment's allocations equals the payment amount; a charge's paid balance is derived from allocations, never stored independently and trusted. (§10.4)
5. **Receipt numbers are sequential per organisation and never reused** — voided receipts keep their number. Gaps or duplicates in pilot data are a launch blocker. (RENT-13)
6. **Issued statements are immutable.** Corrections are numbered revisions referencing the original. (LEDGER-8)
7. **Tenant isolation is enforced in the database.** Every organisation-scoped table has RLS enabled and a policy. Application-layer filtering is a second line of defence, never the only one. The service-role key must not serve a user-initiated read. (ORG-8)
8. **Offline writes are server-authoritative.** Client-generated IDs, idempotent sync, provisional receipts until the server assigns the number. Last-writer-wins is forbidden for payments, allocations and ledger entries. (MOB-3, MOB-4, §10.16)
9. **Timestamps are stored UTC, displayed in West Africa Time.** Contractual due dates are calendar dates, not timestamps — a rent due date must not shift with a timezone. (§10.6)
10. **No document is reachable through a guessable URL.** Private buckets, authorisation checked at download time, time-limited signed links. (DOC-7)
11. **Sensitive identifiers (NIN, BVN) are collected only where lawful and necessary**, masked by default, access audited. Prefer a provider's pass/fail verification result over storing the identifier. (SCREEN-15)
12. **Recorded ≠ confirmed.** A manually recorded payment is labelled differently from a partner-confirmed one. Never present an unconfirmed payment as confirmed. (RENT-12)
13. **Financing status is never rent payment status.** A financing approval does not mark rent paid; only a confirmed, reconciled disbursement does. (FIN-8, §10.12)
14. **No public marketplace.** No search-indexable property record, no public listing page. Unit sheets are unguessable, expiring, `noindex` links. (PROP-9, PROP-10)
15. **Audit the sensitive paths:** financial changes, lease changes, screening decisions, sensitive document access, maintenance approvals, permission changes — actor, time, before/after, and the reason for any override. (ORG-5)

## Module boundaries

- A module is entered through its `application/` layer only. Do not query another module's tables or import its `infrastructure/`.
- `domain/` has no I/O. It holds entities, value objects and invariants, and is the easiest place to unit-test a rule.
- Route handlers in `apps/web/src/app/api` validate with `@tenaville/validation` and delegate. Business logic in a route handler is misplaced.
- Providers (WhatsApp, SMS, email, payments, financing, identity) sit behind ports in `packages/adapters`. Swapping a provider must not touch domain code — WhatsApp template rejection and messaging price changes are expected, not hypothetical (PRD risk table).

## Release gating

P0 → R1, P1 → R2, P2 → R3. Features ahead of their release sit behind the `FEATURE_*` flags in `.env.example`, default off. Nothing in R1 or R2 may depend on the financing module (PRD §8.12).

If capacity is short, the PRD's cut order (§16.1) applies: protect money, ledger, migration and mobile payments first; defer tenant-portal extras, then inspections, maintenance expansion, analytics beyond operational reports, CRM and appointments, screening, then financing.

## Conventions

- Database: `snake_case` tables and columns, plural table names, `organisation_id` on every scoped table, `created_at`/`updated_at` as `timestamptz`.
- Migrations are forward-only SQL in `supabase/migrations/`. Every new table arrives with RLS enabled, a policy, and a pgTAP test in `supabase/tests/`.
- British spelling in domain names and user-facing copy, matching the PRD (`organisation`, not `organization`).
- Nigeria-first formats: NGN, Nigerian phone numbers, state and LGA fields, WAT display.
- Tests: Vitest for unit and integration. Database and isolation tests are pgTAP in `supabase/tests/`, run by `pnpm test:isolation` (which spins a throwaway container via `tools/db-verify.sh`) and as a required CI job.

## Commands

```bash
pnpm dev              # all apps
pnpm db:start         # local Supabase stack
pnpm db:reset         # re-apply migrations + seed
pnpm db:diff -- name  # generate a migration from local schema changes
pnpm db:types         # regenerate Postgres types into packages/db
pnpm test:isolation   # migrations + seed + pgTAP in a throwaway container
pnpm docs:reqs        # traceability and sprint backlog consistency
```

## Before opening a PR

Name the requirement IDs you implemented, update [traceability.md](docs/requirements/traceability.md), and work the checklist in the PR template. `pnpm docs:reqs` must pass.
