# Release plan and build order

From PRD §6 and §16.1. Priority maps to release: **P0 → R1**, **P1 → R2**, **P2 → R3**.

> **The [sprint backlog](sprint-backlog.md) is the planning unit.** 142 tickets, 690 story points,
> 23 two-week sprints, with every P0 and P1 requirement covered by at least one ticket. This document
> keeps the §16.1 build order, which the sprints follow — it explains _why_ the order is what it is,
> while the backlog says what to pick up next. [backlog-mapping.md](backlog-mapping.md) tracks what is
> built, ticket by ticket.
>
> Where the two disagree, the backlog decides sequencing and the PRD decides scope. The known
> divergences are listed in the mapping document; the one that matters most is that charge generation
> (RENT-1, TV-018) sits in Sprint 3 rather than the money sprint.

Counts below are generated from the PRD — see [traceability](traceability.md).

| Release                               | Theme                        | Requirements |
| ------------------------------------- | ---------------------------- | ------------ |
| R1 — Core management                  | Record, track and coordinate | 85 (P0)      |
| R2 — Workflow automation              | Coordinate and automate      | 90 (P1)      |
| R3 — Tenant services and intelligence | Improve outcomes and extend  | 19 (P2)      |

Features ahead of their release sit behind the `FEATURE_*` flags in `.env.example`, default off.

## R1 — core management

In PRD §16.1 order. Each step names the module directory that owns it.

| #   | Step                                                                                                | Sprint | Owner                                               | Key requirements                                         |
| --- | --------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------- | -------------------------------------------------------- |
| 1   | Foundations: organisation, auth, roles, audit, sessions, subscription shell, isolation tests        | 1      | `core/modules/org`, `core/modules/billing`          | ORG-1…5, ORG-8, ORG-9, BILL-1…4                          |
| 2   | Portfolio: landlords, mandates, properties, units, spreadsheet import                               | 2      | `core/modules/landlords`, `core/modules/properties` | OWN-1…3, PROP-1…5, PROP-9                                |
| 3   | Tenancy: tenants, direct lease creation, rent schedules, renewals, expiry alerts, deposit lifecycle | 3      | `core/modules/leases`                               | LEASE-1…6, LEASE-11…13                                   |
| 4   | Money: charges, payment records, allocation, receipts with numbering, reversals, cash-up, arrears   | 4      | `core/modules/rent`                                 | RENT-1…6, RENT-12…16                                     |
| 5   | Migration: tenant and lease import, opening balances, dry-run and rollback                          | 6      | `core/modules/migration`                            | MIG-1…3, MIG-5                                           |
| 6   | Landlord ledger: commission, statements with approval and revisions, remittances, exports           | 5-6    | `core/modules/ledger`                               | LEDGER-1…5, LEDGER-8, LEDGER-9                           |
| 7   | Staff mobile app: payments, tenants and arrears, maintenance logging, tasks, offline sync           | 10-11  | `apps/mobile`                                       | MOB-1, MOB-3…8                                           |
| 8   | Maintenance foundation: requests, assignment, statuses, attachments, vendors, costs                 | 8      | `core/modules/maintenance`                          | MAINT-1…6, MAINT-10…12, MAINT-16                         |
| 9   | Tenant and landlord web access: lease summary, receipts, documents, repair requests, statements     | 9      | `core/modules/tenant-portal`, `apps/web`            | TENANT-1, TENANT-2, TENANT-4, TENANT-6, TENANT-14, OWN-3 |
| 10  | Communications and tasks: templates, reminders, provider abstraction, consent                       | 7      | `core/modules/comms`, `adapters/messaging`          | COMMS-1…4, COMMS-6, COMMS-8                              |
| 11  | Hardening and pilot: security testing, backup/restore drills, performance, onboarding               | 12-13  | —                                                   | §12, §16.2                                               |

Documents and core reports (`DOC-1…3`, `DOC-7`, `AN-1`, `AN-13`) are cross-cutting P0 work delivered alongside the steps that need them.

