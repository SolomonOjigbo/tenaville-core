# Documents & inspections

PRD section 8.15 · requirement prefix `DOC` · first release **R1**

No document is ever reachable through a guessable URL; authorisation is checked at download time (DOC-7).

## Owned entities

`PropertyDocument`, `Inspection`, `InspectionItem` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

7 requirements: P0 4 · P1 3 · P2 0. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID | Pri | Requirement |
|---|---|---|
| DOC-1 | P0 | Attach documents to properties, units, landlords, tenants, leases, screening applications, maintenance jobs and payments as appropriate |
| DOC-2 | P0 | Support access controls, document type, issue/expiry date, uploader and audit trail |
| DOC-3 | P0 | Generate and download receipts and landlord statements |
| DOC-4 | P1 | Support inspection checklists, photos, notes, meter readings and acknowledgement/signature capture where supported |
| DOC-5 | P1 | Alert authorised staff to expiring documents |
| DOC-6 | P1 | Scan uploads for malware where supported and use time-limited secure download links |
| DOC-7 | P0 | Never expose a document through a guessable public URL; enforce authorisation at download time |

## Layout

```
documents/
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
