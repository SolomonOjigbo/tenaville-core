# Requirement traceability

Every functional requirement in [PRD v3](../prd/Tenaville_Property_Management_PRD_v3.md) section 8, mapped to the code that owns it and the release it lands in.

`docs/requirements/requirements.json` is the machine-readable copy; `tools/check-traceability.mjs` fails CI if the two drift apart or if a module folder named here does not exist.

**Status values:** `todo` · `in-progress` · `done` · `deferred` (record why in the notes column).

**Release mapping:** P0 → R1 core management · P1 → R2 workflow automation · P2 → R3 tenant services. See [release-plan.md](release-plan.md).

## Summary

| Release                  | Priority | Requirements | Status     |
| ------------------------ | -------- | ------------ | ---------- |
| R1 — Core management     | P0       | 85           | 0 done     |
| R2 — Workflow automation | P1       | 90           | 0 done     |
| R3 — Tenant services     | P2       | 19           | 0 done     |
| **Total**                |          | **194**      | **0 done** |

| Area                                      | Prefix   | Owner                                     | P0  | P1  | P2  |
| ----------------------------------------- | -------- | ----------------------------------------- | --- | --- | --- |
| Organisation, users, roles & audit        | `ORG`    | `packages/core/src/modules/org`           | 7   | 3   | 0   |
| Properties & units                        | `PROP`   | `packages/core/src/modules/properties`    | 6   | 4   | 0   |
| Landlords & management mandates           | `OWN`    | `packages/core/src/modules/landlords`     | 3   | 3   | 0   |
| Tenants & lease management                | `LEASE`  | `packages/core/src/modules/leases`        | 9   | 4   | 1   |
| Rent schedules, payments & arrears        | `RENT`   | `packages/core/src/modules/rent`          | 11  | 5   | 0   |
| Landlord ledger, statements & remittances | `LEDGER` | `packages/core/src/modules/ledger`        | 7   | 4   | 0   |
| Maintenance & repairs                     | `MAINT`  | `packages/core/src/modules/maintenance`   | 10  | 7   | 0   |
| CRM pipeline & prospects                  | `CRM`    | `packages/core/src/modules/crm`           | 0   | 12  | 0   |
| Appointments & follow-ups                 | `APPT`   | `packages/core/src/modules/appointments`  | 0   | 9   | 1   |
| Configurable tenant screening             | `SCREEN` | `packages/core/src/modules/screening`     | 0   | 15  | 1   |
| Tenant self-service portal                | `TENANT` | `packages/core/src/modules/tenant-portal` | 5   | 6   | 4   |
| Rent financing & partner integrations     | `FIN`    | `packages/core/src/modules/financing`     | 0   | 0   | 10  |
| Portfolio analytics & reporting           | `AN`     | `packages/core/src/modules/analytics`     | 2   | 9   | 2   |
| Communications, reminders & tasks         | `COMMS`  | `packages/core/src/modules/comms`         | 6   | 2   | 0   |
| Documents & inspections                   | `DOC`    | `packages/core/src/modules/documents`     | 4   | 3   | 0   |
| Subscription & billing                    | `BILL`   | `packages/core/src/modules/billing`       | 4   | 1   | 0   |
| Migration & onboarding                    | `MIG`    | `packages/core/src/modules/migration`     | 4   | 1   | 0   |
| Staff mobile app                          | `MOB`    | `apps/mobile`                             | 7   | 2   | 0   |

## Organisation, users, roles & audit (`ORG`)

PRD section 8.1 · owner `packages/core/src/modules/org`

| ID     | Pri | Release | Requirement                                                                                                                                            | Status      | Notes                                                                                                                                                                                                                             |
| ------ | --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ORG-1  | P0  | R1      | Signup creates an organisation of type agency or individual landlord with an owner account                                                             | done        | create_organisation_with_owner + createOrganisation use case                                                                                                                                                                      |
| ORG-2  | P0  | R1      | Support verified email and/or phone, staff invitations and account recovery                                                                            | done        | email confirmation, password reset, sign-in and staff invitations with accept and revoke; phone verification not built, which the "and/or" permits                                                                                |
| ORG-3  | P0  | R1      | Provide roles including Owner/Admin, Property Manager, Letting Agent, Caretaker, Maintenance Coordinator, Accountant, Screening Reviewer, Landlord…    | done        | app_role enum + permission catalogue in org/domain/roles.ts                                                                                                                                                                       |
| ORG-4  | P0  | R1      | Enforce role-based and property/portfolio-scoped access                                                                                                | done        | memberships + assignments + app.has_role; resolveAccess                                                                                                                                                                           |
| ORG-5  | P0  | R1      | Record audit events for financial changes, lease changes, screening decisions, sensitive document access, maintenance approvals and permission changes | done        | append-only trail with before/after and reason; lease, deposit, mandate, assignment, membership, import and document-access changes audited; a coverage test makes a new table fail until it is audited or exempted with a reason |
| ORG-6  | P1  | R2      | Support multiple branches, teams and branch-level reporting                                                                                            | todo        |                                                                                                                                                                                                                                   |
| ORG-7  | P1  | R2      | Allow organisation administrators to configure approval limits, workflow templates and notification defaults                                           | todo        |                                                                                                                                                                                                                                   |
| ORG-8  | P0  | R1      | Ensure every tenant organisation’s data is isolated at the database level                                                                              | done        | RLS on every table; schema-wide pgTAP guard + isolation tests                                                                                                                                                                     |
| ORG-9  | P0  | R1      | Provide session management: device list, remote sign-out, session timeout and password reset controls                                                  | in-progress | device_sessions and own-device policies; sign-out and session refresh built; device list and remote revocation not                                                                                                                |
| ORG-10 | P1  | R2      | Offer optional two-factor authentication for all users and make it configurable as required for owners and accountants                                 | todo        |                                                                                                                                                                                                                                   |

