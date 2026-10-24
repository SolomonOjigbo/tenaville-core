# Rent financing & partner integrations

PRD section 8.12 · requirement prefix `FIN` · first release **R3**

Entirely R3 and disabled by default. Nothing in R1 or R2 may depend on this module. Tenaville never lends, never holds proceeds, and a financing approval never marks rent as paid (FIN-8).

## Owned entities

`FinancingProvider`, `FinancingReferral`, `FinancingConsent`, `FinancingApplicationReference`, `FinancingStatusEvent`, `FinancingDisbursementConfirmation` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

10 requirements: P0 0 · P1 0 · P2 10. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID     | Pri | Requirement                                                                                                                                          |
| ------ | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| FIN-1  | P2  | Design a provider-neutral integration boundary so a financing partner can be added or replaced without rewriting core tenancy workflows              |
| FIN-2  | P2  | Only onboard providers after legal/regulatory review, due diligence, security review and clear contractual responsibilities                          |
| FIN-3  | P2  | Make clear who the lender is, who makes the credit decision, who services the financing and who receives repayments                                  |
| FIN-4  | P2  | Do not let Tenaville receive, pool, lend or hold tenant financing proceeds unless a separately approved legal/regulatory model explicitly permits it |
| FIN-5  | P2  | Share only consented minimum data and record consent, payload, provider reference and handoff time                                                   |
| FIN-6  | P2  | Keep financing application data and status access restricted and segregated from ordinary property-management permissions                            |
| FIN-7  | P2  | Support provider callbacks/webhooks with signature verification, idempotency, replay protection and audit logging                                    |
| FIN-8  | P2  | Record financing status separately from rent payment status                                                                                          |
| FIN-9  | P2  | Where contractually and technically supported, reconcile confirmed disbursements to the relevant rent charge and show the resulting payment evidence |
| FIN-10 | P2  | Do not charge tenants hidden fees or make financing a mandatory condition of tenancy management                                                      |

## Layout

```
financing/
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
