# Architecture overview

## Shape

A modular monolith. One deployable web application, one mobile app, one database — with hard internal boundaries between domain modules. PRD §13 recommends this explicitly, and §12 asks for an architecture that reaches thousands of organisations "without premature microservices".

```
┌─────────────────────┐   ┌──────────────────────┐
│  apps/mobile        │   │  apps/web            │
│  Expo, staff only   │   │  Next.js App Router  │
│  offline-capable    │   │  staff · landlord ·  │
└──────────┬──────────┘   │  tenant + /api/v1    │
           │              └───────────┬──────────┘
           └──── /api/v1 ─────────────┤
                                      │
                         ┌────────────▼────────────┐
                         │  packages/core          │
                         │  17 domain modules      │
                         │  application/ is the    │
                         │  only entry point       │
                         └────────────┬────────────┘
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
          ┌─────────▼──────┐ ┌────────▼───────┐ ┌───────▼────────┐
          │ packages/db    │ │ packages/      │ │ packages/money │
          │ Supabase + RLS │ │ adapters       │ │ integer kobo   │
          └─────────┬──────┘ └────────┬───────┘ └────────────────┘
                    │                 │
          ┌─────────▼──────┐  ┌───────▼─────────────────────────┐
          │ Postgres       │  │ WhatsApp · SMS · email ·        │
          │ Storage · Auth │  │ payments · financing · identity │
          └────────────────┘  └─────────────────────────────────┘
```

## Why these boundaries

**Domain modules, not layers across the whole app.** The PRD describes 17 functional areas that arrive in three releases. Organising by area means R2's CRM and screening work lands in new folders rather than threading through every existing layer, and the cut order in §16.1 can actually be executed — deferring screening means not shipping one directory, not unpicking a feature from five places.

**`application/` as the only door.** Rent, ledger and maintenance all touch money and all need each other's facts. If they reach into each other's tables, the append-only and reconciliation invariants become unenforceable, because any module could write a ledger row its own way. One entry point per module means an invariant can be enforced in one place.

**Route handlers as the API.** With Supabase supplying Postgres, auth and storage, a separate API service would mostly forward calls. Next.js route handlers keep one deployment while still giving the mobile app a versioned contract (`/api/v1`) it can depend on across app-store release timelines (MOB-9).

**Providers behind ports.** The PRD's risk table expects WhatsApp templates to be rejected, messaging prices to move, and a financing partner to change terms or fail. Each of those is an adapter swap, so none of them may require touching domain code.

## Request path

1. A request reaches a route handler or a server component in `apps/web`.
2. `src/server/` resolves the session, the user's organisation and their role, and establishes the request's scope.
3. Input is parsed with a `@tenaville/validation` schema. Invalid input stops here.
4. A `@tenaville/core` use case runs the business rule, calling out through ports for persistence and providers.
5. Persistence goes through `packages/db` as the acting user, so RLS applies. The service-role key is reserved for background jobs and migrations.
6. Sensitive actions write an audit event before returning (ORG-5).

## What is deliberately absent

- **No message broker or microservices in R1.** Background work (reminders, statement generation, sync processing, provider callbacks) runs as scheduled jobs and queued handlers. Revisit only when a measured bottleneck justifies it.
- **No analytics warehouse.** Operational queries with the right indexes, against operational records as the source of truth. Pre-aggregation arrives when scale forces it (AN, PRD §13).
- **No double-entry accounting engine.** Out of scope per PRD §4.2. The landlord ledger is purpose-built and auditable, not a general ledger for the agency's own books.
- **No public-facing read surface.** There is no route that serves a property record to an unauthenticated visitor (PROP-9).

## Related

[Multi-tenancy and RLS](multi-tenancy-and-rls.md) · [Money and ledger](money-and-ledger.md) · [Offline sync](offline-sync.md) · [Provider adapters](provider-adapters.md) · [Decisions](../decisions/)
