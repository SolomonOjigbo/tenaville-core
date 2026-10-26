# Tenaville Sprint Backlog: R1 and R2

**Product:** Tenaville property management platform
**Source:** Tenaville PRD v3.0 (all P0 requirements form R1; all P1 requirements form R2)
**Team model:** One developer working with AI coding agents
**Sprint length:** 2 weeks
**Plan size:** 23 sprints, 154 tickets, 735 story points (142 tickets and 690 points as originally supplied; see Amendments) (88 tickets and 421 points in R1; 66 tickets and 314 points in R2)

---

## 0. Amendments

Changes made to this plan after it was supplied. The CSV and
`backlog.json` carry them; this section records why.

| Ticket | Sprint | Points | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------ | ------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TV-143 | 1      | 5      | ORG-2 requires staff invitations, and no ticket covered that clause. TV-003's acceptance criteria stop at landing as Owner, and TV-004 is roles and scoped access. An agency with one owner and no way to add a property manager cannot operate, and ORG-2 is P0.                                                                                                                                                                                                                                                                         |
| TV-144 | 4      | 3      | RENT-13 requires _sequential_ numbers and §16.2 requires no gaps, but TV-024's criteria tested only uniqueness and reuse. The obvious implementation — a Postgres sequence — is non-transactional and leaves a gap on every rolled-back payment, so it would pass TV-024 and fail the exit criterion. Split out because offline sync draws from the same allocator (MOB-4). TV-024's criteria were amended to require no gaps.                                                                                                            |
| TV-145 | 20     | 2      | MAINT-3 adds Triage, Awaiting Quote, Awaiting Landlord Approval and Approved when the quote and approval workflows are enabled. TV-117 and TV-118 build those workflows without the statuses they imply.                                                                                                                                                                                                                                                                                                                                  |
| TV-146 | 8      | 3      | MAINT-3 requires administrators to configure allowed transitions. TV-045 enforces a transition rule; it does not let anyone set one. Whether this is MAINT-3's clause (P0) or ORG-7's workflow templates (P1) is unresolved, and the ticket resolves it.                                                                                                                                                                                                                                                                                  |
| TV-147 | 3      | +5     | The pricing decision in [sprint-4-decisions-and-pricing.md](sprint-4-decisions-and-pricing.md) defines five plans with hard limits on properties, units, users, storage and messages. Nothing enforced them. Placed in Sprint 3 because every later limit, warning and bill reads these numbers, and because a limit discovered late is a schema change.                                                                                                                                                                                  |
| TV-148 | 5      | +5     | Per-unit overage cannot be billed without a defensible count of active units. The count has to settle at period end with a grace window, which is logic, not a `select count(*)`.                                                                                                                                                                                                                                                                                                                                                         |
| TV-149 | 7      | +3     | The Free plan includes no paid messages, so free organisations need a way to send a receipt that costs nothing to run: click-to-chat opens WhatsApp on the staff member's own phone. Without it the Free tier cannot deliver a receipt at all.                                                                                                                                                                                                                                                                                            |
| TV-150 | 6      | +2     | Free-plan receipts and statements carry a Tenaville line and paid ones carry the agency's own branding. The decision treats this as the Free tier's consideration, so it is not optional polish.                                                                                                                                                                                                                                                                                                                                          |
| TV-151 | 9      | +5     | A 30-day trial with reminders on days 20, 27 and 30 and a 7-day grace is a dated lifecycle, not a flag. Placed after messaging (Sprint 7) and entitlements (Sprint 3), both of which it needs.                                                                                                                                                                                                                                                                                                                                            |
| TV-152 | 10     | +5     | BILL-4 forbids deleting data because a subscription lapsed, so a downgrade has to lock records read-only while keeping them printable and exportable, and restore them on upgrade. Placed after metering, which tells it what is over the limit.                                                                                                                                                                                                                                                                                          |
| TV-153 | 12     | +8     | The bill is a base price plus per-unit overage capped at the next tier's price, and annual plans bill a year in advance at a 10 to 15 percent discount. This is the arithmetic the whole pricing model rests on and it earns its own ticket.                                                                                                                                                                                                                                                                                              |
| TV-154 | 6      | +5     | LEASE-2 asks for a lease with "rent, payment frequency, due dates, deposit and other charges", and the PRD glossary spells out what the other charges are: service charge, utilities, an agreed fee. Nothing covered them, and LEASE-2 was marked done. Found while TV-018 built the charges table, whose `charge_kind` holds `'rent'` alone. Sprint 6 because a service charge has to appear on a statement, which is built there, and because TV-050 in Sprint 8 creates a tenant charge for a repair and needs a kind to create it as. |
| TV-037 | 6 → 13 | 0      | Moved, not resized. A full organisation data export written in Sprint 6 would cover a data model with no maintenance, no documents and no mobile data — all of which arrive in Sprints 8 to 11 — so it would have to be revisited. Sprint 13 is also where the question is actually asked: "can we get our data out" is a pilot agency's question, and MIG-5 promises it at any time.                                                                                                                                                     |
| TV-067 | 12     | −3     | Narrowed from 8 points to 5 and from BILL-1 and BILL-2 to BILL-2 alone. It had covered plans, trial and gateway together; TV-147, TV-151 and TV-153 now carry the first two. Leaving it at 8 would have counted the same work twice.                                                                                                                                                                                                                                                                                                      |
| TV-068 | 12     | −3     | Narrowed from 5 points to 2 and from BILL-3 and BILL-4 to BILL-3. Limit enforcement is TV-147, metering is TV-148, and the no-deletion guarantee is TV-152; what remains is the prompts and the plan-change flow.                                                                                                                                                                                                                                                                                                                         |

The coverage check in `tools/check-backlog.mjs` proves every P0 and P1
requirement _id_ appears on a ticket. It cannot prove that every _clause_ of a
requirement is in some ticket's scope, which is how all four were missed. The
review that found the last three is in
[backlog-mapping.md](backlog-mapping.md).

MAINT-3 shows a second blind spot: a P1 clause inside a P0 requirement. The
rule that no R1 ticket may depend on a P1 requirement cannot catch it, because
nothing crosses a ticket boundary.

TV-143 to TV-146 came from re-reading requirement text for clauses no ticket
owned. TV-147 to TV-153 came from a different direction: a commercial decision
(the pricing plan) that the backlog had reduced to two umbrella tickets. Both
failures are invisible to a requirement-id coverage check.

The seven additions are 36 points, which would have put Sprint 12 at 47 — well
outside the 28 to 34 range. Narrowing TV-067 and TV-068 removed 6 points of
double-counted scope, and TV-151 and TV-152 sit in Sprints 9 and 10, after the
messaging and metering they depend on. Every sprint is inside the range again;
`tools/check-backlog.mjs` now fails if this document disagrees with the CSV, so
the per-sprint totals here cannot quietly drift as they had for TV-143 to
TV-146.

TV-154 is the fifth ticket added for a clause no ticket owned, and the second
found by building the thing next to it rather than by reading. That is worth
noting: the review that produced TV-144 to TV-146 read the requirement text
closely and still missed this one, because "and other charges" reads as a
detail of a requirement whose main clause was built. Expect more of these at
the boundaries of what has just been implemented.

