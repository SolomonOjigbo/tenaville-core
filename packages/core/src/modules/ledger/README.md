# Landlord ledger, statements & remittances

PRD section 8.6 · requirement prefix `LEDGER` · first release **R1**

Client funds and agency income are separate in the data model, not merely in a report filter (LEDGER-4). Issued statements are immutable; corrections are numbered revisions (LEDGER-8).

## Owned entities

`LandlordLedgerEntry`, `Remittance`, `StatementRevision`, `OpeningBalance`, `SettlementAccount`, `TaxRule` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

11 requirements: P0 7 · P1 4 · P2 0. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID | Pri | Requirement |
|---|---|---|
| LEDGER-1 | P0 | Maintain an auditable landlord ledger for rent receipts, commission, approved costs, adjustments and remittances |
| LEDGER-2 | P0 | Generate period statements showing opening balance, collections, deductions, costs, remittances and closing balance |
| LEDGER-3 | P0 | Attach receipts, invoices and approval evidence to ledger-related entries |
| LEDGER-4 | P0 | Separate landlord/client funds from agency income in the data model and financial reports |
| LEDGER-5 | P0 | Restrict statement visibility to authorised staff and the relevant landlord |
| LEDGER-6 | P1 | Support approval and batch processing of remittance schedules |
| LEDGER-7 | P1 | Allow branded PDF and downloadable statements |
| LEDGER-8 | P0 | Route statements through draft, reviewed and issued states |
| LEDGER-9 | P0 | Recognise commission when rent is received by default, with the basis defined in the mandate |
| LEDGER-10 | P1 | Support configurable tax lines (for example VAT on commission, withholding tax on rent), off by default and validated with a tax adviser before use |
| LEDGER-11 | P1 | Record the settlement-account model for partner-provided virtual accounts (agency client account, landlord account or split) as organisation… |

## Layout

```
ledger/
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