## Properties & units (`PROP`)

PRD section 8.2 · owner `packages/core/src/modules/properties`

| ID      | Pri | Release | Requirement                                                                                                                             | Status | Notes                                                                                         |
| ------- | --- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| PROP-1  | P0  | R1      | Create properties with name/reference, address, state, LGA/area, property type, photos, notes and optional map coordinates              | done   | properties with address, state, LGA, coordinates; photos now storable and servable via TV-014 |
| PROP-2  | P0  | R1      | Create units with label/reference, type, size/bedrooms where applicable, occupancy status, asking/contracted rent, facilities and notes | done   | units with type, status, rent in kobo, facilities                                             |
| PROP-3  | P0  | R1      | Support statuses such as vacant, occupied, reserved, under maintenance and inactive                                                     | done   | unit_status enum: vacant/occupied/reserved/under_maintenance/inactive                         |
| PROP-4  | P0  | R1      | Import properties and units from spreadsheet templates with row-level validation and error reporting                                    | done   | header mapping, row-level validation, dry run, apply_property_import                          |
| PROP-5  | P0  | R1      | Link properties to one landlord; support ownership shares and multiple landlords in a later release                                     | done   | properties.landlord_id with same-organisation trigger                                         |
| PROP-6  | P1  | R2      | Support custom fields per property or unit                                                                                              | todo   |                                                                                               |
| PROP-7  | P1  | R2      | Keep an internal vacancy history, including dates vacant/occupied, reason for vacancy and next action                                   | todo   |                                                                                               |
| PROP-8  | P1  | R2      | Attach property-specific operating documents, warranties, manuals and inspection records                                                | todo   |                                                                                               |
| PROP-9  | P0  | R1      | Do not expose property records in a public marketplace or public search index                                                           | done   | no unauthenticated route or grant; anon revoked and asserted                                  |
| PROP-10 | P1  | R2      | Generate an agency-controlled unit sheet (PDF or private link) that staff can send to a prospect                                        | todo   |                                                                                               |

## Landlords & management mandates (`OWN`)

PRD section 8.3 · owner `packages/core/src/modules/landlords`

| ID    | Pri | Release | Requirement                                                                                                     | Status      | Notes                                                                                                               |
| ----- | --- | ------- | --------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| OWN-1 | P0  | R1      | Store landlord contact details, preferred communication channel and remittance details with restricted access   | done        | landlords + landlord_remittance_details (restricted policy, masked audit)                                           |
| OWN-2 | P0  | R1      | Configure management mandate, commission type/rate, remittance schedule and permitted deductions                | done        | management_mandates with commission/deduction constraints                                                           |
| OWN-3 | P0  | R1      | Give landlords secure read-only access to their assigned properties, statements, balances and documents         | in-progress | read-only policies on properties, units and mandates done; the landlord portal and statements are TV-053 (Sprint 9) |
| OWN-4 | P1  | R2      | Allow landlords to approve or reject repairs above a configurable amount                                        | todo        |                                                                                                                     |
| OWN-5 | P1  | R2      | Allow landlord comments, approval history and supporting attachments on relevant maintenance requests           | todo        |                                                                                                                     |
| OWN-6 | P1  | R2      | Show landlords agreed portfolio indicators such as occupancy, arrears, maintenance costs and remittance history | todo        |                                                                                                                     |

## Tenants & lease management (`LEASE`)

PRD section 8.4 · owner `packages/core/src/modules/leases`

