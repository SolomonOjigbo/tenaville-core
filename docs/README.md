# Tenaville documentation

## Start here

| Document                                              | Read it when                                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| [PRD v3](prd/Tenaville_Property_Management_PRD_v3.md) | You need the authoritative scope, requirement wording or rationale           |
| [CLAUDE.md](../CLAUDE.md)                             | Before writing any code — the invariants that are expensive to discover late |
| [Architecture overview](architecture/overview.md)     | You are orienting in the codebase                                            |
| [Sprint backlog](requirements/sprint-backlog.md)      | You are deciding what to pick up next                                        |
| [Backlog mapping](requirements/backlog-mapping.md)    | You want to know what is actually built                                      |
| [Release plan](requirements/release-plan.md)          | You want the build order and why it is that order                            |
| [Traceability](requirements/traceability.md)          | You are implementing or reviewing a requirement                              |

## Architecture

- [Overview](architecture/overview.md) — shape, boundaries, request path, what is deliberately absent
- [Multi-tenancy and RLS](architecture/multi-tenancy-and-rls.md) — the isolation boundary and how it is tested
- [Money and ledger](architecture/money-and-ledger.md) — kobo, append-only history, receipt numbering, statements
- [Offline sync](architecture/offline-sync.md) — what works offline and why money is server-authoritative
- [Provider adapters](architecture/provider-adapters.md) — messaging, payments, financing, storage, identity

## Requirements

- [Sprint backlog](requirements/sprint-backlog.md) — 142 tickets, 690 points, 23 sprints, covering every P0 and P1 requirement
- [Backlog mapping](requirements/backlog-mapping.md) — ticket-by-ticket implementation status, and where the plans diverge
- [Traceability matrix](requirements/traceability.md) — all 194 PRD §8 requirements, their owner module and status
- [requirements.json](requirements/requirements.json) and [backlog.json](requirements/backlog.json) — machine-readable; `pnpm docs:reqs` checks both against the PRD
- [Release plan](requirements/release-plan.md) — build order and rationale, exit criteria, cut order, pilot targets

## Data model

- [Entities](data-model/entities.md) — the PRD §14 inventory with the invariants that constrain the schema

## Decisions

- [Index](decisions/README.md) — seven accepted architecture decisions with their costs and rejected alternatives

## Legal and operations

- [Compliance register](legal/compliance-register.md) — what must clear review before production launch
- [Operations](ops/README.md) — runbooks, onboarding, open decisions

## Conventions for these docs

Each document states which PRD requirements it derives from, so a scope change can be traced to the documents it affects. When a requirement changes, update the PRD, regenerate traceability, and revise the affected architecture document in the same change.

A decision record is never edited after acceptance. A decision that changes gets a new record that supersedes the old one.
