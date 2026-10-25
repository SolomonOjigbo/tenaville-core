# Sprint backlog mapping

How the [sprint backlog](sprint-backlog.md) relates to what is built.

The backlog is the planning unit: 142 tickets, 690 story points, 23 two-week sprints, every P0 and P1 requirement covered. The [release plan](release-plan.md) keeps the PRD §16.1 build order, which the sprints follow. Where the two disagree, the backlog decides sequencing and the PRD decides scope.

`backlog.json` is the machine-readable copy. `tools/check-backlog.mjs` fails CI if a ticket references a requirement the PRD does not have, if a P0 or P1 requirement has no ticket, if an R1 ticket depends on a P1 requirement, or if a ticket status contradicts the traceability matrix. That last check earned its place immediately: it caught two requirements marked done whose tickets had not been started.

## Status

| Status       | Meaning                                         | Tickets | Points  |
| ------------ | ----------------------------------------------- | ------- | ------- |
| done         | implemented and covered by tests                | 8       | 30      |
| backend only | domain, schema and policies complete; no UI yet | 6       | 26      |
| partial      | something beyond UI is still missing            | 8       | 40      |
| todo         | not started                                     | 120     | 594     |
| **total**    |                                                 | **142** | **690** |

**59 of 690 points** are done or backend-complete, all within Sprints 1 to 3. No user interface exists, which is the largest single gap: every sprint from 1 onwards assumes working screens.

## What "done" means here

A requirement is done when an agency could rely on it, not when the schema admits it. Three were downgraded while writing this: LEASE-13 (every deposit step must produce a ledger entry, and there is no ledger), OWN-3 (landlords need statements, which do not exist) and PROP-1 (property photos cannot be uploaded or served until TV-014 builds private storage).

## Velocity

The backlog assumes about 30 points per sprint and says to re-baseline after Sprints 2 and 3. That cannot be done yet: this work was not timeboxed, so there is no elapsed sprint time to divide by. The first honest number comes from the first sprint actually run as one.

## Sprints 1 to 3

### Sprint 1 — Platform foundations

| Ticket | Pts | Title                                                                | Requirements | Status       | Notes                                                                                            |
| ------ | --- | -------------------------------------------------------------------- | ------------ | ------------ | ------------------------------------------------------------------------------------------------ |
| TV-001 | 5   | Project setup: monorepo, TypeScript, lint, tests, CI, staging deploy | —            | partial      | monorepo, TypeScript, lint, tests and CI done; staging deploy and error tracking not set up      |
| TV-002 | 5   | Database foundation: migrations, organisation key on every table, Ro | ORG-8        | done         | migrations, organisation_id everywhere, app.* RLS helpers, pgTAP coverage guard in CI            |
| TV-003 | 5   | Signup and verification: create agency or individual-landlord organi | ORG-1, ORG-2 | partial      | create_organisation_with_owner done; email/phone verification and password reset flows not built |
| TV-004 | 5   | Roles, permissions and scoped access (property and portfolio level)  | ORG-3, ORG-4 | backend only | memberships, assignments, app.has_role, permission catalogue; AC is API-level and met            |
| TV-005 | 3   | Audit log service: append-only events with who, when, before and aft | ORG-5        | done         | audit_events append-only with before/after and reason                                            |
| TV-006 | 3   | Session management: device list, remote sign-out, timeout            | ORG-9        | partial      | device_sessions table and own-device policies; device list and remote sign-out API not built     |
| TV-007 | 3   | Design system and web shell using the Tenaville palette              | —            | partial      | UI kit integrated into @tenaville/ui with a drift test; web shell and components not built       |

### Sprint 2 — Portfolio

| Ticket | Pts | Title                                                                | Requirements   | Status       | Notes                                                                                                                                                              |
| ------ | --- | -------------------------------------------------------------------- | -------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TV-008 | 3   | Landlord records with remittance details                             | OWN-1          | done         | landlords plus landlord_remittance_details, restricted policy, masked audit                                                                                        |
| TV-009 | 5   | Properties: create, edit, photos, notes, no public exposure          | PROP-1, PROP-9 | backend only | properties, property_photos, no public grant; create/edit screens not built                                                                                        |
| TV-010 | 3   | Units and statuses                                                   | PROP-2, PROP-3 | backend only | units with the five PROP-3 statuses; occupancy follows the lease                                                                                                   |
| TV-011 | 2   | Link property to landlord                                            | PROP-5         | done         | properties.landlord_id with a same-organisation trigger                                                                                                            |
| TV-012 | 5   | Management mandate: commission type and rate, remittance schedule, p | OWN-2          | backend only | management_mandates with commission, schedule and deduction constraints                                                                                            |
| TV-013 | 8   | Import framework with templates, validation and row-level errors; ap | PROP-4         | done         | header mapping, row-level validation, dry run, apply_property_import                                                                                               |
| TV-014 | 5   | Private file storage: signed URLs, image compression, authorisation  | DOC-7          | todo         | private buckets, signed URLs, image compression and download authorisation not built; property photos and deduction evidence already store paths nothing can serve |