## 1. Planning assumptions

- **Points are relative complexity, not hours.** 1 is trivial, 2 is small, 3 is a short task, 5 is a substantial task, 8 is the largest allowed size. Anything bigger should be split before it is started.
- **Target velocity is about 30 points per sprint** (sprints range from 28 to 34 here). This is a starting guess for one developer using AI agents, including time for review, testing and support. It is not measured. **Re-baseline after Sprint 2 and Sprint 3** and re-plan the remaining sprints from the real number.
- **Add contingency.** Real plans slip. Hold back at least 20 percent as buffer, which turns 23 sprints (46 weeks) into roughly 28 sprints (about 56 weeks) as a realistic range until velocity is known.
- **Every P0 and P1 requirement in PRD v3 is covered** by at least one ticket (checked programmatically), and no R1 ticket depends on a P1 requirement. P2 items are excluded (see section 8).
- **Dates are not fixed.** Sprints are numbered, not dated. Sprint 1 starts when the decision gates in section 5 that apply to it are cleared.

## 2. Release milestones

| Milestone              | After sprint | What is true                                                                                                |
| ---------------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| M1: Ledger-grade core  | 6            | Portfolio, tenancy, payments, receipts, landlord ledger, statements and data import all work on the web app |
| M2: Field-ready        | 11           | Staff mobile app works offline with no duplicate payments in test                                           |
| M3: R1 pilot complete  | 13           | Three pilot agencies have completed a real month-end on the product; R1 exit criteria met                   |
| M4: Payments automated | 15           | Virtual accounts, payment links, matching and remittance runs work                                          |
| M5: Leasing workflow   | 19           | CRM, appointments, screening and notices are live                                                           |
| M6: R2 complete        | 23           | Maintenance expansion, analytics, settings and the R2 pilot are finished                                    |

## 3. Sprint overview

| Sprint | Weeks | Release | Theme                                    | Tickets | Points |
| ------ | ----- | ------- | ---------------------------------------- | ------- | ------ |
| 1      | 1-2   | R1      | Platform foundations                     | 8       | 34     |
| 2      | 3-4   | R1      | Portfolio                                | 7       | 31     |
| 3      | 5-6   | R1      | Tenancy                                  | 8       | 33     |
| 4      | 7-8   | R1      | Money I: payments and receipts           | 6       | 32     |
| 5      | 9-10  | R1      | Landlord ledger I                        | 6       | 33     |
| 6      | 11-12 | R1      | Landlord ledger II and migration         | 7       | 33     |
| 7      | 13-14 | R1      | Communications and tasks                 | 7       | 34     |
| 8      | 15-16 | R1      | Maintenance I                            | 9       | 32     |
| 9      | 17-18 | R1      | Documents and portals                    | 6       | 33     |
| 10     | 19-20 | R1      | Staff mobile app I                       | 6       | 34     |
| 11     | 21-22 | R1      | Staff mobile app II: offline             | 5       | 29     |
| 12     | 23-24 | R1      | Billing, reports and hardening           | 7       | 31     |
| 13     | 25-26 | R1      | R1 pilot and release readiness           | 6       | 32     |
| 14     | 27-28 | R2      | Payment automation I                     | 5       | 31     |
| 15     | 29-30 | R2      | Payment automation II                    | 6       | 32     |
| 16     | 31-32 | R2      | CRM                                      | 7       | 29     |
| 17     | 33-34 | R2      | Appointments and leasing flow            | 7       | 32     |
| 18     | 35-36 | R2      | Configurable screening I                 | 6       | 29     |
| 19     | 37-38 | R2      | Screening II and lease rules             | 8       | 34     |
| 20     | 39-40 | R2      | Maintenance expansion                    | 7       | 33     |
| 21     | 41-42 | R2      | Inspections, documents and portal extras | 6       | 32     |
| 22     | 43-44 | R2      | Analytics and organisation settings      | 7       | 31     |
| 23     | 45-46 | R2      | Automation, onboarding and R2 release    | 7       | 31     |

## 4. How to work this backlog with AI coding agents

1. **One ticket, one branch, one pull request.** Give the agent the ticket text, the linked PRD requirement IDs and the files it will touch. Do not hand over a whole sprint at once.
2. **Turn the acceptance line into tests first.** Ask the agent to write the failing test from the acceptance criteria, then the code. For money, ledger, isolation and sync tickets the tests are the real definition of done.
3. **Protect the invariants in every ticket.** Amounts are integer kobo. Ledger and payment records are append-only. Every table has an organisation key and a Row-Level Security policy. Financial writes from the mobile app are idempotent and server-authoritative. Put these in the agent's standing instructions.
4. **Human review is mandatory for money.** You review every change to allocation, receipts, ledger, statements, sync and webhooks before merging, even when tests pass.
5. **Keep tickets at 8 points or less.** If an agent struggles, split the ticket instead of extending the sprint.
6. **Demo at the end of each sprint** using the sprint's demo line, on staging, with realistic data.

**Definition of done for every ticket:** acceptance criteria demonstrated; automated tests pass in CI; tenant-isolation tests still pass; audit events written for changes to financial, lease or access data; no new table without a policy; documentation or runbook note added if behaviour changed.

## 5. Decision gates

These are open decisions from the PRD that block specific tickets. Resolve each before the sprint that needs it starts.

| When             | Decision needed                                                                                                  | Blocks                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Before Sprint 1  | Confirm the technology stack, hosting and domain; start the name, domain and CAC checks.                         | All                             |
| Before Sprint 4  | Receipt numbering format (prefix, branch, year) agreed with pilot agencies.                                      | Receipts ticket                 |
| Before Sprint 5  | How caution deposits are held and shown, and the commission basis for pilot agencies.                            | Deposit and commission tickets  |
| Before Sprint 7  | WhatsApp, SMS and email providers chosen, with messaging budget.                                                 | Messaging tickets               |
| Before Sprint 10 | Minimum supported iOS and Android versions.                                                                      | Mobile tickets                  |
| Before Sprint 14 | Payment partner shortlisted and the settlement model (agency client account, landlord account or split) decided. | Payment automation tickets      |
| Before Sprint 18 | Identity-verification approach and legal basis; confirm what identifiers may be collected.                       | Screening tickets               |
| Before Sprint 19 | Launch-state legal defaults for notices, late fees and rent review, reviewed by an adviser.                      | Notices, late fees, rent review |

## 6. Sprint backlog

### Release 1: core management

#### Sprint 1: Platform foundations (34 points)

**Goal:** A running, deployed skeleton where a new organisation can sign up and tenant isolation is proven by tests.  
**Demo:** Sign up, invite a staff user, show that a second organisation cannot see the first one's data.

- **TV-001 · Project setup: monorepo, TypeScript, lint, tests, CI, staging deploy, error tracking**  
  Platform · 5 pts · PRD:  
  _Acceptance:_ A push runs CI; staging deploys automatically; a thrown test error appears in the error tracker.
