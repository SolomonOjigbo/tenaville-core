# Portfolio analytics & reporting

PRD section 8.13 · requirement prefix `AN` · first release **R1**

Analytics re-reads operational records as the source of truth and re-applies the same organisation and property scoping as the main app (AN-13). Metric formulas are documented in-product (AN-10).

## Owned entities

`report definitions`, `optional pre-aggregated snapshots` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

13 requirements: P0 2 · P1 9 · P2 2. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID | Pri | Requirement |
|---|---|---|
| AN-1 | P0 | Provide core operational reports: rent roll, occupancy/unit status, lease expiries, arrears, collections, maintenance queue and landlord statements |
| AN-2 | P1 | Provide portfolio dashboard filters by date range, branch, property, landlord, manager and unit type, subject to permissions |
| AN-3 | P1 | Calculate occupancy rate using a documented and configurable denominator that excludes units intentionally marked inactive where appropriate |
| AN-4 | P1 | Show rent billed versus collected, arrears ageing, collection rate, overdue balances and upcoming rent due |
| AN-5 | P1 | Show lease expiry pipeline, renewal rate, vacancy duration, time from vacancy to occupancy and units requiring action |
| AN-6 | P1 | Show maintenance request volume, response/resolution time, overdue jobs, repeat issues, cost by property/category/vendor and maintenance cost per unit |
| AN-7 | P1 | Show landlord-level collections, approved costs, deductions and net remittances |
| AN-8 | P1 | Show CRM funnel metrics including lead response time, appointment attendance, application conversion and lead-to-lease conversion |
| AN-9 | P1 | Support export to CSV/XLSX/PDF where appropriate and permitted |
| AN-10 | P1 | Define metric formulas and time windows in the product so users can understand what each metric means |
| AN-11 | P2 | Support saved dashboards and configurable KPI cards for different roles |
| AN-12 | P2 | Add optional benchmark comparisons only where reliable, lawful data sources exist; do not imply market-wide representativeness without evidence |
| AN-13 | P0 | Enforce the same organisation and property-level access restrictions in analytics, exports and background reports as in the main application |

## Layout

```
analytics/
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
