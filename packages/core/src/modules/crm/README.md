# CRM pipeline & prospects

PRD section 8.8 · requirement prefix `CRM` · first release **R2**

An internal pipeline only. Not a public marketplace, not lead selling. Marketing consent is tracked separately from operational tenancy messaging (CRM-12).

## Owned entities

`Lead`, `LeadActivity`, `PipelineStage`, `FollowUpTask` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

12 requirements: P0 0 · P1 12 · P2 0. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID     | Pri | Requirement                                                                                                                                       |
| ------ | --- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRM-1  | P1  | Create a prospect manually or from an agency-controlled channel such as a phone call, WhatsApp message, referral, email or private enquiry form   |
| CRM-2  | P1  | Record contact details, preferred contact method, requested property/unit or property type, budget range, preferred area, intended move-in date,… |
| CRM-3  | P1  | Track configurable pipeline stages, with defaults such as New, Contacted, Qualified, Appointment Booked, Viewed, Application Started, Screening,… |
| CRM-4  | P1  | Assign each lead to an agent or team and record the source, owner, next action and follow-up due date                                             |
| CRM-5  | P1  | Maintain a chronological activity timeline for calls, messages, appointments, notes, tasks and stage changes                                      |
| CRM-6  | P1  | Schedule reminders and overdue follow-up alerts; show an agent’s daily follow-up queue                                                            |
| CRM-7  | P1  | Detect likely duplicate leads and allow authorised merging while preserving activity history                                                      |
| CRM-8  | P1  | Record lost reasons and nurture dates, and support reactivation without creating duplicate records                                                |
| CRM-9  | P1  | Convert a qualified lead to an application and, after approval, to a tenant/lease while reusing data with permission                              |
| CRM-10 | P1  | Report lead response time, pipeline ageing, appointment conversion, application conversion, lead-to-lease rate and lost reasons                   |
| CRM-11 | P1  | Support messaging templates for follow-ups via configured WhatsApp Business, SMS and email providers                                              |
| CRM-12 | P1  | Honour opt-outs and consent requirements for marketing communications                                                                             |

## Layout

```
crm/
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