- **TV-002 · Database foundation: migrations, organisation key on every table, Row-Level Security helpers, isolation test harness**  
  Platform · 5 pts · PRD: ORG-8  
  _Acceptance:_ An automated test proves organisation A cannot read or write organisation B rows on every table; CI fails if a new table has no policy.
- **TV-003 · Signup and verification: create agency or individual-landlord organisation with owner, email/phone verification, password reset**  
  Organisation · 5 pts · PRD: ORG-1, ORG-2  
  _Acceptance:_ A new user can sign up, verify, reset a password and land in an empty organisation as Owner.
- **TV-004 · Roles, permissions and scoped access (property and portfolio level)**  
  Organisation · 5 pts · PRD: ORG-3, ORG-4  
  _Acceptance:_ A Caretaker assigned to one property cannot open another property's records, tested at API level.
- **TV-005 · Audit log service: append-only events with who, when, before and after**  
  Organisation · 3 pts · PRD: ORG-5  
  _Acceptance:_ Editing a record writes an audit event; audit rows cannot be edited or deleted through the API.
- **TV-006 · Session management: device list, remote sign-out, timeout**  
  Organisation · 3 pts · PRD: ORG-9  
  _Acceptance:_ A user can end another device's session and it is rejected on its next request.
- **TV-007 · Design system and web shell using the Tenaville palette**  
  Platform · 3 pts · PRD:  
  _Acceptance:_ Shared layout, navigation, form and table components render on desktop and mobile widths.
- **TV-143 · Staff invitations: invite by email and role, accept, revoke, resend**  
  Organisation · 5 pts · PRD: ORG-2  
  _Acceptance:_ An Owner or Admin invites an email address with a role; the invitee receives a link, accepts, and lands in that organisation with that role. Only an Owner can invite an Owner. A pending invitation can be revoked and resent. Every change is audited.

#### Sprint 2: Portfolio (31 points)

**Goal:** Agencies can model landlords, properties, units and mandates and bulk-load them.  
**Demo:** Import a spreadsheet of 50 units, see them linked to landlords with a mandate.

- **TV-008 · Landlord records with remittance details**  
  Portfolio · 3 pts · PRD: OWN-1  
  _Acceptance:_ A landlord can be created with contact details, preferred channel and bank details visible only to authorised roles.
- **TV-009 · Properties: create, edit, photos, notes, no public exposure**  
  Portfolio · 5 pts · PRD: PROP-1, PROP-9  
  _Acceptance:_ A property saves with photos; no unauthenticated URL or search index exposes it.
- **TV-010 · Units and statuses**  
  Portfolio · 3 pts · PRD: PROP-2, PROP-3  
  _Acceptance:_ Units can be added under a property with vacant, occupied, reserved, under maintenance and inactive statuses.
- **TV-011 · Link property to landlord**  
  Portfolio · 2 pts · PRD: PROP-5  
  _Acceptance:_ A property cannot be saved without one landlord; reassigning is audited.
- **TV-012 · Management mandate: commission type and rate, remittance schedule, permitted deductions**  
  Portfolio · 5 pts · PRD: OWN-2  
  _Acceptance:_ A mandate saves per landlord or property and is versioned so past statements keep their original terms.
- **TV-013 · Import framework with templates, validation and row-level errors; apply to properties and units**  
  Migration · 8 pts · PRD: PROP-4  
  _Acceptance:_ Uploading a file with 3 bad rows creates nothing until fixed and returns an error list naming each row and field.
- **TV-014 · Private file storage: signed URLs, image compression, authorisation at download**  
  Platform · 5 pts · PRD: DOC-7  
  _Acceptance:_ A file link expires, cannot be guessed, and fails for a user without access to the record.

#### Sprint 3: Tenancy (33 points)

**Goal:** Tenants, leases and charge schedules work end to end for the default direct-lease path.  
**Demo:** Create a tenant and an annual lease and see the generated charges.

- **TV-015 · Tenant records and contacts**  
  Tenancy · 3 pts · PRD: LEASE-1  
  _Acceptance:_ A tenant stores contacts and optional next-of-kin and employer details with change history.
- **TV-016 · Create lease directly: parties, unit, dates, rent, frequency, deposit and other upfront charges**  
  Tenancy · 5 pts · PRD: LEASE-2, LEASE-12  
  _Acceptance:_ A lease can be created from a tenant and unit without an application; the unit becomes occupied on activation.
- **TV-017 · Lease states and history preservation**  
  Tenancy · 3 pts · PRD: LEASE-3, LEASE-11  
  _Acceptance:_ State changes follow allowed transitions; editing a tenant never alters historical lease terms.
- **TV-018 · Charge and rent schedule generation (annual, half-yearly, quarterly, monthly, irregular)**  
  Money · 8 pts · PRD: RENT-1  
  _Acceptance:_ Activating a lease produces the correct dated charges, including a one-off irregular schedule, with totals matching lease terms.
- **TV-019 · Renewals that retain history**  
  Tenancy · 3 pts · PRD: LEASE-4  
  _Acceptance:_ A renewal creates a linked new lease and keeps the previous terms viewable.
- **TV-020 · Expiry alert engine (90, 60, 30 days, configurable)**  
  Tenancy · 3 pts · PRD: LEASE-6  
  _Acceptance:_ Leases entering each configured window create a task for the responsible agent once only.
- **TV-021 · Move-in and move-out records: handover notes, meter readings, balance**  
  Tenancy · 3 pts · PRD: LEASE-5  
  _Acceptance:_ Move-out records outstanding balance and prompts deposit handling before closing the lease.
- **TV-147 · Plan entitlements: definitions, limits and feature flags enforced in the API and UI**  
  Billing · 5 pts · PRD: BILL-3  
  _Acceptance:_ A request that would exceed a plan limit is refused by the API, not only hidden in the UI. Limits come from the plans table, not from code.

#### Sprint 4: Money I: payments and receipts (32 points)

**Goal:** Staff can record and allocate payments and issue correct, numbered receipts.  
**Demo:** Record a part payment, allocate it, issue a receipt, then reverse and correct it.

- **TV-022 · Record payments with method, reference, proof upload; label recorded vs partner-confirmed**  
  Money · 5 pts · PRD: RENT-2, RENT-12  
  _Acceptance:_ A payment saves with its method and proof and displays 'recorded by staff', never 'confirmed'.
- **TV-023 · Allocation engine: oldest-first, manual override, part payment, overpayment, tenant credit**  
  Money · 8 pts · PRD: RENT-3, RENT-14  
  _Acceptance:_ The sum of allocations always equals the payment; overpayment becomes credit; override requires permission and is audited.
- **TV-024 · Receipts: sequential numbering per organisation or branch, PDF, shareable link**  
  Money · 8 pts · PRD: RENT-13, DOC-3  
  _Acceptance:_ Two concurrent payments never receive the same number; a voided or reversed receipt keeps its number and is never reused; the issued numbers contain no gaps (PRD §16.2). Numbers come from the allocator in TV-144.
- **TV-025 · Reversals and corrections without overwriting history**  
  Money · 5 pts · PRD: RENT-4  
  _Acceptance:_ Reversing a payment creates a linked reversing entry with a reason; the original stays visible.
