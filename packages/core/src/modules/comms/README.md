# Communications, reminders & tasks

PRD section 8.14 · requirement prefix `COMMS` · first release **R1**

Providers sit behind an adapter (COMMS-2) so WhatsApp template rejection or a price change is a config problem, not a rewrite. Fallback channel order is explicit (COMMS-8).

## Owned entities

`Message`, `MessageDelivery`, `NotificationPreference`, `FollowUpTask` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

8 requirements: P0 6 · P1 2 · P2 0. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID | Pri | Requirement |
|---|---|---|
| COMMS-1 | P0 | Provide configurable templates for rent reminders, receipts, lease expiry, maintenance updates and landlord statements |
| COMMS-2 | P0 | Abstract messaging providers for WhatsApp Business, SMS and email |
| COMMS-3 | P0 | Store message metadata, recipient, template, send time, delivery status where available and related record |
| COMMS-4 | P0 | Allow tasks with owner, due date, priority, related record, notes and completion status |
| COMMS-5 | P1 | Support recurring tasks and automated task creation from configurable events |
| COMMS-6 | P0 | Respect consent, opt-outs, channel preferences, rate limits and provider policy |
| COMMS-7 | P1 | Provide an inbox or work queue for messages requiring a human response, subject to provider capabilities |
| COMMS-8 | P0 | Model WhatsApp business messaging within provider rules: use provider-approved templates for business-initiated messages, track template approval… |

## Layout

```
comms/
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
