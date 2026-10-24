# Maintenance & repairs

PRD section 8.7 · requirement prefix `MAINT` · first release **R1**

The R1 status set is deliberately small (MAINT-3). Quote and landlord-approval statuses switch on only when those R2 workflows are enabled.

## Owned entities

`MaintenanceRequest`, `WorkOrder`, `Vendor`, `VendorQuote`, `WorkOrderAssignment`, `MaintenanceApproval`, `MaintenanceCost`, `MaintenanceAttachment` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

17 requirements: P0 10 · P1 7 · P2 0. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID       | Pri | Requirement                                                                                                                                        |
| -------- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| MAINT-1  | P0  | Create a maintenance request against a property/unit, submitted by staff or tenant                                                                 |
| MAINT-2  | P0  | Capture category, description, urgency, reported date, access constraints, photos/videos where supported, and whether the issue affects safety or… |
| MAINT-3  | P0  | Track core statuses Submitted, Acknowledged, Assigned, In Progress, On Hold, Completed, Rejected and Closed                                        |
| MAINT-4  | P0  | Assign an owner/coordinator, priority, due date and responsible staff member                                                                       |
| MAINT-5  | P0  | Record activity timeline, comments, status changes, attachments and communications                                                                 |
| MAINT-6  | P0  | Maintain vendor records, contact details, trade/category, service areas, availability notes and internal performance history                       |
| MAINT-7  | P1  | Request and compare one or more vendor quotations, including labour, materials, call-out fees, taxes and validity period                           |
| MAINT-8  | P1  | Configure approval thresholds by landlord, property, cost or job category                                                                          |
| MAINT-9  | P1  | Create work orders with scope, assigned vendor, target date, agreed cost and access instructions                                                   |
| MAINT-10 | P0  | Record actual cost, invoices, receipts, before/after photos and completion notes                                                                   |
| MAINT-11 | P0  | Allocate repair costs to landlord, tenant, agency, service charge or another configured payer, with reason and approval                            |
| MAINT-12 | P0  | Notify tenants of acknowledgement, appointment/visit, status changes and completion, subject to notification preferences                           |
| MAINT-13 | P1  | Let tenants confirm whether the issue is resolved or reopen it with a reason                                                                       |
| MAINT-14 | P1  | Support recurring preventive maintenance and inspection schedules                                                                                  |
| MAINT-15 | P1  | Track response time, resolution time, repeat incidents, vendor cost and overdue jobs                                                               |
| MAINT-16 | P0  | Preserve the repair history against the property/unit even after a tenancy ends                                                                    |
| MAINT-17 | P1  | Support emergency escalation rules, named contacts and an auditable record of actions taken                                                        |

## Layout

```
maintenance/
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