- **TV-026 · Daily cash-up per user and payment method**  
  Money · 3 pts · PRD: RENT-15  
  _Acceptance:_ A user's cash-up lists all payments recorded that day grouped by method and totals match the ledger.
- **TV-144 · Gapless receipt number allocator, shared by online and offline issue**  
  Money · 3 pts · PRD: RENT-13  
  _Acceptance:_ Numbers are allocated with no gaps under concurrency and under rollback: a failed payment transaction consumes no number. A Postgres sequence does not satisfy this, being non-transactional. Offline receipts numbered on sync draw from the same allocator. A test asserts the set of issued numbers is contiguous after a run including failures.

#### Sprint 5: Landlord ledger I (33 points)

**Goal:** Client money is separated from agency income and landlord balances are always correct.  
**Demo:** Collect rent for two landlords, see commission and net balance per landlord, record a remittance.

- **TV-027 · Landlord ledger core: append-only entries, client funds separated from agency funds**  
  Ledger · 8 pts · PRD: LEDGER-1, LEDGER-4  
  _Acceptance:_ Every receipt creates ledger entries on the correct side; a test proves client and agency balances never mix.
- **TV-028 · Commission calculation per mandate, recognised on cash received by default**  
  Ledger · 5 pts · PRD: LEDGER-9  
  _Acceptance:_ Commission matches the mandate on partial and full payments; reversing a payment reverses its commission.
- **TV-029 · Caution deposit lifecycle as client funds**  
  Tenancy · 5 pts · PRD: LEASE-13  
  _Acceptance:_ A deposit is held, deducted with evidence or refunded, each step producing a ledger entry.
- **TV-030 · Remittance recording with balance guard**  
  Ledger · 5 pts · PRD: LEDGER-1  
  _Acceptance:_ A remittance above the available balance is blocked unless an authorised role approves an advance, which is recorded as a debit.
- **TV-031 · Rent roll, upcoming dues and arrears ageing views**  
  Money · 5 pts · PRD: RENT-5  
  _Acceptance:_ Arrears buckets (1-30, 31-60, 61-90, 90+) reconcile to the sum of overdue charges.
- **TV-148 · Usage metering: active units, properties, users, storage and messages**  
  Billing · 5 pts · PRD: BILL-3  
  _Acceptance:_ Usage is counted at the end of the billing period with a 3-day grace, and warnings appear at 80% and 100% of a band.

#### Sprint 6: Landlord ledger II and migration (33 points)

**Goal:** Statements are trustworthy and agencies can move their existing records in.  
**Demo:** Issue a landlord statement carrying rent and a service charge, import tenants with opening balances, roll back a bad import.

- **TV-032 · Statements: draft, reviewed, issued; immutable; numbered revisions; PDF; access limited to staff and that landlord**  
  Ledger · 8 pts · PRD: LEDGER-2, LEDGER-5, LEDGER-8, DOC-3  
  _Acceptance:_ An issued statement cannot be edited; a correction produces Revision 2 linked to the original; another landlord cannot open it.
- **TV-033 · Evidence attachments on ledger entries**  
  Ledger · 3 pts · PRD: LEDGER-3  
  _Acceptance:_ Receipts, invoices and approvals attach to the entry they support and show on the statement.
- **TV-034 · Import tenants, leases and current charges**  
  Migration · 5 pts · PRD: MIG-1  
  _Acceptance:_ A valid file creates linked tenants, leases and charges; errors are reported per row.
- **TV-035 · Opening balances at a cutover date: tenant arrears and credits, landlord balances**  
  Migration · 5 pts · PRD: MIG-2, RENT-16  
  _Acceptance:_ Opening entries are labelled and locked after cutover confirmation; totals equal the agency's supplied figures.
- **TV-036 · Dry-run and rollback for import batches**  
  Migration · 5 pts · PRD: MIG-3  
  _Acceptance:_ A dry-run shows what would be created; rolling back a completed batch removes only that batch.
- **TV-150 · Receipt and statement footer: Tenaville line on Free, agency branding on paid**  
  Money · 2 pts · PRD: DOC-3  
  _Acceptance:_ A free-plan receipt carries the Tenaville line; a paid one carries the agency's own branding.
- **TV-154 · Non-rent lease charges: service charge, utilities and agreed fees, one-off or recurring**  
  Money · 5 pts · PRD: LEASE-2, RENT-1  
  _Acceptance:_ A charge agreed in the tenancy but not rent — service charge, utilities, an agreed fee — is raised against the lease either once or on its own frequency, ages into arrears, appears on the landlord statement and is allocated to like any other charge. Caution deposits stay in lease_deposits; repair recharges stay with TV-050.

#### Sprint 7: Communications and tasks (34 points)

**Goal:** Reminders, receipts and notices go out safely through WhatsApp, SMS or email.  
**Demo:** Send a rent reminder by WhatsApp with SMS fallback and see the delivery log.

- **TV-038 · Messaging provider abstraction and message log (WhatsApp, SMS, email)**  
  Communications · 8 pts · PRD: COMMS-2, COMMS-3  
  _Acceptance:_ Switching provider is configuration only; each message stores recipient, template, time, status and related record.
- **TV-039 · Configurable templates with merge fields**  
  Communications · 5 pts · PRD: COMMS-1  
  _Acceptance:_ Reminder, receipt, expiry and maintenance templates render the correct tenant, unit and amount values.
- **TV-040 · Consent, opt-outs, channel preferences and rate limits**  
  Communications · 5 pts · PRD: COMMS-6  
  _Acceptance:_ An opted-out contact receives no marketing message; operational messages follow channel preference.
- **TV-041 · WhatsApp template approval tracking and fallback channel**  
  Communications · 5 pts · PRD: COMMS-8  
  _Acceptance:_ A business-initiated message uses only an approved template; a failed WhatsApp send retries by SMS or email.
- **TV-042 · Tasks with owner, due date, priority, related record**  
  Communications · 3 pts · PRD: COMMS-4  
  _Acceptance:_ A task links to a lease, tenant or request and shows in the owner's daily list.
- **TV-043 · Reminder and follow-up rules for upcoming and overdue charges and expiries**  
  Money · 5 pts · PRD: RENT-6  
  _Acceptance:_ Configured reminders send once per rule, stop when paid, and log each send.
- **TV-149 · WhatsApp click-to-chat sharing for receipts and reminders**  
  Communications · 3 pts · PRD: COMMS-2  
  _Acceptance:_ A receipt or reminder opens in WhatsApp on the staff member's own phone with no automated send, so the free plan costs nothing to run.

#### Sprint 8: Maintenance I (32 points)

**Goal:** Repairs are logged, assigned, costed and charged to the right party.  
**Demo:** Log a repair with photos, assign a vendor, record cost, charge it to the landlord, see it on the statement.

- **TV-044 · Create maintenance requests with category, urgency, access notes, media**  
  Maintenance · 5 pts · PRD: MAINT-1, MAINT-2  
  _Acceptance:_ Staff or a tenant can raise a request with photos against a property or unit.
