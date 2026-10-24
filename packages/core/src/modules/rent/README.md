# Rent schedules, payments & arrears

PRD section 8.5 · requirement prefix `RENT` · first release **R1**

The module that decides whether an agency can leave spreadsheets. Append-only history, allocations that reconcile to the payment, and gapless receipt numbering are correctness requirements, not polish.

## Owned entities

`Charge`, `RentSchedule`, `Payment`, `PaymentAllocation`, `Receipt`, `ReceiptSequence`, `ReconciliationItem`, `ProviderPaymentEvent` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

16 requirements: P0 11 · P1 5 · P2 0. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID | Pri | Requirement |
|---|---|---|
| RENT-1 | P0 | Generate charges from lease terms, including annual, half-yearly, quarterly or monthly rent where configured |
| RENT-2 | P0 | Record payments received through cash, bank transfer, POS or other configured methods, with reference and evidence |
| RENT-3 | P0 | Allocate payments to one or more charges and issue receipts |
| RENT-4 | P0 | Support reversals and corrections without silently overwriting the financial history |
| RENT-5 | P0 | Provide rent roll, upcoming dues, arrears ageing and payment history by tenant, unit, property, landlord and portfolio |
| RENT-6 | P0 | Configure reminders and follow-up tasks for upcoming and overdue charges |
| RENT-7 | P1 | Configure late fees only where the agency’s policy and applicable law permit them |
| RENT-8 | P1 | Provide virtual accounts and payment links via a licensed payment partner, with signed webhooks, idempotency and reconciliation |
| RENT-9 | P1 | Match incoming bank/payment records to tenants, units and charges; provide a review queue for ambiguous matches |
| RENT-10 | P1 | Support scheduled landlord remittance runs with approval and reconciliation |
| RENT-11 | P1 | Export financial records for external accounting tools |
| RENT-12 | P0 | Clearly label recorded payments versus partner-confirmed payments; never claim payment is confirmed without reliable confirmation |
| RENT-13 | P0 | Issue receipts with unique, sequential numbers per organisation (per branch if configured) |
| RENT-14 | P0 | Handle part payments, overpayments and tenant credit |
| RENT-15 | P0 | Provide a daily cash-up per user and payment method for reconciliation against bank and cash |
| RENT-16 | P0 | Support opening balances and historical arrears at cutover (see MIG-2) |

## Layout

```
rent/
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