### Sprint 3 — Tenancy

| Ticket | Pts | Title                                                                | Requirements      | Status       | Notes                                                                                          |
| ------ | --- | -------------------------------------------------------------------- | ----------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| TV-015 | 3   | Tenant records and contacts                                          | LEASE-1           | done         | tenants and tenant_contacts                                                                    |
| TV-016 | 5   | Create lease directly: parties, unit, dates, rent, frequency, deposi | LEASE-2, LEASE-12 | backend only | create_lease_with_tenant with parties and deposit in one transaction                           |
| TV-017 | 3   | Lease states and history preservation                                | LEASE-3, LEASE-11 | done         | stored lifecycle plus derived expiring_soon; history preserved on renewal                      |
| TV-018 | 8   | Charge and rent schedule generation (annual, half-yearly, quarterly, | RENT-1            | partial      | generateRentPeriods computes the schedule; Charge rows are not persisted yet                   |
| TV-019 | 3   | Renewals that retain history                                         | LEASE-4           | done         | renew_lease links the new lease, carries parties and transfers the deposit                     |
| TV-020 | 3   | Expiry alert engine (90, 60, 30 days, configurable)                  | LEASE-6           | partial      | derived state and alert threshold in lease_overview; the sending engine needs comms (Sprint 7) |
| TV-021 | 3   | Move-in and move-out records: handover notes, meter readings, balanc | LEASE-5           | backend only | lease_handovers with meter readings, balance, keys and evidence                                |

## Tickets touched outside Sprints 1 to 3

| Ticket | Sprint | Title                                                      | Status  | Notes                                                                                                    |
| ------ | ------ | ---------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| TV-029 | 5      | Caution deposit lifecycle as client funds                  | partial | lifecycle, deductions and custody built in Sprint 3; the ledger entry per step needs the landlord ledger |
| TV-053 | 9      | Landlord portal (read-only): properties, occupancy, collec | partial | read-only policies enforced and tested; portal screens and statements not built                          |

## Sprints 4 onwards

| Sprint | Release | Theme                                    | Tickets | Points |
| ------ | ------- | ---------------------------------------- | ------- | ------ |
| 4      | R1      | Money I: payments and receipts           | 5       | 29     |
| 5      | R1      | Landlord ledger I                        | 5       | 28     |
| 6      | R1      | Landlord ledger II and migration         | 6       | 29     |
| 7      | R1      | Communications and tasks                 | 6       | 31     |
| 8      | R1      | Maintenance I                            | 8       | 29     |
| 9      | R1      | Documents and portals                    | 5       | 28     |
| 10     | R1      | Staff mobile app I                       | 5       | 29     |
| 11     | R1      | Staff mobile app II: offline             | 5       | 29     |
| 12     | R1      | Billing, reports and hardening           | 6       | 29     |
| 13     | R1      | R1 pilot and release readiness           | 5       | 29     |
| 14     | R2      | Payment automation I                     | 5       | 31     |
| 15     | R2      | Payment automation II                    | 6       | 32     |
| 16     | R2      | CRM                                      | 7       | 29     |
| 17     | R2      | Appointments and leasing flow            | 7       | 32     |
| 18     | R2      | Configurable screening I                 | 6       | 29     |
| 19     | R2      | Screening II and lease rules             | 8       | 34     |
| 20     | R2      | Maintenance expansion                    | 6       | 31     |
| 21     | R2      | Inspections, documents and portal extras | 6       | 32     |
| 22     | R2      | Analytics and organisation settings      | 7       | 31     |
| 23     | R2      | Automation, onboarding and R2 release    | 7       | 31     |

## Where the backlog and the earlier plan diverge

Four differences. The backlog is right in each case, and its sequencing now stands.

**Charges belong to Sprint 3, not the money sprint.** TV-018 (RENT-1, 8 points) puts charge and rent schedule generation in tenancy. The earlier plan deferred charges and shipped only the pure schedule computation, so TV-018 is partial and persisting `Charge` rows is the first thing Sprint 4 picks up.

**Private file storage is Sprint 2.** TV-014 (DOC-7, 5 points) was absent from the earlier step 2 entirely. Property photos and deposit-deduction evidence already store paths that nothing can serve, which is why PROP-1 is no longer marked done.

**The design system is Sprint 1.** TV-007 pairs the Tenaville palette with a web shell. The palette is integrated and checked for drift across its three representations; the shell is not built, and everything user-facing waits on it.

**Supporting work is ticketed too.** TV-001 includes staging deploy and error tracking. CI runs on every push, but nothing is deployed anywhere and no errors are being collected.
