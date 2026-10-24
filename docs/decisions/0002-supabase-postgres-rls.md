# 0002 — Supabase Postgres with RLS as the tenant boundary

**Status:** Accepted
**Date:** 2026-10-24
**PRD:** ORG-8, ORG-4, §10.8, §12 (Data isolation), §13 (Database, Files, Hosting)

## Context

The PRD requires organisation isolation enforced at the database layer, not only in application logic, plus automated cross-tenant tests passing in CI on every release. It also asks for private object storage with signed access, session management with remote sign-out, and managed hosting to minimise early operational overhead.

PRD §13 names "PostgreSQL with database-enforced organisation scoping and Row-Level Security where appropriate".

## Decision

Supabase as the managed platform: Postgres with RLS for data, Supabase Auth for identity and sessions, Supabase Storage with private buckets for documents.

- Every organisation-scoped table carries `organisation_id` with RLS enabled and a policy.
- The organisation is resolved from the session, never from request input.
- The service-role key is reserved for migrations and background jobs; it never serves a user-initiated request.
- Migrations are forward-only SQL in `supabase/migrations/`, with pgTAP policy tests in `supabase/tests/`.

## Consequences

- Auth, storage, session management and Postgres arrive together, which removes a large amount of R1 foundation work (ORG-2, ORG-9, DOC-7).
- RLS makes the isolation boundary a single testable artefact rather than a property of every query.
- Raw SQL migrations suit RLS policies, triggers and column grants — the mechanisms the append-only ledger needs — better than an ORM's schema DSL.
- Cost: the service-role key is a loaded gun. One convenient use in a request path silently removes isolation. This needs a lint rule and review attention, not just documentation.
- Cost: landlord and tenant visibility is narrower than organisation membership, which RLS does not express on its own. Those policies must be keyed to the user's own linkage, and getting it wrong is a leak between parties inside one agency.
- Cost: platform coupling. Postgres itself is portable; Auth and Storage are not. Keep storage access behind `packages/adapters/src/storage` so the second is replaceable.

## Open

Whether landlord and tenant portal users are Supabase Auth users with narrow policies, or a separate `PortalAccount` linkage as the PRD data model suggests. Decide before tenant portal work begins in R1.

## Alternatives considered

**Self-hosted Postgres with application-only scoping.** Rejected: violates ORG-8 directly, and makes the isolation guarantee depend on every query being written correctly forever.

**Schema or database per tenant.** Rejected: migration risk scales with customer count, and the PRD targets thousands of organisations managed by a small team.

**Postgres plus a separate auth provider.** Rejected for R1: more moving parts and an integration to maintain, for no requirement the combined platform fails to meet.