- **TV-045 · Core statuses and transitions**  
  Maintenance · 3 pts · PRD: MAINT-3  
  _Acceptance:_ Only allowed transitions are accepted; each is timestamped.
- **TV-046 · Assignment, priority, due date, responsible staff**  
  Maintenance · 3 pts · PRD: MAINT-4  
  _Acceptance:_ An unassigned request appears in the manager's queue; assignment notifies the assignee.
- **TV-047 · Timeline, comments and attachments**  
  Maintenance · 3 pts · PRD: MAINT-5  
  _Acceptance:_ All changes and messages appear in order on the request.
- **TV-048 · Vendor directory**  
  Maintenance · 3 pts · PRD: MAINT-6  
  _Acceptance:_ A vendor can be created with trade, areas and notes and selected for a job.
- **TV-049 · Actual cost, invoices, receipts, before/after photos, completion notes**  
  Maintenance · 5 pts · PRD: MAINT-10  
  _Acceptance:_ A job cannot be completed without a recorded cost or an explicit 'no cost' flag.
- **TV-050 · Allocate repair cost to landlord, tenant, agency or other payer with ledger link**  
  Maintenance · 5 pts · PRD: MAINT-11  
  _Acceptance:_ A landlord-borne cost appears as a deduction on the next statement; a tenant-borne cost creates a tenant charge.
- **TV-051 · Repair history persists against the unit after a tenancy ends**  
  Maintenance · 2 pts · PRD: MAINT-16  
  _Acceptance:_ A new tenant's unit view still shows earlier repairs.
- **TV-146 · Administrator-configured maintenance status transitions**  
  Maintenance · 3 pts · PRD: MAINT-3  
  _Acceptance:_ An administrator can change which status transitions are allowed, without code changes, and the change is audited. Resolve first whether this is MAINT-3's own clause (P0, here) or part of ORG-7's workflow templates (P1, TV-134) and record the decision.

#### Sprint 9: Documents and portals (33 points)

**Goal:** Landlords and tenants can see what they should, and tenants can report problems.  
**Demo:** A landlord opens a statement; a tenant sees dues and receipts and files a repair request; a trial reaches day 30 and falls to Free limits without losing data.

- **TV-052 · Document management: attach to records, types, issue and expiry dates, audit**  
  Documents · 5 pts · PRD: DOC-1, DOC-2  
  _Acceptance:_ A document attached to a lease shows uploader, type and dates and is hidden from unauthorised users.
- **TV-053 · Landlord portal (read-only): properties, occupancy, collections, balances, statements**  
  Portals · 8 pts · PRD: OWN-3  
  _Acceptance:_ A landlord sees only their own properties and issued statements; no edit actions are available.
- **TV-054 · Tenant access linked to organisation, tenant and active lease; responsive mobile web**  
  Portals · 5 pts · PRD: TENANT-1, TENANT-14  
  _Acceptance:_ A tenant signs in or uses a secure link and sees only their own lease data on a phone browser.
- **TV-055 · Tenant view: lease summary, dues, recorded payments, receipts, shared documents**  
  Portals · 5 pts · PRD: TENANT-2, TENANT-6  
  _Acceptance:_ Balances shown match the ledger; only documents explicitly shared appear.
- **TV-056 · Tenant repair request and status notifications**  
  Portals · 5 pts · PRD: TENANT-4, MAINT-12  
  _Acceptance:_ A tenant submits a request with photos and receives acknowledgement and completion notices.
- **TV-151 · Trial lifecycle: start, reminders at day 20, 27 and 30, expiry, 7-day grace**  
  Billing · 5 pts · PRD: BILL-1, BILL-3  
  _Acceptance:_ A new organisation starts a 30-day Growth trial without a card, is reminded three times, and falls to Free limits after a 7-day grace.

#### Sprint 10: Staff mobile app I (34 points)

**Goal:** Staff can do daily field work from a phone.  
**Demo:** On a real phone, record a payment, send a receipt and log a repair with photos; a downgraded organisation still prints and exports its locked records.

- **TV-057 · Mobile foundation: Expo app, login, navigation, PIN or biometric lock**  
  Mobile · 8 pts · PRD: MOB-1, MOB-6  
  _Acceptance:_ The app signs in, locks after inactivity and unlocks with PIN or biometrics.
- **TV-058 · Mobile: tenants, arrears, record payment and send receipt**  
  Mobile · 8 pts · PRD: MOB-1  
  _Acceptance:_ A payment recorded on the phone appears on the web app with a receipt sent to the tenant.
- **TV-059 · Mobile: maintenance logging with photos, tasks and follow-ups**  
  Mobile · 5 pts · PRD: MOB-1  
  _Acceptance:_ A repair logged on the phone shows photos and assignment on the web app.
- **TV-060 · Low-data operation: image compression, resumable uploads, pagination**  
  Mobile · 5 pts · PRD: MOB-7  
  _Acceptance:_ A 5 MB photo uploads under 500 KB and an interrupted upload resumes.
- **TV-061 · Push notifications for tasks, assignments and alerts**  
  Mobile · 3 pts · PRD: MOB-8  
  _Acceptance:_ An assigned task triggers a push notification that opens the task.
- **TV-152 · Downgrade to Free: choose the active property, read-only locking, restore on upgrade**  
  Billing · 5 pts · PRD: BILL-4  
  _Acceptance:_ Over-limit data stays visible, printable and exportable but accepts no new records. Upgrading restores it immediately. Nothing is deleted.

#### Sprint 11: Staff mobile app II: offline (29 points)

**Goal:** Field staff can work without a connection and nothing is lost or duplicated.  
**Demo:** Record payments in airplane mode, reconnect, see correct receipts and zero duplicates.

- **TV-062 · Local store and outbox with client-generated IDs**  
  Mobile · 8 pts · PRD: MOB-3  
  _Acceptance:_ Records created offline persist across app restarts and queue for sync.
- **TV-063 · Idempotent sync endpoints and conflict rules (server-authoritative for money)**  
  Mobile · 8 pts · PRD: MOB-3, MOB-5  
  _Acceptance:_ Replaying the same batch five times creates each payment once; last-writer-wins is never applied to financial records.
- **TV-064 · Provisional receipts and server-assigned official numbers on sync**  
  Mobile · 5 pts · PRD: MOB-4  
  _Acceptance:_ An offline receipt is marked 'pending sync' and receives its official number only on sync, with the tenant notified.
- **TV-065 · Sync status per record, visible retry, no silent discard**  
  Mobile · 3 pts · PRD: MOB-5  
  _Acceptance:_ Failed items show a reason and a retry; none disappear.
- **TV-066 · Encrypted local storage, remote revoke and local wipe**  
  Mobile · 5 pts · PRD: MOB-6  
  _Acceptance:_ Revoking a device from the web wipes cached data on its next connection.

#### Sprint 12: Billing, reports and hardening (31 points)

**Goal:** Agencies can pay for a plan in naira, see core reports, and the system is tested for security and load.  
**Demo:** Buy a plan through the gateway and get a VAT invoice, cross a unit band and see the overage priced, run the core reports, review the security checklist results.

