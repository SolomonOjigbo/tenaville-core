# Subscription & billing

PRD section 8.16 · requirement prefix `BILL` · first release **R1**

Priced by units under management, in naira. Unpaid subscriptions never trigger customer-data deletion, and export access is preserved (BILL-4).

## Owned entities

`Subscription`, `Plan` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

5 requirements: P0 4 · P1 1 · P2 0. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID     | Pri | Requirement                                                                                                                      |
| ------ | --- | -------------------------------------------------------------------------------------------------------------------------------- |
| BILL-1 | P0  | Offer a trial and subscription tiers priced primarily by units under management, billed in naira                                 |
| BILL-2 | P0  | Support subscription payment through an appropriate Nigerian payment gateway, with invoices and receipts                         |
| BILL-3 | P0  | Show plan limits and upgrade prompts                                                                                             |
| BILL-4 | P0  | Do not delete customer data solely because a subscription is unpaid; preserve export access subject to security and legal policy |
| BILL-5 | P1  | Validate any optional transaction or financing-related revenue model before implementation and disclose fees clearly             |

## What exists today

Entitlements only (BILL-3, TV-147): what a plan allows, and the refusal when a write would exceed it.

The limits themselves are rows in `plans`, and the checks are triggers in the database — on `properties`, `units` and `memberships` for counts, and on `landlords` and `management_mandates` for the multi-landlord gate. That placement is the point: an import, the mobile app and a route handler all write through the same connection, and a check that lives only in TypeScript is a check an import walks past.

What this module adds on top is the vocabulary: the shape of an entitlement, how to recognise SQLSTATE `53400` as a plan refusal whatever client produced it, and how to say so once rather than per screen. `app.limit_verdict` is the single definition of what a limit means — `unlimited`, `within`, `billable` or `refused` — and `plan_entitlements()` returns it alongside the counts, so a usage bar and a trigger cannot disagree about whether there is room.

Three things are deliberately elsewhere:

- **Warnings at 80% and 100%** are TV-148, together with what "active" means at a period boundary.
- **Billing the overage** is TV-153. A `billable` verdict means the write is allowed, not that anyone has been charged.
- **Read-only locking on downgrade** is TV-152, and it is the harder half: a locked property must stay printable and exportable (BILL-4).

Storage is unenforced because nothing records a document's size yet; that arrives with documents (TV-052).

## Layout

```
billing/
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
