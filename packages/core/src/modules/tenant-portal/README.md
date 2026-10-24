# Tenant self-service portal

PRD section 8.11 · requirement prefix `TENANT` · first release **R1**

Access is scoped to one tenant and their own lease — an exit criterion for launch (§16.2). Recorded payments are labelled distinctly from partner-confirmed ones (RENT-12, TENANT-3).

## Owned entities

`PortalAccount`, `TenantRequest`, `NotificationPreference` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

15 requirements: P0 5 · P1 6 · P2 4. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID | Pri | Requirement |
|---|---|---|
| TENANT-1 | P0 | Provide secure tenant access linked to the correct organisation, tenant record and active lease |
| TENANT-2 | P0 | Show lease summary, rent due dates, charge breakdown, recorded payment history, receipts and current balance |
| TENANT-3 | P1 | Show partner-confirmed payments and virtual account/payment instructions when enabled; clearly distinguish pending from confirmed payments |
| TENANT-4 | P0 | Let tenants submit maintenance requests with category, description, preferred access times and attachments |
| TENANT-5 | P1 | Let tenants track repair status, appointments, expected next step and relevant messages |
| TENANT-6 | P0 | Provide access to lease documents, receipts, notices and other documents explicitly shared with the tenant |
| TENANT-7 | P1 | Allow tenants to update permitted contact details and notification preferences; sensitive changes may require verification or staff approval |
| TENANT-8 | P1 | Provide a secure communication/request channel and show status for submitted requests |
| TENANT-9 | P1 | Show renewal prompts and allow a tenant to indicate whether they wish to renew, without automatically renewing a lease |
| TENANT-10 | P2 | Provide a financing information area only where an eligible partner is integrated |
| TENANT-11 | P2 | Obtain explicit, purpose-specific consent before sharing tenant data with a financing partner |
| TENANT-12 | P2 | Allow a tenant to start a financing referral/application and redirect or securely hand off to the provider’s approved flow |
| TENANT-13 | P2 | Do not promise approval, display misleading affordability claims or describe financing as a Tenaville loan |
| TENANT-14 | P0 | Provide responsive mobile web access for tenants and landlords in R1 |
| TENANT-15 | P1 | Provide accessible language, low-data and clear error/retry behaviour for common tenant actions |

## Layout

```
tenant-portal/
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