- **TV-067 · Subscription checkout and invoices through a Nigerian payment gateway**  
  Billing · 5 pts · PRD: BILL-2  
  _Acceptance:_ A plan is bought in naira through the gateway with a VAT-bearing invoice and a receipt; a failed renewal retries and is reported, not silently lapsed.
- **TV-068 · Upgrade and downgrade prompts: band warnings and the plan-change flow**  
  Billing · 2 pts · PRD: BILL-3  
  _Acceptance:_ Approaching a limit shows what the next band costs before anything changes; a plan change states plainly what is gained or locked.
- **TV-069 · Core operational reports with CSV and PDF export**  
  Reporting · 5 pts · PRD: AN-1  
  _Acceptance:_ Rent roll, occupancy, expiries, arrears, collections and repairs reports reconcile to ledger totals.
- **TV-070 · Enforce access rules in reports, exports and dashboards**  
  Reporting · 3 pts · PRD: AN-13  
  _Acceptance:_ A scoped manager's exports contain only their permitted properties.
- **TV-071 · Security hardening: dependency scanning, rate limiting, backup and restore drill**  
  Platform · 5 pts · PRD:  
  _Acceptance:_ A restore from backup to a clean environment succeeds and is timed; critical dependency alerts are zero.
- **TV-072 · Performance and load testing, monitoring and alerts**  
  Platform · 3 pts · PRD:  
  _Acceptance:_ Core screens meet the load target in the PRD on a mid-range phone connection.
- **TV-153 · Hybrid billing: base plan, per-unit overage capped at the next tier, annual plans**  
  Billing · 8 pts · PRD: BILL-1, BILL-2  
  _Acceptance:_ A bill is the base price plus per-unit overage, never more than the next tier's price. Annual plans bill in advance at the plan's discount.

#### Sprint 13: R1 pilot and release readiness (32 points)

**Goal:** Three pilot agencies complete a real month-end on the product and R1 exit criteria are verified.  
**Demo:** Pilot agencies produce landlord statements and remit from the product, and export everything they have put in.

- **TV-037 · Full organisation data export**  
  Migration · 3 pts · PRD: MIG-5  
  _Acceptance:_ An administrator can export all organisation data in documented formats at any time, including after a subscription lapses.
- **TV-073 · Pilot onboarding runbook, sample templates and support routine**  
  Migration · 3 pts · PRD:  
  _Acceptance:_ A new pilot agency can be loaded using the runbook without developer help beyond import support.
- **TV-074 · Onboard three pilot agencies and import their data**  
  Pilot · 8 pts · PRD:  
  _Acceptance:_ Opening balances reconcile to each agency's own records at cutover.
- **TV-075 · Run pilot month-end: statements, remittances, feedback triage**  
  Pilot · 8 pts · PRD:  
  _Acceptance:_ Statements are accepted by pilot agencies and landlords without manual correction; feedback is triaged into the backlog.
- **TV-076 · App store and Play Store release preparation**  
  Mobile · 5 pts · PRD:  
  _Acceptance:_ Internal test builds distribute to pilot staff; store listings and privacy information are ready.
- **TV-077 · R1 exit-criteria verification and defect buffer**  
  Platform · 5 pts · PRD:  
  _Acceptance:_ Every exit criterion in PRD section 16.2 is checked and recorded; no critical isolation or security defects remain open.

### Release 2: workflow automation

#### Sprint 14: Payment automation I (31 points)

**Goal:** Rent can arrive through partner virtual accounts and links, safely and idempotently.  
**Demo:** Pay a test charge through a virtual account and see the payment recorded as partner-confirmed.

- **TV-078 · Payment partner selection, integration boundary and sandbox**  
  Payments · 5 pts · PRD: RENT-8  
  _Acceptance:_ A decision record names the partner and settlement flow; a provider-neutral interface passes sandbox tests.
- **TV-079 · Virtual accounts per unit or tenant**  
  Payments · 8 pts · PRD: RENT-8  
  _Acceptance:_ Each active lease can receive a virtual account number that maps unambiguously to that lease.
- **TV-080 · Signed, idempotent, replay-protected webhooks**  
  Payments · 8 pts · PRD: RENT-8  
  _Acceptance:_ A duplicate or replayed webhook creates no second payment; an invalid signature is rejected and logged.
- **TV-081 · Settlement-account model in ledger and statements**  
  Ledger · 5 pts · PRD: LEDGER-11  
  _Acceptance:_ Settlement into agency client account, landlord account or split is configurable and reflected in the ledger.
- **TV-082 · Payment links per charge**  
  Payments · 5 pts · PRD: RENT-8  
  _Acceptance:_ A tenant can pay a charge through a link and the payment is allocated automatically.

#### Sprint 15: Payment automation II (32 points)

**Goal:** Incoming money is matched, reconciled and remitted with less manual work.  
**Demo:** Review the unmatched queue, run a remittance batch, export to accounting.

- **TV-083 · Auto-matching and review queue for unmatched payments**  
  Payments · 8 pts · PRD: RENT-9  
  _Acceptance:_ A payment with a known reference matches automatically; the rest appear in a queue with suggested matches.
- **TV-084 · Tenant view of partner-confirmed payments and payment instructions**  
  Portals · 5 pts · PRD: TENANT-3  
  _Acceptance:_ Tenants see confirmed versus recorded payments clearly labelled, plus their account details.
- **TV-085 · Scheduled remittance runs with approval and reconciliation**  
  Ledger · 8 pts · PRD: RENT-10, LEDGER-6  
  _Acceptance:_ A run lists landlords due, requires approval, and each remittance reconciles to a bank reference.
- **TV-086 · Branded PDF statements**  
  Ledger · 3 pts · PRD: LEDGER-7  
  _Acceptance:_ A statement can use agency branding and downloads as PDF.
- **TV-087 · Exports for external accounting tools**  
  Reporting · 5 pts · PRD: RENT-11  
  _Acceptance:_ An export file imports cleanly into a reference accounting tool with a documented mapping.
- **TV-088 · Late fee rules where policy and law permit**  
  Money · 3 pts · PRD: RENT-7  
  _Acceptance:_ Late fees apply only when enabled, follow the configured rule and are visible to the tenant.

#### Sprint 16: CRM (29 points)

**Goal:** Leads are captured, tracked and followed up consistently.  
**Demo:** Capture a WhatsApp lead, assign it, follow it to a viewing.

- **TV-089 · Lead capture (manual and agency channels) with contact data**  
  CRM · 5 pts · PRD: CRM-1, CRM-2  
  _Acceptance:_ A lead can be created from a call, WhatsApp or private enquiry form with consent notice.
- **TV-090 · Pipeline stages, assignment, source and next action**  
  CRM · 5 pts · PRD: CRM-3, CRM-4  
  _Acceptance:_ Each lead has an owner, stage, source and a next action with a due date.
- **TV-091 · Chronological activity timeline**  
  CRM · 3 pts · PRD: CRM-5  
  _Acceptance:_ Calls, messages, tasks and notes appear in order on the lead.
- **TV-092 · Follow-up reminders and daily queue**  
  CRM · 3 pts · PRD: CRM-6  
  _Acceptance:_ An agent sees today's and overdue follow-ups; overdue items alert the manager.
