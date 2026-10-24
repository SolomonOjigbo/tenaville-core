# Tenants & lease management

PRD section 8.4 · requirement prefix `LEASE` · first release **R1**

LEASE-12 (direct tenant + unit → lease) is the R1 default path. Creation from a screening application (LEASE-10) is additive in R2 and must not become a prerequisite.

## Owned entities

`Tenant`, `TenantContact`, `Lease`, `LeaseParty`, `Renewal`, `DepositRecord`, `Notice`, `DocumentTemplate` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

14 requirements: P0 9 · P1 4 · P2 1. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID       | Pri | Requirement                                                                                                                                      |
| -------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| LEASE-1  | P0  | Maintain tenant records, contacts, optional next-of-kin/employer/business details and authorised documents                                       |
| LEASE-2  | P0  | Create a lease with tenant(s), unit, dates, rent, payment frequency, due dates, deposit and other charges                                        |
| LEASE-3  | P0  | Support lease states draft, active, expiring soon, expired, terminated and renewed                                                               |
| LEASE-4  | P0  | Generate renewal records from existing leases while retaining historical terms                                                                   |
| LEASE-5  | P0  | Record move-in, move-out, handover notes, outstanding balance, meter readings and deposit handling                                               |
| LEASE-6  | P0  | Configure expiry alerts, for example 90, 60 and 30 days before expiry                                                                            |
| LEASE-7  | P1  | Support configurable rent-review/escalation rules and approval before applying new terms                                                         |
| LEASE-8  | P2  | Provide tenancy agreement templates and electronic signature through an appropriate provider                                                     |
| LEASE-9  | P1  | Support co-tenants and guarantors                                                                                                                |
| LEASE-10 | P1  | Create a tenant lease from an approved application without re-entering the same information                                                      |
| LEASE-11 | P0  | Preserve lease and tenant history when a tenant record is updated or a lease is terminated                                                       |
| LEASE-12 | P0  | Create a lease directly from a tenant and unit without an application                                                                            |
| LEASE-13 | P0  | Manage the caution deposit lifecycle: record the deposit as client funds, hold status, deductions at move-out with evidence and approval, and…   |
| LEASE-14 | P1  | Generate notices and letters from agency-configured templates (formal rent reminder, lease expiry or renewal notice, rent-review notice, demand… |

## Layout

```
leases/
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
