# Landlords & management mandates

PRD section 8.3 · requirement prefix `OWN` · first release **R1**

The mandate defines commission basis, permitted deductions and remittance terms — the ledger reads its terms rather than hard-coding them.

## Owned entities

`Landlord`, `ManagementMandate` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

6 requirements: P0 3 · P1 3 · P2 0. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID | Pri | Requirement |
|---|---|---|
| OWN-1 | P0 | Store landlord contact details, preferred communication channel and remittance details with restricted access |
| OWN-2 | P0 | Configure management mandate, commission type/rate, remittance schedule and permitted deductions |
| OWN-3 | P0 | Give landlords secure read-only access to their assigned properties, statements, balances and documents |
| OWN-4 | P1 | Allow landlords to approve or reject repairs above a configurable amount |
| OWN-5 | P1 | Allow landlord comments, approval history and supporting attachments on relevant maintenance requests |
| OWN-6 | P1 | Show landlords agreed portfolio indicators such as occupancy, arrears, maintenance costs and remittance history |

## Layout

```
landlords/
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
