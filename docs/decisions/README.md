# Architecture decisions

Short records of decisions that are expensive to reverse, written so a new contributor can tell what was decided, why, and what it costs.

One file per decision, numbered, never edited after acceptance — a decision that changes gets a new record that supersedes the old one.

| #                                                 | Decision                                          | Status   |
| ------------------------------------------------- | ------------------------------------------------- | -------- |
| [0001](0001-monorepo-modular-monolith.md)         | pnpm monorepo with a modular monolith             | Accepted |
| [0002](0002-supabase-postgres-rls.md)             | Supabase Postgres with RLS as the tenant boundary | Accepted |
| [0003](0003-money-as-integer-kobo.md)             | Money as integer kobo                             | Accepted |
| [0004](0004-append-only-financial-history.md)     | Append-only financial history                     | Accepted |
| [0005](0005-server-authoritative-offline-sync.md) | Server-authoritative offline sync                 | Accepted |
| [0006](0006-next-route-handlers-as-api.md)        | Next.js route handlers as the versioned API       | Accepted |
| [0007](0007-no-public-marketplace-surface.md)     | No public marketplace surface                     | Accepted |

## Template

```markdown
# NNNN — Title

**Status:** Proposed | Accepted | Superseded by NNNN
**Date:** YYYY-MM-DD
**PRD:** requirement IDs or sections

## Context

## Decision

## Consequences

## Alternatives considered
```
