# Organisation, users, roles & audit

PRD section 8.1 · requirement prefix `ORG` · first release **R1**

The isolation boundary for every other module. Nothing here may be bypassed by convenience: ORG-8 requires isolation enforced in the database (RLS), not just in application code.

## Owned entities

`Organisation`, `User`, `Role`, `Permission`, `Assignment`, `Branch`, `DeviceSession`, `AuditEvent` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

10 requirements: P0 7 · P1 3 · P2 0. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID | Pri | Requirement |
|---|---|---|
| ORG-1 | P0 | Signup creates an organisation of type agency or individual landlord with an owner account |
| ORG-2 | P0 | Support verified email and/or phone, staff invitations and account recovery |
| ORG-3 | P0 | Provide roles including Owner/Admin, Property Manager, Letting Agent, Caretaker, Maintenance Coordinator, Accountant, Screening Reviewer, Landlord… |
| ORG-4 | P0 | Enforce role-based and property/portfolio-scoped access |
| ORG-5 | P0 | Record audit events for financial changes, lease changes, screening decisions, sensitive document access, maintenance approvals and permission changes |
| ORG-6 | P1 | Support multiple branches, teams and branch-level reporting |
| ORG-7 | P1 | Allow organisation administrators to configure approval limits, workflow templates and notification defaults |
| ORG-8 | P0 | Ensure every tenant organisation’s data is isolated at the database level |
| ORG-9 | P0 | Provide session management: device list, remote sign-out, session timeout and password reset controls |
| ORG-10 | P1 | Offer optional two-factor authentication for all users and make it configurable as required for owners and accountants |

## Layout

```
org/
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
