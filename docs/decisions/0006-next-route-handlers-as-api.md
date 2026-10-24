# 0006 — Next.js route handlers as the versioned API

**Status:** Accepted
**Date:** 2026-10-24
**PRD:** §13 (API and jobs, Web, Mobile), §12 (Interoperability), MOB-9

## Context

Three web audiences (staff, landlord, tenant) and a native staff app need to reach the same domain logic. The PRD asks for a typed API with background workers, a versioned API, and provider adapters — but also for a simple deployment model that minimises early operational overhead.

With Supabase supplying Postgres, auth and storage, a separate API service would largely forward calls to the same database the web app already reaches.

## Decision

`apps/web` is both the web UI and the API. Route handlers under `src/app/api/v1/` are the mobile app's server contract; `src/app/api/webhooks/` receives provider callbacks.

- Handlers validate with `@tenaville/validation` and delegate to a `@tenaville/core` use case. No business logic in `src/app/`.
- `/api/v1` is versioned because the mobile app ships on app-store timelines and cannot deploy in lockstep with the web app (MOB-9).
- Server components read through the same `@tenaville/core` use cases, not through separate query code.
- Background work (reminders, statement generation, provider callback processing, sync reconciliation) runs as scheduled jobs and queued handlers, idempotent by requirement (§12 Reliability).

## Consequences

- One deployment, one set of environment variables, one place where session and organisation scoping is resolved.
- The mobile app has a stable, versioned contract while the web UI iterates freely.
- Cost: the web deployment's availability is the mobile app's availability. Acceptable pre-pilot; if staff field work needs independent uptime, the handlers can be extracted later precisely because the logic lives in `packages/core` rather than in the handlers.
- Cost: long-running work does not belong in a request handler. Statement generation and bulk imports must be queued jobs from the start, or they will time out on the first large agency.

## Alternatives considered

**A separate NestJS or Fastify API service.** Rejected for R1: more infrastructure, a second deployment, and duplicated session handling, to serve a contract one app consumes.

**Supabase client directly from the mobile app with RLS as the only guard.** Rejected: the invariants in [ADR 0004](0004-append-only-financial-history.md) and [ADR 0005](0005-server-authoritative-offline-sync.md) — receipt numbering, allocation reconciliation, idempotent sync — cannot be enforced by RLS. They need server-side logic the client cannot bypass.

**tRPC instead of REST route handlers.** Attractive for end-to-end types, but a versioned REST surface is easier to keep stable across app-store release lag, and the mobile app's offline queue replays plain HTTP requests.