- **TV-093 · Duplicate detection and merge preserving history**  
  CRM · 5 pts · PRD: CRM-7  
  _Acceptance:_ Likely duplicates are flagged; merging keeps all activity.
- **TV-094 · Lost reasons, nurture dates, reactivation**  
  CRM · 3 pts · PRD: CRM-8  
  _Acceptance:_ A lost lead can be reactivated without creating a new record.
- **TV-095 · CRM messaging templates and marketing consent**  
  CRM · 5 pts · PRD: CRM-11, CRM-12  
  _Acceptance:_ Marketing messages are blocked without consent; tenancy messages stay separate.

#### Sprint 17: Appointments and leasing flow (32 points)

**Goal:** Viewings and meetings are scheduled, followed up and convert to leases.  
**Demo:** Book a viewing, record the outcome, generate a follow-up task, send a unit sheet.

- **TV-096 · Appointments: types, links, scheduling, conflict flagging, reschedule**  
  Appointments · 8 pts · PRD: APPT-1, APPT-2, APPT-3, APPT-4  
  _Acceptance:_ Double-booking a staff member is flagged; an appointment links to a lead, tenant or property.
- **TV-097 · Confirmations and reminders with delivery status**  
  Appointments · 3 pts · PRD: APPT-5  
  _Acceptance:_ Attendees receive configured reminders and the delivery status is stored.
- **TV-098 · Outcomes, automatic follow-up tasks and viewing feedback**  
  Appointments · 5 pts · PRD: APPT-6, APPT-7, APPT-8  
  _Acceptance:_ Recording 'interested' creates a follow-up task with owner and due date.
- **TV-099 · Calendar and list views with filters**  
  Appointments · 5 pts · PRD: APPT-9  
  _Acceptance:_ Staff can filter the agenda by team, type and status.
- **TV-100 · Shareable unit sheets (private, expiring, non-indexed)**  
  Portfolio · 3 pts · PRD: PROP-10  
  _Acceptance:_ A unit sheet link expires, is excluded from search engines and shows only chosen fields.
- **TV-101 · Vacancy history**  
  Portfolio · 3 pts · PRD: PROP-7  
  _Acceptance:_ Each vacancy records dates, reason and next action; reports show vacancy duration.
- **TV-102 · Lead to application to lease conversion without re-entry**  
  Tenancy · 5 pts · PRD: CRM-9, LEASE-10  
  _Acceptance:_ Converting an approved lead creates the tenant and lease with prefilled data.

#### Sprint 18: Configurable screening I (29 points)

**Goal:** Agencies can run consistent, consented screening with a secure applicant flow.  
**Demo:** An applicant applies, uploads evidence and a reviewer requests more information.

- **TV-103 · Screening templates and configurable steps with evidence types and deadlines**  
  Screening · 8 pts · PRD: SCREEN-1, SCREEN-2, SCREEN-3  
  _Acceptance:_ A template with required and optional steps can be applied to a property and overridden by a landlord.
- **TV-104 · Applicant form and secure document upload**  
  Screening · 5 pts · PRD: SCREEN-5  
  _Acceptance:_ An applicant completes the form and uploads evidence through the portal.
- **TV-105 · Status workflow, reviewer assignment, request for more information**  
  Screening · 5 pts · PRD: SCREEN-4, SCREEN-9  
  _Acceptance:_ Reviewers move an application through statuses and the applicant is notified of required actions.
- **TV-106 · Consent capture with purpose, timestamp and privacy notice version**  
  Screening · 3 pts · PRD: SCREEN-6  
  _Acceptance:_ No application data is processed without a recorded consent for each purpose.
- **TV-107 · Review audit trail and restricted access**  
  Screening · 5 pts · PRD: SCREEN-7, SCREEN-8  
  _Acceptance:_ Only authorised roles see screening data; every review action is logged.
- **TV-108 · Sensitive identifier handling: masking and verification results only**  
  Screening · 3 pts · PRD: SCREEN-15  
  _Acceptance:_ National or financial identifiers are masked by default and not stored where a pass or fail result suffices.

#### Sprint 19: Screening II and lease rules (34 points)

**Goal:** Screening gates leasing safely and lease documents can be generated.  
**Demo:** Block a lease on incomplete screening, generate a renewal notice.

- **TV-109 · Block lease activation while required steps are incomplete, with authorised override**  
  Screening · 3 pts · PRD: SCREEN-10  
  _Acceptance:_ An incomplete application cannot activate a lease without a recorded override and reason.
- **TV-110 · Retention and anonymisation for rejected or withdrawn applications**  
  Screening · 5 pts · PRD: SCREEN-11  
  _Acceptance:_ Data is anonymised or deleted after the configured period and the action is logged.
- **TV-111 · Fairness controls: prohibited criteria guard and criteria versioning**  
  Screening · 3 pts · PRD: SCREEN-14, SCREEN-16  
  _Acceptance:_ Templates cannot use prohibited characteristics; each decision records the criteria version.
- **TV-112 · Screening reports**  
  Screening · 3 pts · PRD: SCREEN-12  
  _Acceptance:_ Reports show volumes and completion times without exposing unnecessary personal data.
- **TV-113 · Co-tenants and guarantors**  
  Tenancy · 5 pts · PRD: LEASE-9  
  _Acceptance:_ A lease can have several tenants and guarantors, each with their own contacts.
- **TV-114 · Rent review and escalation rules with approval**  
  Tenancy · 5 pts · PRD: LEASE-7  
  _Acceptance:_ A configured increase proposes new terms that need approval before applying.
- **TV-115 · Notices and letters from agency templates**  
  Tenancy · 5 pts · PRD: LEASE-14  
  _Acceptance:_ A formal reminder or expiry notice generates from a template and is stored on the lease.
- **TV-116 · Configurable tax lines (VAT on commission, withholding on rent), off by default**  
  Ledger · 5 pts · PRD: LEDGER-10  
  _Acceptance:_ Enabling a tax line changes statements and reports as configured and is audited; default behaviour is unchanged.

#### Sprint 20: Maintenance expansion (33 points)

**Goal:** Higher-value repairs get quotes, approvals and work orders.  
**Demo:** Compare two quotes, get landlord approval in the portal, issue a work order, tenant confirms.

- **TV-117 · Vendor quotations and comparison**  
  Maintenance · 5 pts · PRD: MAINT-7  
  _Acceptance:_ Two or more quotes can be attached to a request and compared side by side.
- **TV-118 · Approval thresholds and landlord approvals with comments in the portal**  
  Maintenance · 8 pts · PRD: MAINT-8, OWN-4, OWN-5  
  _Acceptance:_ A job above the threshold cannot proceed until the landlord approves, and the history is kept.
- **TV-119 · Work orders**  
  Maintenance · 5 pts · PRD: MAINT-9  
  _Acceptance:_ A work order records scope, vendor, target date and agreed cost.
- **TV-120 · Tenant confirm or reopen, and repair tracking for tenants**  
  Maintenance · 5 pts · PRD: MAINT-13, TENANT-5  
  _Acceptance:_ A tenant can confirm resolution or reopen with a reason; they see status and next step.