| ID       | Pri | Release | Requirement                                                                                                                                      | Status      | Notes                                                                                                                                                   |
| -------- | --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LEASE-1  | P0  | R1      | Maintain tenant records, contacts, optional next-of-kin/employer/business details and authorised documents                                       | done        | tenants + tenant_contacts (next of kin, employer, referee)                                                                                              |
| LEASE-2  | P0  | R1      | Create a lease with tenant(s), unit, dates, rent, payment frequency, due dates, deposit and other charges                                        | done        | leases with dates, rent, frequency, due day; lease_parties                                                                                              |
| LEASE-3  | P0  | R1      | Support lease states draft, active, expiring soon, expired, terminated and renewed                                                               | in-progress | draft/active/expired/terminated/renewed stored; expiring_soon derived in lease_overview; screening states await R2                                      |
| LEASE-4  | P0  | R1      | Generate renewal records from existing leases while retaining historical terms                                                                   | done        | renew_lease: new lease linked to the old, parties and deposit carried                                                                                   |
| LEASE-5  | P0  | R1      | Record move-in, move-out, handover notes, outstanding balance, meter readings and deposit handling                                               | done        | lease_handovers with meter readings, balance, keys, evidence                                                                                            |
| LEASE-6  | P0  | R1      | Configure expiry alerts, for example 90, 60 and 30 days before expiry                                                                            | done        | organisations.lease_expiry_alert_days + derived alert threshold                                                                                         |
| LEASE-7  | P1  | R2      | Support configurable rent-review/escalation rules and approval before applying new terms                                                         | todo        |                                                                                                                                                         |
| LEASE-8  | P2  | R3      | Provide tenancy agreement templates and electronic signature through an appropriate provider                                                     | todo        |                                                                                                                                                         |
| LEASE-9  | P1  | R2      | Support co-tenants and guarantors                                                                                                                | todo        |                                                                                                                                                         |
| LEASE-10 | P1  | R2      | Create a tenant lease from an approved application without re-entering the same information                                                      | todo        |                                                                                                                                                         |
| LEASE-11 | P0  | R1      | Preserve lease and tenant history when a tenant record is updated or a lease is terminated                                                       | done        | leases never deleted; renewal preserves the original terms                                                                                              |
| LEASE-12 | P0  | R1      | Create a lease directly from a tenant and unit without an application                                                                            | done        | create_lease_with_tenant — the R1 default path                                                                                                          |
| LEASE-13 | P0  | R1      | Manage the caution deposit lifecycle: record the deposit as client funds, hold status, deductions at move-out with evidence and approval, and…   | in-progress | deposit lifecycle, append-only deductions and custody done; the ledger entry each step must produce arrives with the landlord ledger (TV-029, Sprint 5) |
| LEASE-14 | P1  | R2      | Generate notices and letters from agency-configured templates (formal rent reminder, lease expiry or renewal notice, rent-review notice, demand… | todo        |                                                                                                                                                         |

## Rent schedules, payments & arrears (`RENT`)

PRD section 8.5 · owner `packages/core/src/modules/rent`

| ID      | Pri | Release | Requirement                                                                                                                       | Status | Notes |
| ------- | --- | ------- | --------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| RENT-1  | P0  | R1      | Generate charges from lease terms, including annual, half-yearly, quarterly or monthly rent where configured                      | todo   |       |
| RENT-2  | P0  | R1      | Record payments received through cash, bank transfer, POS or other configured methods, with reference and evidence                | todo   |       |
| RENT-3  | P0  | R1      | Allocate payments to one or more charges and issue receipts                                                                       | todo   |       |
| RENT-4  | P0  | R1      | Support reversals and corrections without silently overwriting the financial history                                              | todo   |       |
| RENT-5  | P0  | R1      | Provide rent roll, upcoming dues, arrears ageing and payment history by tenant, unit, property, landlord and portfolio            | todo   |       |
| RENT-6  | P0  | R1      | Configure reminders and follow-up tasks for upcoming and overdue charges                                                          | todo   |       |
| RENT-7  | P1  | R2      | Configure late fees only where the agency’s policy and applicable law permit them                                                 | todo   |       |
| RENT-8  | P1  | R2      | Provide virtual accounts and payment links via a licensed payment partner, with signed webhooks, idempotency and reconciliation   | todo   |       |
| RENT-9  | P1  | R2      | Match incoming bank/payment records to tenants, units and charges; provide a review queue for ambiguous matches                   | todo   |       |
| RENT-10 | P1  | R2      | Support scheduled landlord remittance runs with approval and reconciliation                                                       | todo   |       |
| RENT-11 | P1  | R2      | Export financial records for external accounting tools                                                                            | todo   |       |
| RENT-12 | P0  | R1      | Clearly label recorded payments versus partner-confirmed payments; never claim payment is confirmed without reliable confirmation | todo   |       |
| RENT-13 | P0  | R1      | Issue receipts with unique, sequential numbers per organisation (per branch if configured)                                        | todo   |       |
| RENT-14 | P0  | R1      | Handle part payments, overpayments and tenant credit                                                                              | todo   |       |
| RENT-15 | P0  | R1      | Provide a daily cash-up per user and payment method for reconciliation against bank and cash                                      | todo   |       |
| RENT-16 | P0  | R1      | Support opening balances and historical arrears at cutover (see MIG-2)                                                            | todo   |       |

## Landlord ledger, statements & remittances (`LEDGER`)

PRD section 8.6 · owner `packages/core/src/modules/ledger`

| ID        | Pri | Release | Requirement                                                                                                                                         | Status | Notes |
| --------- | --- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| LEDGER-1  | P0  | R1      | Maintain an auditable landlord ledger for rent receipts, commission, approved costs, adjustments and remittances                                    | todo   |       |
| LEDGER-2  | P0  | R1      | Generate period statements showing opening balance, collections, deductions, costs, remittances and closing balance                                 | todo   |       |
| LEDGER-3  | P0  | R1      | Attach receipts, invoices and approval evidence to ledger-related entries                                                                           | todo   |       |
| LEDGER-4  | P0  | R1      | Separate landlord/client funds from agency income in the data model and financial reports                                                           | todo   |       |
| LEDGER-5  | P0  | R1      | Restrict statement visibility to authorised staff and the relevant landlord                                                                         | todo   |       |
| LEDGER-6  | P1  | R2      | Support approval and batch processing of remittance schedules                                                                                       | todo   |       |
| LEDGER-7  | P1  | R2      | Allow branded PDF and downloadable statements                                                                                                       | todo   |       |
| LEDGER-8  | P0  | R1      | Route statements through draft, reviewed and issued states                                                                                          | todo   |       |
| LEDGER-9  | P0  | R1      | Recognise commission when rent is received by default, with the basis defined in the mandate                                                        | todo   |       |
| LEDGER-10 | P1  | R2      | Support configurable tax lines (for example VAT on commission, withholding tax on rent), off by default and validated with a tax adviser before use | todo   |       |
| LEDGER-11 | P1  | R2      | Record the settlement-account model for partner-provided virtual accounts (agency client account, landlord account or split) as organisation…       | todo   |       |

## Maintenance & repairs (`MAINT`)

PRD section 8.7 · owner `packages/core/src/modules/maintenance`

| ID       | Pri | Release | Requirement                                                                                                                                        | Status | Notes |
| -------- | --- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| MAINT-1  | P0  | R1      | Create a maintenance request against a property/unit, submitted by staff or tenant                                                                 | todo   |       |
| MAINT-2  | P0  | R1      | Capture category, description, urgency, reported date, access constraints, photos/videos where supported, and whether the issue affects safety or… | todo   |       |
| MAINT-3  | P0  | R1      | Track core statuses Submitted, Acknowledged, Assigned, In Progress, On Hold, Completed, Rejected and Closed                                        | todo   |       |
| MAINT-4  | P0  | R1      | Assign an owner/coordinator, priority, due date and responsible staff member                                                                       | todo   |       |
| MAINT-5  | P0  | R1      | Record activity timeline, comments, status changes, attachments and communications                                                                 | todo   |       |
| MAINT-6  | P0  | R1      | Maintain vendor records, contact details, trade/category, service areas, availability notes and internal performance history                       | todo   |       |
| MAINT-7  | P1  | R2      | Request and compare one or more vendor quotations, including labour, materials, call-out fees, taxes and validity period                           | todo   |       |
| MAINT-8  | P1  | R2      | Configure approval thresholds by landlord, property, cost or job category                                                                          | todo   |       |
| MAINT-9  | P1  | R2      | Create work orders with scope, assigned vendor, target date, agreed cost and access instructions                                                   | todo   |       |
| MAINT-10 | P0  | R1      | Record actual cost, invoices, receipts, before/after photos and completion notes                                                                   | todo   |       |
| MAINT-11 | P0  | R1      | Allocate repair costs to landlord, tenant, agency, service charge or another configured payer, with reason and approval                            | todo   |       |
| MAINT-12 | P0  | R1      | Notify tenants of acknowledgement, appointment/visit, status changes and completion, subject to notification preferences                           | todo   |       |
| MAINT-13 | P1  | R2      | Let tenants confirm whether the issue is resolved or reopen it with a reason                                                                       | todo   |       |
| MAINT-14 | P1  | R2      | Support recurring preventive maintenance and inspection schedules                                                                                  | todo   |       |
| MAINT-15 | P1  | R2      | Track response time, resolution time, repeat incidents, vendor cost and overdue jobs                                                               | todo   |       |
| MAINT-16 | P0  | R1      | Preserve the repair history against the property/unit even after a tenancy ends                                                                    | todo   |       |
| MAINT-17 | P1  | R2      | Support emergency escalation rules, named contacts and an auditable record of actions taken                                                        | todo   |       |

## CRM pipeline & prospects (`CRM`)

PRD section 8.8 · owner `packages/core/src/modules/crm`

| ID     | Pri | Release | Requirement                                                                                                                                       | Status | Notes |
| ------ | --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| CRM-1  | P1  | R2      | Create a prospect manually or from an agency-controlled channel such as a phone call, WhatsApp message, referral, email or private enquiry form   | todo   |       |
| CRM-2  | P1  | R2      | Record contact details, preferred contact method, requested property/unit or property type, budget range, preferred area, intended move-in date,… | todo   |       |
| CRM-3  | P1  | R2      | Track configurable pipeline stages, with defaults such as New, Contacted, Qualified, Appointment Booked, Viewed, Application Started, Screening,… | todo   |       |
| CRM-4  | P1  | R2      | Assign each lead to an agent or team and record the source, owner, next action and follow-up due date                                             | todo   |       |
| CRM-5  | P1  | R2      | Maintain a chronological activity timeline for calls, messages, appointments, notes, tasks and stage changes                                      | todo   |       |
| CRM-6  | P1  | R2      | Schedule reminders and overdue follow-up alerts; show an agent’s daily follow-up queue                                                            | todo   |       |
| CRM-7  | P1  | R2      | Detect likely duplicate leads and allow authorised merging while preserving activity history                                                      | todo   |       |
| CRM-8  | P1  | R2      | Record lost reasons and nurture dates, and support reactivation without creating duplicate records                                                | todo   |       |
| CRM-9  | P1  | R2      | Convert a qualified lead to an application and, after approval, to a tenant/lease while reusing data with permission                              | todo   |       |
| CRM-10 | P1  | R2      | Report lead response time, pipeline ageing, appointment conversion, application conversion, lead-to-lease rate and lost reasons                   | todo   |       |
| CRM-11 | P1  | R2      | Support messaging templates for follow-ups via configured WhatsApp Business, SMS and email providers                                              | todo   |       |
| CRM-12 | P1  | R2      | Honour opt-outs and consent requirements for marketing communications                                                                             | todo   |       |

## Appointments & follow-ups (`APPT`)

PRD section 8.9 · owner `packages/core/src/modules/appointments`

| ID      | Pri | Release | Requirement                                                                                                         | Status | Notes |
| ------- | --- | ------- | ------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| APPT-1  | P1  | R2      | Schedule property viewings, tenant meetings, inspections, maintenance visits and other configured appointment types | todo   |       |
| APPT-2  | P1  | R2      | Link an appointment to a lead, tenant, property/unit, maintenance request or staff member as applicable             | todo   |       |
| APPT-3  | P1  | R2      | Record date, start/end time, location or meeting instructions, attendees, assigned staff and access requirements    | todo   |       |
| APPT-4  | P1  | R2      | Prevent or flag conflicts in the assigned staff member’s schedule and support rescheduling/cancellation             | todo   |       |
| APPT-5  | P1  | R2      | Send configurable confirmations and reminders through available channels, with delivery status where supported      | todo   |       |
| APPT-6  | P1  | R2      | Record outcomes such as Completed, No-show, Cancelled, Rescheduled, Interested, Follow-up Required or Not Suitable  | todo   |       |
| APPT-7  | P1  | R2      | Automatically create follow-up tasks from appointment outcomes, with an owner and due date                          | todo   |       |
| APPT-8  | P1  | R2      | Capture feedback, next steps and the prospect’s interest level after a viewing                                      | todo   |       |
| APPT-9  | P1  | R2      | Provide calendar and list views, daily agenda and filters by team, appointment type and status                      | todo   |       |
| APPT-10 | P2  | R3      | Integrate with external calendars where justified and permitted by user consent                                     | todo   |       |

## Configurable tenant screening (`SCREEN`)

PRD section 8.10 · owner `packages/core/src/modules/screening`

| ID        | Pri | Release | Requirement                                                                                                                                        | Status | Notes |
| --------- | --- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| SCREEN-1  | P1  | R2      | Create screening templates by organisation and optionally apply overrides by property, landlord or unit type                                       | todo   |       |
| SCREEN-2  | P1  | R2      | Configure steps such as identity evidence, employment/business information, income/affordability evidence, previous landlord reference, guarantor… | todo   |       |
| SCREEN-3  | P1  | R2      | Mark each step required/optional, assign a reviewer, define accepted evidence types and set an expiry/recency rule where appropriate               | todo   |       |
| SCREEN-4  | P1  | R2      | Support statuses such as Not Started, Requested, Submitted, Under Review, More Information Required, Passed, Failed, Waived and Expired, with…     | todo   |       |
| SCREEN-5  | P1  | R2      | Provide a tenant-facing application form and secure document-upload flow within the portal                                                         | todo   |       |
| SCREEN-6  | P1  | R2      | Record applicant consent, purpose, timestamp, privacy notice version and any third-party checks requested                                          | todo   |       |
| SCREEN-7  | P1  | R2      | Keep reviewer notes, evidence, decision rationale, reviewer identity and timestamps in an auditable history                                        | todo   |       |
| SCREEN-8  | P1  | R2      | Restrict access to screening information to explicitly authorised roles; do not expose sensitive screening notes to other tenants or general staff | todo   |       |
| SCREEN-9  | P1  | R2      | Allow a reviewer to request additional information and notify the applicant of required actions without revealing confidential internal notes      | todo   |       |
| SCREEN-10 | P1  | R2      | Prevent lease activation where required screening steps remain incomplete, unless an authorised user records an override and reason                | todo   |       |
| SCREEN-11 | P1  | R2      | Support configurable retention and deletion/anonymisation rules for rejected or withdrawn applications, subject to legal obligations               | todo   |       |
| SCREEN-12 | P1  | R2      | Report application volume, completion time, pending steps and outcomes without exposing unnecessary personal details                               | todo   |       |
| SCREEN-13 | P2  | R3      | Integrate with identity or reference-check providers only after security, legal, pricing and data-processing review                                | todo   |       |
| SCREEN-14 | P1  | R2      | Do not use protected or sensitive personal characteristics as screening criteria                                                                   | todo   |       |
| SCREEN-15 | P1  | R2      | Treat national and financial identifiers (for example NIN and BVN) as highly sensitive                                                             | todo   |       |
| SCREEN-16 | P1  | R2      | Apply each template's criteria consistently across applicants and record the criteria version used, so decisions can be reviewed for fairness      | todo   |       |

## Tenant self-service portal (`TENANT`)

PRD section 8.11 · owner `packages/core/src/modules/tenant-portal`

| ID        | Pri | Release | Requirement                                                                                                                                  | Status | Notes |
| --------- | --- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| TENANT-1  | P0  | R1      | Provide secure tenant access linked to the correct organisation, tenant record and active lease                                              | todo   |       |
| TENANT-2  | P0  | R1      | Show lease summary, rent due dates, charge breakdown, recorded payment history, receipts and current balance                                 | todo   |       |
| TENANT-3  | P1  | R2      | Show partner-confirmed payments and virtual account/payment instructions when enabled; clearly distinguish pending from confirmed payments   | todo   |       |
| TENANT-4  | P0  | R1      | Let tenants submit maintenance requests with category, description, preferred access times and attachments                                   | todo   |       |
| TENANT-5  | P1  | R2      | Let tenants track repair status, appointments, expected next step and relevant messages                                                      | todo   |       |
| TENANT-6  | P0  | R1      | Provide access to lease documents, receipts, notices and other documents explicitly shared with the tenant                                   | todo   |       |
| TENANT-7  | P1  | R2      | Allow tenants to update permitted contact details and notification preferences; sensitive changes may require verification or staff approval | todo   |       |
| TENANT-8  | P1  | R2      | Provide a secure communication/request channel and show status for submitted requests                                                        | todo   |       |
| TENANT-9  | P1  | R2      | Show renewal prompts and allow a tenant to indicate whether they wish to renew, without automatically renewing a lease                       | todo   |       |
| TENANT-10 | P2  | R3      | Provide a financing information area only where an eligible partner is integrated                                                            | todo   |       |
| TENANT-11 | P2  | R3      | Obtain explicit, purpose-specific consent before sharing tenant data with a financing partner                                                | todo   |       |
| TENANT-12 | P2  | R3      | Allow a tenant to start a financing referral/application and redirect or securely hand off to the provider’s approved flow                   | todo   |       |
| TENANT-13 | P2  | R3      | Do not promise approval, display misleading affordability claims or describe financing as a Tenaville loan                                   | todo   |       |
| TENANT-14 | P0  | R1      | Provide responsive mobile web access for tenants and landlords in R1                                                                         | todo   |       |
| TENANT-15 | P1  | R2      | Provide accessible language, low-data and clear error/retry behaviour for common tenant actions                                              | todo   |       |

## Rent financing & partner integrations (`FIN`)

PRD section 8.12 · owner `packages/core/src/modules/financing`

| ID     | Pri | Release | Requirement                                                                                                                                          | Status | Notes |
| ------ | --- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| FIN-1  | P2  | R3      | Design a provider-neutral integration boundary so a financing partner can be added or replaced without rewriting core tenancy workflows              | todo   |       |
| FIN-2  | P2  | R3      | Only onboard providers after legal/regulatory review, due diligence, security review and clear contractual responsibilities                          | todo   |       |
| FIN-3  | P2  | R3      | Make clear who the lender is, who makes the credit decision, who services the financing and who receives repayments                                  | todo   |       |
| FIN-4  | P2  | R3      | Do not let Tenaville receive, pool, lend or hold tenant financing proceeds unless a separately approved legal/regulatory model explicitly permits it | todo   |       |
| FIN-5  | P2  | R3      | Share only consented minimum data and record consent, payload, provider reference and handoff time                                                   | todo   |       |
| FIN-6  | P2  | R3      | Keep financing application data and status access restricted and segregated from ordinary property-management permissions                            | todo   |       |
| FIN-7  | P2  | R3      | Support provider callbacks/webhooks with signature verification, idempotency, replay protection and audit logging                                    | todo   |       |
| FIN-8  | P2  | R3      | Record financing status separately from rent payment status                                                                                          | todo   |       |
| FIN-9  | P2  | R3      | Where contractually and technically supported, reconcile confirmed disbursements to the relevant rent charge and show the resulting payment evidence | todo   |       |
| FIN-10 | P2  | R3      | Do not charge tenants hidden fees or make financing a mandatory condition of tenancy management                                                      | todo   |       |

## Portfolio analytics & reporting (`AN`)

PRD section 8.13 · owner `packages/core/src/modules/analytics`

| ID    | Pri | Release | Requirement                                                                                                                                            | Status | Notes |
| ----- | --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ----- |
| AN-1  | P0  | R1      | Provide core operational reports: rent roll, occupancy/unit status, lease expiries, arrears, collections, maintenance queue and landlord statements    | todo   |       |
| AN-2  | P1  | R2      | Provide portfolio dashboard filters by date range, branch, property, landlord, manager and unit type, subject to permissions                           | todo   |       |
| AN-3  | P1  | R2      | Calculate occupancy rate using a documented and configurable denominator that excludes units intentionally marked inactive where appropriate           | todo   |       |
| AN-4  | P1  | R2      | Show rent billed versus collected, arrears ageing, collection rate, overdue balances and upcoming rent due                                             | todo   |       |
| AN-5  | P1  | R2      | Show lease expiry pipeline, renewal rate, vacancy duration, time from vacancy to occupancy and units requiring action                                  | todo   |       |
| AN-6  | P1  | R2      | Show maintenance request volume, response/resolution time, overdue jobs, repeat issues, cost by property/category/vendor and maintenance cost per unit | todo   |       |
| AN-7  | P1  | R2      | Show landlord-level collections, approved costs, deductions and net remittances                                                                        | todo   |       |
| AN-8  | P1  | R2      | Show CRM funnel metrics including lead response time, appointment attendance, application conversion and lead-to-lease conversion                      | todo   |       |
| AN-9  | P1  | R2      | Support export to CSV/XLSX/PDF where appropriate and permitted                                                                                         | todo   |       |
| AN-10 | P1  | R2      | Define metric formulas and time windows in the product so users can understand what each metric means                                                  | todo   |       |
| AN-11 | P2  | R3      | Support saved dashboards and configurable KPI cards for different roles                                                                                | todo   |       |
| AN-12 | P2  | R3      | Add optional benchmark comparisons only where reliable, lawful data sources exist; do not imply market-wide representativeness without evidence        | todo   |       |
| AN-13 | P0  | R1      | Enforce the same organisation and property-level access restrictions in analytics, exports and background reports as in the main application           | todo   |       |

## Communications, reminders & tasks (`COMMS`)

PRD section 8.14 · owner `packages/core/src/modules/comms`

| ID      | Pri | Release | Requirement                                                                                                                                        | Status | Notes |
| ------- | --- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| COMMS-1 | P0  | R1      | Provide configurable templates for rent reminders, receipts, lease expiry, maintenance updates and landlord statements                             | todo   |       |
| COMMS-2 | P0  | R1      | Abstract messaging providers for WhatsApp Business, SMS and email                                                                                  | todo   |       |
| COMMS-3 | P0  | R1      | Store message metadata, recipient, template, send time, delivery status where available and related record                                         | todo   |       |
| COMMS-4 | P0  | R1      | Allow tasks with owner, due date, priority, related record, notes and completion status                                                            | todo   |       |
| COMMS-5 | P1  | R2      | Support recurring tasks and automated task creation from configurable events                                                                       | todo   |       |
| COMMS-6 | P0  | R1      | Respect consent, opt-outs, channel preferences, rate limits and provider policy                                                                    | todo   |       |
| COMMS-7 | P1  | R2      | Provide an inbox or work queue for messages requiring a human response, subject to provider capabilities                                           | todo   |       |
| COMMS-8 | P0  | R1      | Model WhatsApp business messaging within provider rules: use provider-approved templates for business-initiated messages, track template approval… | todo   |       |

## Documents & inspections (`DOC`)

PRD section 8.15 · owner `packages/core/src/modules/documents`

| ID    | Pri | Release | Requirement                                                                                                                             | Status | Notes                                                                                                                 |
| ----- | --- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| DOC-1 | P0  | R1      | Attach documents to properties, units, landlords, tenants, leases, screening applications, maintenance jobs and payments as appropriate | todo   |                                                                                                                       |
| DOC-2 | P0  | R1      | Support access controls, document type, issue/expiry date, uploader and audit trail                                                     | todo   |                                                                                                                       |
| DOC-3 | P0  | R1      | Generate and download receipts and landlord statements                                                                                  | todo   |                                                                                                                       |
| DOC-4 | P1  | R2      | Support inspection checklists, photos, notes, meter readings and acknowledgement/signature capture where supported                      | todo   |                                                                                                                       |
| DOC-5 | P1  | R2      | Alert authorised staff to expiring documents                                                                                            | todo   |                                                                                                                       |
| DOC-6 | P1  | R2      | Scan uploads for malware where supported and use time-limited secure download links                                                     | todo   |                                                                                                                       |
| DOC-7 | P0  | R1      | Never expose a document through a guessable public URL; enforce authorisation at download time                                          | done   | private buckets, signed URLs minted after an RLS-governed check, access audited, storage policies as a second barrier |

## Subscription & billing (`BILL`)

PRD section 8.16 · owner `packages/core/src/modules/billing`

| ID     | Pri | Release | Requirement                                                                                                                      | Status      | Notes                                                                                                                                                                                                                                |
| ------ | --- | ------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BILL-1 | P0  | R1      | Offer a trial and subscription tiers priced primarily by units under management, billed in naira                                 | in-progress | the five published plans and their entitlements are reference data in a migration, priced in kobo, with annual variants at a 10 to 15 percent discount; no billing arithmetic, no trial lifecycle and no pricing UI (TV-151, TV-153) |
| BILL-2 | P0  | R1      | Support subscription payment through an appropriate Nigerian payment gateway, with invoices and receipts                         | todo        |                                                                                                                                                                                                                                      |
| BILL-3 | P0  | R1      | Show plan limits and upgrade prompts                                                                                             | todo        | the limits exist as columns on `plans`; nothing reads or enforces them yet (TV-147)                                                                                                                                                  |
| BILL-4 | P0  | R1      | Do not delete customer data solely because a subscription is unpaid; preserve export access subject to security and legal policy | in-progress | no cascade from subscription state; asserted in table comment; the read-only locking a downgrade needs is TV-152                                                                                                                     |
| BILL-5 | P1  | R2      | Validate any optional transaction or financing-related revenue model before implementation and disclose fees clearly             | todo        |                                                                                                                                                                                                                                      |

## Migration & onboarding (`MIG`)

PRD section 8.17 · owner `packages/core/src/modules/migration`

| ID    | Pri | Release | Requirement                                                                                                                                  | Status | Notes |
| ----- | --- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| MIG-1 | P0  | R1      | Import tenants, leases and current charges from spreadsheet templates, extending the property and unit import (PROP-4), with validation and… | todo   |       |
| MIG-2 | P0  | R1      | Import opening balances at a chosen cutover date: tenant arrears and credits, and landlord ledger balances                                   | todo   |       |
| MIG-3 | P0  | R1      | Provide a dry-run import that shows what will be created, with the ability to roll back a completed import batch                             | todo   |       |
| MIG-4 | P1  | R2      | Provide an onboarding checklist and sample templates, and an optional assisted-import service for larger agencies                            | todo   |       |
| MIG-5 | P0  | R1      | Let administrators export all organisation data in documented formats at any time                                                            | todo   |       |

## Staff mobile app (`MOB`)

PRD section 8.18 · owner `apps/mobile`

| ID    | Pri | Release | Requirement                                                                                                                                      | Status | Notes |
| ----- | --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ----- |
| MOB-1 | P0  | R1      | Provide native iOS and Android apps for staff covering daily field work: record a payment and send a receipt, view tenants and arrears, log and… | todo   |       |
| MOB-2 | P1  | R2      | Add inspection checklists with photos, notes and meter readings                                                                                  | todo   |       |
| MOB-3 | P0  | R1      | Support offline capture for maintenance notes and photos, tasks and payment records                                                              | todo   |       |
| MOB-4 | P0  | R1      | Offline payments get a clearly marked provisional receipt ("pending sync")                                                                       | todo   |       |
| MOB-5 | P0  | R1      | Show sync state (pending, synced, failed) per record with a visible retry, and never silently discard a failed write                             | todo   |       |
| MOB-6 | P0  | R1      | Protect devices: PIN or biometric lock, encrypted local storage, and remote session revocation that wipes locally cached data                    | todo   |       |
| MOB-7 | P0  | R1      | Support low-data operation: compress images before upload, resume interrupted uploads and paginate lists                                         | todo   |       |
| MOB-8 | P0  | R1      | Send push notifications for tasks, assignments and alerts                                                                                        | todo   |       |
| MOB-9 | P1  | R2      | Define supported OS versions and a forced-update policy for breaking API changes                                                                 | todo   |       |
