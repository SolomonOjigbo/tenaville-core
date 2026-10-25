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

## A coverage gap the ID check could not see

Every P0 and P1 requirement has a ticket, and `tools/check-backlog.mjs` proves
it. What it cannot prove is that every _clause_ of a requirement is in some
ticket's scope.

**ORG-2 requires "verified email and/or phone, staff invitations and account
recovery".** Email confirmation and password reset were built by TV-003, whose
acceptance criteria stop at landing as Owner. Staff invitations were in no
ticket at all — not TV-003, not TV-004, which is roles and scoped access. An
agency with one owner and no way to add a property manager cannot operate, and
ORG-2 is P0.

**TV-143 was added for it and is built.** The check that caught the omission
was a human reading the requirement text beside the ticket list; the tooling
could not have found it. Worth repeating for other multi-clause requirements —
RENT-13, LEDGER-8 and MAINT-3 each pack several obligations into one line.

## Clause-level review

Requirements that pack several obligations into one line, read against the
tickets that claim them. ORG-2 hid a missing P0 feature this way; these three
were the next most likely to.

### RENT-13 — receipts (TV-024, Sprint 4)

> Issue receipts with unique, sequential numbers per organisation (per branch
> if configured). Voided or reversed receipts keep their numbers, and numbers
> are never reused.

| Clause                                | In scope?                              |
| ------------------------------------- | -------------------------------------- |
| Issue receipts                        | yes                                    |
| Unique numbers                        | yes — AC tests two concurrent payments |
| **Sequential, with no gaps**          | **no**                                 |
| Per organisation                      | yes                                    |
| Per branch if configured              | yes                                    |
| Voided receipts keep their number     | yes                                    |
| _Reversed_ receipts keep their number | ambiguous                              |
| Numbers never reused                  | yes                                    |

**Gaplessness is a launch exit criterion that no acceptance criterion tests.**
§16.2 requires "no gaps, duplicates or reuse in test and pilot data"; TV-024's
AC covers duplicates and reuse only.

This matters because the obvious implementation fails it. A Postgres sequence
is non-transactional by design: `nextval` is not rolled back, so every failed
payment transaction burns a number and leaves a gap. An implementation can pass
TV-024's AC and fail §16.2 on the pilot's first failed save. A gapless sequence
needs a counter row locked within the payment transaction — slower, and
deliberately so.

Two related points:

- **Voided versus reversed.** TV-024 says voided; RENT-4 (TV-025) covers
  reversals but its AC is about the payment entry, not the receipt number. If
  an agency voids and reverses by different routes, only one is tested.
- **Offline numbering shares the sequence.** MOB-4 (TV-064, Sprint 11) has the
  server assign official numbers on sync. Gaplessness has to hold across both
  paths, which neither ticket says. Sprint 4 should settle the mechanism so
  Sprint 11 inherits it.

### LEDGER-8 — statements (TV-032, Sprint 6)

> Route statements through draft, reviewed and issued states. Issued statements
> are immutable; corrections are issued as a numbered revision that references
> the original.

Every clause is in scope, and the AC tests each: the three states, immutability
of an issued statement, a numbered revision, and the link back to the original.
**No gap.**

Two questions the requirement does not answer, so they are not omissions from
the ticket but still need deciding before Sprint 6:

- Who may move a statement from reviewed to issued? LEDGER-6 (approval and
  batching) is R2, so R1 has a review state with no stated authority.
- Does a revision itself pass through draft and reviewed, or is it issued
  directly?

### MAINT-3 — maintenance statuses (TV-045, Sprint 8)

> Track core statuses Submitted, Acknowledged, Assigned, In Progress, On Hold,
> Completed, Rejected and Closed. When quotation and approval workflows are
> enabled (P1), add Triage, Awaiting Quote, Awaiting Landlord Approval and
> Approved. Administrators may configure allowed transitions.

| Clause                                                      | In scope?    |
| ----------------------------------------------------------- | ------------ |
| Eight core statuses                                         | yes — TV-045 |
| **Four more when quote and approval workflows are enabled** | **no**       |
| **Administrators configure allowed transitions**            | **no**       |

**The four conditional statuses are in no ticket.** TV-045 is R1 and covers the
core set. TV-117 (quotations) and TV-118 (approvals) are R2 and describe the
workflows without adding the statuses they imply — a job cannot wait on a quote
if there is no Awaiting Quote.

This also slipped past the backlog's own rule that no R1 ticket may depend on a
P1 requirement: the P1 clause is _inside_ a P0 requirement, so nothing crossed a
ticket boundary to be caught.

**Administrator-configured transitions are enforcement, not configuration.**
TV-045's AC says "only allowed transitions are accepted", which is the engine
obeying a rule, not an administrator setting one. ORG-7 (TV-134, Sprint 22)
covers "workflow templates" and might be intended to carry it, but its AC names
limits and templates, not maintenance transitions — and Sprint 22 is long after
maintenance ships in Sprint 8.

### What to do

Three tickets, none urgent this week but all before their sprint:

| Need                                                                                           | Sprint it blocks |
| ---------------------------------------------------------------------------------------------- | ---------------- |
| Gapless receipt numbering, with a test for gaps, and the mechanism shared with offline sync    | 4                |
| The four conditional maintenance statuses, attached to TV-117 and TV-118                       | 20               |
| Administrator-configured maintenance transitions, or an explicit decision that ORG-7 covers it | 8                |

The first is the one to settle now: it changes how receipts are implemented, it
is an exit criterion, and Sprint 4 is next.

## Where the backlog and the earlier plan diverge

Four differences. The backlog is right in each case, and its sequencing now stands.

**Charges belong to Sprint 3, not the money sprint.** TV-018 (RENT-1, 8 points) puts charge and rent schedule generation in tenancy. The earlier plan deferred charges and shipped only the pure schedule computation, so TV-018 is partial and persisting `Charge` rows is the first thing Sprint 4 picks up.

**Private file storage is Sprint 2.** TV-014 (DOC-7, 5 points) was absent from the earlier step 2 entirely. Property photos and deposit-deduction evidence already store paths that nothing can serve, which is why PROP-1 is no longer marked done.

**The design system is Sprint 1.** TV-007 pairs the Tenaville palette with a web shell. The palette is integrated and checked for drift across its three representations; the shell is not built, and everything user-facing waits on it.

**Supporting work is ticketed too.** TV-001 includes staging deploy and error tracking. CI runs on every push, but nothing is deployed anywhere and no errors are being collected.
