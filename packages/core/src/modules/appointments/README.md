# Appointments & follow-ups

PRD section 8.9 · requirement prefix `APPT` · first release **R2**

Outcomes drive follow-up task creation (APPT-7), which is what keeps the CRM pipeline moving rather than ageing silently.

## Owned entities

`Appointment`, `AppointmentAttendee`, `AppointmentOutcome` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

10 requirements: P0 0 · P1 9 · P2 1. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID | Pri | Requirement |
|---|---|---|
| APPT-1 | P1 | Schedule property viewings, tenant meetings, inspections, maintenance visits and other configured appointment types |
| APPT-2 | P1 | Link an appointment to a lead, tenant, property/unit, maintenance request or staff member as applicable |
| APPT-3 | P1 | Record date, start/end time, location or meeting instructions, attendees, assigned staff and access requirements |
| APPT-4 | P1 | Prevent or flag conflicts in the assigned staff member’s schedule and support rescheduling/cancellation |
| APPT-5 | P1 | Send configurable confirmations and reminders through available channels, with delivery status where supported |
| APPT-6 | P1 | Record outcomes such as Completed, No-show, Cancelled, Rescheduled, Interested, Follow-up Required or Not Suitable |
| APPT-7 | P1 | Automatically create follow-up tasks from appointment outcomes, with an owner and due date |
| APPT-8 | P1 | Capture feedback, next steps and the prospect’s interest level after a viewing |
| APPT-9 | P1 | Provide calendar and list views, daily agenda and filters by team, appointment type and status |
| APPT-10 | P2 | Integrate with external calendars where justified and permitted by user consent |

## Layout

```
appointments/
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
