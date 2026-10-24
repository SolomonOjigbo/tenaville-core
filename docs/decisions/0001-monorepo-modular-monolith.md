# 0001 — pnpm monorepo with a modular monolith

**Status:** Accepted
**Date:** 2026-10-24
**PRD:** §13 (Architecture, Language), §12 (Scalability), §16.1 (cut order)

## Context

The PRD defines 194 requirements across 17 functional areas, delivered in three releases, by a small team, with a web app and a native staff app sharing types and validation. It explicitly recommends a modular monolith with clear domain boundaries and warns against premature microservices.

The hardest sequencing constraint is §16.1: if capacity is short, whole areas must be deferrable — "defer in this order: tenant-portal extras, inspections, maintenance expansion, analytics, CRM and appointments, screening, then financing". That only works if those areas are separable in the codebase.

## Decision

A single pnpm workspace with Turborepo:

- `apps/web` (Next.js) and `apps/mobile` (Expo) as the two deployables.
- `packages/core` holding one module per PRD §8 area, each with `domain/`, `application/`, `infrastructure/`, `schema/`.
- Shared `packages/`: `db`, `adapters`, `money`, `validation`, `ui`, `config`.
- A module is entered only through its `application/` layer.

## Consequences

- Deferring an area means not shipping a directory and leaving a feature flag off, which is what §16.1 asks for.
- Web and mobile share validation schemas and money arithmetic, so a rule cannot be right on one client and wrong on the other.
- Turborepo gives per-package caching, so CI does not rebuild 17 modules to check a UI change.
- Cost: the import discipline between modules is a convention, not a compiler guarantee. It needs an ESLint boundary rule to hold, and it will erode without one.
- Cost: one deployable means a single scaling unit. Acceptable at the PRD's stated scale; revisit only on a measured bottleneck.

## Alternatives considered

**Separate repositories per app.** Rejected: the shared money and validation logic would be versioned packages, and a change to allocation rules would need coordinated releases across three repos.

**Microservices per domain.** Rejected: 17 services for a pre-pilot product, and the money, ledger and maintenance-cost paths are transactionally entangled — splitting them turns an invariant into a distributed-consistency problem.

**Layered monolith (controllers/services/repositories across all features).** Rejected: deferring screening or CRM would mean unpicking code from every layer rather than leaving a directory unbuilt.