### Exit criteria (PRD §16.2)

- At least 3 pilot agencies run live portfolios through a complete month-end cycle.
- Core records maintained without spreadsheet workarounds.
- Landlord statements accepted without material manual correction.
- Maintenance requests created, assigned, updated and closed with auditable history.
- Tenant portal access limited to the correct tenant and lease.
- Offline actions sync without duplicates, with failed and pending state visible.
- No open critical security or cross-tenant isolation defects.
- Backup restoration tested.
- Staff can export organisation data.
- Imported opening balances reconcile to each pilot agency's own records at cutover.
- Receipt numbering shows no gaps, duplicates or reuse in test and pilot data.
- Automated cross-tenant isolation tests pass in CI on every release.
- Offline payment recording tested with interrupted and repeated syncs, producing no duplicate payments.

## R2 — workflow automation

| #   | Step                                                                                                   | Owner                                                                      |
| --- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 12  | Payment automation: virtual accounts, payment links, reconciliation, remittance runs, settlement model | `core/modules/rent`, `core/modules/ledger`, `adapters/payments`            |
| 13  | CRM and appointments: pipeline, activity timeline, scheduling, outcomes, unit sheets                   | `core/modules/crm`, `core/modules/appointments`, `core/modules/properties` |
| 14  | Configurable screening: templates, evidence, review, decisions, consent, audit                         | `core/modules/screening`                                                   |
| 15  | Maintenance expansion: quotations, approvals, work orders, preventive schedules, inspections           | `core/modules/maintenance`, `core/modules/documents`                       |
| 16  | Analytics: operational dashboard, then CRM, maintenance and portfolio KPIs                             | `core/modules/analytics`                                                   |
| 17  | Notices, letters and tax lines                                                                         | `core/modules/leases`, `core/modules/ledger`                               |

### Exit criteria (PRD §16.3)

- CRM leads assigned, followed up, scheduled and converted to applications without losing activity history.
- Configured screening steps enforced; overrides permission-controlled and audited.
- Maintenance approvals prevent non-emergency work being marked authorised before required approval.
- Analytics metrics documented and reconciling with underlying records.

## R3 — tenant services and intelligence

| #   | Step                                                                                           | Owner                                                               |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 18  | Rent-financing partner integration — only after provider, legal, privacy and security approval | `core/modules/financing`, `adapters/financing`                      |
| 19  | Advanced analytics, e-signature, API, expanded branch controls                                 | `core/modules/analytics`, `core/modules/leases`, `core/modules/org` |

### Exit criteria (PRD §16.4)

- Financing referral disabled by default until a provider passes required legal, security and operational checks.
- Financing consent captured before any personal data is shared; an approval alone never marks rent as paid.
- Financing status and rent payment status stored and displayed separately.

## Capacity warning and cut order

PRD §16.1 is explicit, and it is the reason the repository is organised by domain module:

> If delivery capacity is limited, protect the money, ledger, migration and mobile payment flows first, since they decide whether an agency can switch from spreadsheets.

Defer in this order:

1. Tenant-portal extras
2. Inspections
3. Maintenance expansion
4. Analytics beyond the operational reports
5. CRM and appointments
6. Screening
7. Financing

Re-confirm sizing with a bottom-up estimate once the data model and API are drafted.

## Targets to validate in the pilot

Starting hypotheses from PRD §4.4, to be replaced with measured baselines agreed with pilot agencies.

| Metric                     | Hypothesis                                                       |
| -------------------------- | ---------------------------------------------------------------- |
| Activation                 | 10+ units imported and a lease or payment recorded within 7 days |
| Payment-status currency    | ≥95% of active leases updated within 7 days of the due date      |
| Statement preparation time | ≥50% below the agency's own baseline                             |
| Repair acknowledgement     | Within one business day for most requests                        |
| Offline sync integrity     | Zero duplicate payments or receipts                              |
| Month-3 retention          | Set after the pilot, from the first paying cohort                |
