# Migration & onboarding

PRD section 8.17 · requirement prefix `MIG` · first release **R1**

Without this an agency cannot switch. Every import is dry-runnable and rollback-able (MIG-3); opening entries are labelled and frozen once the cutover is confirmed (MIG-2).

## Owned entities

`ImportBatch`, `OpeningBalance` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

5 requirements: P0 4 · P1 1 · P2 0. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID    | Pri | Requirement                                                                                                                                  |
| ----- | --- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| MIG-1 | P0  | Import tenants, leases and current charges from spreadsheet templates, extending the property and unit import (PROP-4), with validation and… |
| MIG-2 | P0  | Import opening balances at a chosen cutover date: tenant arrears and credits, and landlord ledger balances                                   |
| MIG-3 | P0  | Provide a dry-run import that shows what will be created, with the ability to roll back a completed import batch                             |
| MIG-4 | P1  | Provide an onboarding checklist and sample templates, and an optional assisted-import service for larger agencies                            |
| MIG-5 | P0  | Let administrators export all organisation data in documented formats at any time                                                            |

## Layout

```
migration/
├── README.md         this file
├── domain/           entities, value objects, invariants — no I/O
├── application/      use cases; the only entry point other modules call
├── infrastructure/   Supabase queries, provider calls, mappers
├── schema/           zod request/response schemas, re-exported to web and mobile
└── __tests__/        unit tests for invariants, integration tests for RLS
```

## Boundary rules

- Other modules call this module through `application/` only — never its tables or `infrastructure/` directly.
- Cross-module reads go through an explicit, typed port. If two modules need each other's internals, the boundary is wrong.
- Every table carries `organisation_id` with RLS enabled (PRD ORG-8).
