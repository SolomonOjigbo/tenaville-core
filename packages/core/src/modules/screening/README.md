# Configurable tenant screening

PRD section 8.10 · requirement prefix `SCREEN` · first release **R2**

A configurable workflow, never one fixed checklist. Criteria must be lawful, explainable and versioned (SCREEN-14, SCREEN-16). NIN/BVN are highly sensitive — prefer a provider pass/fail result over storing the identifier (SCREEN-15).

## Owned entities

`ScreeningTemplate`, `ScreeningStepDefinition`, `ScreeningApplication`, `ScreeningStepInstance`, `ScreeningEvidence`, `ScreeningReview`, `ScreeningDecision`, `ConsentRecord` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

16 requirements: P0 0 · P1 15 · P2 1. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID | Pri | Requirement |
|---|---|---|
| SCREEN-1 | P1 | Create screening templates by organisation and optionally apply overrides by property, landlord or unit type |
| SCREEN-2 | P1 | Configure steps such as identity evidence, employment/business information, income/affordability evidence, previous landlord reference, guarantor… |
| SCREEN-3 | P1 | Mark each step required/optional, assign a reviewer, define accepted evidence types and set an expiry/recency rule where appropriate |
| SCREEN-4 | P1 | Support statuses such as Not Started, Requested, Submitted, Under Review, More Information Required, Passed, Failed, Waived and Expired, with… |
| SCREEN-5 | P1 | Provide a tenant-facing application form and secure document-upload flow within the portal |
| SCREEN-6 | P1 | Record applicant consent, purpose, timestamp, privacy notice version and any third-party checks requested |
| SCREEN-7 | P1 | Keep reviewer notes, evidence, decision rationale, reviewer identity and timestamps in an auditable history |
| SCREEN-8 | P1 | Restrict access to screening information to explicitly authorised roles; do not expose sensitive screening notes to other tenants or general staff |
| SCREEN-9 | P1 | Allow a reviewer to request additional information and notify the applicant of required actions without revealing confidential internal notes |
| SCREEN-10 | P1 | Prevent lease activation where required screening steps remain incomplete, unless an authorised user records an override and reason |
| SCREEN-11 | P1 | Support configurable retention and deletion/anonymisation rules for rejected or withdrawn applications, subject to legal obligations |
| SCREEN-12 | P1 | Report application volume, completion time, pending steps and outcomes without exposing unnecessary personal details |
| SCREEN-13 | P2 | Integrate with identity or reference-check providers only after security, legal, pricing and data-processing review |
| SCREEN-14 | P1 | Do not use protected or sensitive personal characteristics as screening criteria |
| SCREEN-15 | P1 | Treat national and financial identifiers (for example NIN and BVN) as highly sensitive |
| SCREEN-16 | P1 | Apply each template's criteria consistently across applicants and record the criteria version used, so decisions can be reviewed for fairness |

## Layout

```
screening/
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