- **TV-121 · Preventive maintenance schedules**  
  Maintenance · 3 pts · PRD: MAINT-14  
  _Acceptance:_ A recurring schedule generates requests on time.
- **TV-122 · Emergency escalation rules and action log**  
  Maintenance · 5 pts · PRD: MAINT-17  
  _Acceptance:_ An emergency request notifies named contacts and records every action taken.
- **TV-145 · Conditional maintenance statuses for quote and approval workflows**  
  Maintenance · 2 pts · PRD: MAINT-3  
  _Acceptance:_ With quotation and approval workflows enabled, Triage, Awaiting Quote, Awaiting Landlord Approval and Approved become available and appear in the allowed transitions. With those workflows off, only the eight core statuses are offered.

#### Sprint 21: Inspections, documents and portal extras (32 points)

**Goal:** Mobile inspections, document controls and fuller portals.  
**Demo:** Complete an inspection on a phone offline, see expiring documents flagged.

- **TV-123 · Inspection checklists on mobile with photos, notes, meter readings, acknowledgement**  
  Mobile · 8 pts · PRD: MOB-2, DOC-4  
  _Acceptance:_ An inspection completed offline syncs with photos and a signature or acknowledgement.
- **TV-124 · Document expiry alerts, malware scanning and time-limited links**  
  Documents · 5 pts · PRD: DOC-5, DOC-6  
  _Acceptance:_ An expiring document alerts staff; an infected test file is rejected.
- **TV-125 · Custom fields and property documents**  
  Portfolio · 3 pts · PRD: PROP-6, PROP-8  
  _Acceptance:_ Admins can add fields per property or unit and attach operating documents.
- **TV-126 · Tenant portal extras: contact updates, secure request channel, renewal prompts, accessibility**  
  Portals · 8 pts · PRD: TENANT-7, TENANT-8, TENANT-9, TENANT-15  
  _Acceptance:_ A tenant can state renewal intent without auto-renewing; screens meet the accessibility and low-data targets.
- **TV-127 · Landlord portfolio indicators**  
  Portals · 3 pts · PRD: OWN-6  
  _Acceptance:_ A landlord sees agreed indicators for occupancy, arrears and costs.
- **TV-128 · Branches, teams and branch-level reporting**  
  Organisation · 5 pts · PRD: ORG-6  
  _Acceptance:_ Reports and access can be limited to a branch.

#### Sprint 22: Analytics and organisation settings (31 points)

**Goal:** Owners see portfolio performance and administrators can configure workflows.  
**Demo:** Open the owner dashboard, change an approval limit, export a report.

- **TV-129 · Analytics foundation: filters, documented metric definitions, configurable occupancy denominator**  
  Analytics · 5 pts · PRD: AN-2, AN-3, AN-10  
  _Acceptance:_ Every metric shows its formula and time window; occupancy excludes configured unit statuses.
- **TV-130 · Collections and landlord dashboards**  
  Analytics · 5 pts · PRD: AN-4, AN-7  
  _Acceptance:_ Billed versus collected, arrears ageing and landlord net remittance reconcile to the ledger.
- **TV-131 · Lease, vacancy and maintenance dashboards**  
  Analytics · 5 pts · PRD: AN-5, AN-6, MAINT-15  
  _Acceptance:_ Expiry pipeline, vacancy duration, response and resolution times and repeat issues are shown.
- **TV-132 · CRM funnel analytics**  
  Analytics · 5 pts · PRD: AN-8, CRM-10  
  _Acceptance:_ Response time, appointment attendance and conversion are reported.
- **TV-133 · Export reports to CSV, XLSX and PDF**  
  Analytics · 3 pts · PRD: AN-9  
  _Acceptance:_ Exports respect scope and match on-screen totals.
- **TV-134 · Organisation settings: approval limits, workflow templates, notification preferences**  
  Organisation · 5 pts · PRD: ORG-7  
  _Acceptance:_ Admins can change limits and templates without code changes; changes are audited.
- **TV-135 · Optional two-factor authentication**  
  Organisation · 3 pts · PRD: ORG-10  
  _Acceptance:_ Users can enable 2FA and admins can require it for specific roles.

#### Sprint 23: Automation, onboarding and R2 release (31 points)

**Goal:** Remaining workflow automation, release policies and the R2 pilot.  
**Demo:** R2 pilot agencies use payments, CRM and maintenance workflows live.

- **TV-136 · Recurring tasks and event-driven task creation**  
  Communications · 5 pts · PRD: COMMS-5  
  _Acceptance:_ A configured event creates tasks automatically without duplicates.
- **TV-137 · Inbox for messages needing a human reply**  
  Communications · 5 pts · PRD: COMMS-7  
  _Acceptance:_ Inbound replies appear in a work queue linked to the contact, within provider limits.
- **TV-138 · Onboarding checklist and assisted import tooling**  
  Migration · 3 pts · PRD: MIG-4  
  _Acceptance:_ A new organisation sees a checklist and can use sample templates for each import.
- **TV-139 · Supported OS versions and forced-update policy**  
  Mobile · 3 pts · PRD: MOB-9  
  _Acceptance:_ An outdated app version with a breaking API change is prompted to update.
- **TV-140 · Validate optional transaction-fee model before building**  
  Billing · 2 pts · PRD: BILL-5  
  _Acceptance:_ A written decision confirms legal, pricing and tenant-impact review before any fee is implemented.
- **TV-141 · R2 security review, performance test and regression pack**  
  Platform · 5 pts · PRD:  
  _Acceptance:_ No critical findings open; regression suite covers R1 and R2 money, ledger and isolation paths.
- **TV-142 · R2 pilot rollout and exit-criteria verification**  
  Pilot · 8 pts · PRD:  
  _Acceptance:_ Pilot agencies run payments, CRM and maintenance in production and R2 exit criteria are recorded as met.

## 7. Risks to the plan and cut order

- **Velocity is unproven.** Re-plan after Sprint 3. If actual velocity is under 24 points, expect R1 alone to take about 16 sprints.
- **Money, ledger and sync are the riskiest work** (Sprints 4 to 6 and 11, and Sprints 14 and 15 in R2). Do not compress them. Slip other work first.
- **Mobile offline sync (Sprint 11)** is the hardest single piece. Prototype the outbox and idempotent endpoints early, during Sprint 7 or 8 if there is slack.
- **Provider dependencies** (WhatsApp approval, payment partner onboarding, app store review) have lead times you do not control. Start those applications weeks before the sprint that needs them.
- **If time runs short, defer in this order:** tenant-portal extras, inspections, maintenance expansion, analytics beyond the core reports, CRM and appointments, screening, and last of all payment automation. Protect migration, ledger and mobile payment flows.

## 8. Not in this backlog (R3)

Rent-financing partner integration (FIN-1 to FIN-10, TENANT-10 to TENANT-13), tenancy agreement templates with e-signature (LEASE-8), external calendar integration (APPT-10), identity-provider integrations (SCREEN-13), saved dashboards and benchmarks (AN-11, AN-12). Plan these after R2 using real usage data.
