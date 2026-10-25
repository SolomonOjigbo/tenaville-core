# Data model

From PRD §14. Every entity here is organisation-scoped unless explicitly noted, carries `organisation_id`, and has RLS enabled with a policy — see [multi-tenancy and RLS](../architecture/multi-tenancy-and-rls.md).

This is the entity inventory and the invariants that constrain the schema. Concrete DDL lives in `supabase/migrations/`.

## Conventions

- `snake_case`, plural table names. `organisation_id uuid not null` on every scoped table.
- `id uuid primary key default gen_random_uuid()`.
- `created_at timestamptz not null default now()`, `updated_at timestamptz`, both UTC (§10.6).
- Monetary columns are `bigint` holding kobo, suffixed `_kobo` so the unit is unmissable (§10.1).
- Contractual dates are `date`, not `timestamptz` — a rent due date must not move with a timezone.
- Enumerations that agencies configure are reference tables; enumerations the domain owns are Postgres enums.

## Organisation and access

`Organisation` · `User` · `Role` · `Permission` · `Assignment` · `Branch` · `DeviceSession` · `AuditEvent` · `Subscription` · `Plan`

`Organisation` is the tenant root; `Organisation.type` is agency or individual landlord (ORG-1). `Assignment` carries property- and portfolio-scoped access, which is why organisation membership alone is not authority (ORG-4). `Branch` exists from R1 so policies and keys are shaped for a second scoping dimension below organisation, though branch _features_ are R2 (ORG-6).

Implemented as `Membership` rather than a `User`-to-`Organisation` column: one Supabase Auth identity per person, with a role per organisation, so a landlord managed by two agencies needs one account rather than two. See [ADR 0008](../decisions/0008-identity-and-membership-model.md).

**`Permission` is code, not a table.** The role-to-permission catalogue lives in `packages/core/src/modules/org/domain/roles.ts`, where it is typed, diff-reviewable and testable without a database. Agency-configurable approval limits (ORG-7, R2) are genuinely data and will arrive as a table that narrows those permissions, never widens them. This is a deliberate deviation from PRD §14's `Permission` entity, recorded in ADR 0008.

`AuditEvent` records actor, time, action, before/after values and the reason for sensitive overrides (ORG-5, §10.7). It is append-only.

`Subscription`/`Plan` price by units under management (BILL-1). Non-payment never deletes customer data (BILL-4).

## Property management

`Landlord` · `ManagementMandate` · `Property` · `Unit` · `UnitShareLink` · `PropertyDocument` · `Inspection` · `InspectionItem`

A `Landlord` owns one or more `Property` records under a `ManagementMandate` that defines commission type and rate, remittance schedule and permitted deductions — the ledger reads these terms rather than hard-coding them (OWN-2, LEDGER-9).

**Remittance details are a separate table**, `landlord_remittance_details`, not columns on `landlords`. OWN-1 requires restricted access, and the restriction is by _application_ role while Postgres column grants are by _database_ role — every user connects as `authenticated`, so a column grant cannot tell an accountant from a letting agent. A separate table gets its own policy, which can. Every change is audited with the account number masked to its last four digits: the trail answers who changed it and when without becoming a second copy of the sensitive value.

Commission rates are stored as **basis points** (`commission_rate_bps`, 1000 = 10.00%), an integer for the same reason amounts are integer kobo — this number divides a landlord's rent. A mandate must permit the `commission` deduction, or the agency's own fee would be unremittable; the database enforces that.

`nigerian_states` is reference data in the migration rather than the seed, because `properties.state_code` is a foreign key to it and production needs the rows. LGA is free text for now: there are 774 and we have no authoritative machine-readable list, so storing an unverified one would be worse than storing the agency's own wording.

A `Property` contains one or more `Unit`. R1 links a property to one landlord; ownership shares and multiple landlords are later (PROP-5).

`UnitShareLink` backs agency-controlled unit sheets: unguessable token, expiry, revocation, selected fields only, `noindex` (PROP-10, [ADR 0007](../decisions/0007-no-public-marketplace-surface.md)).

## Tenancy

`Tenant` · `TenantContact` · `Lease` · `LeaseParty` · `Charge` · `RentSchedule` · `DepositRecord` · `Renewal` · `Notice` · `DocumentTemplate` · `ImportBatch`

A `Lease` joins one or more tenants (`LeaseParty`, supporting co-tenants and guarantors — LEASE-9) to a `Unit` and generates `Charge` rows from its `RentSchedule` (RENT-1).

**Two active leases cannot overlap on one unit.** A Postgres exclusion constraint over `(unit_id, daterange(starts_on, ends_on))` where the status is active makes double-letting impossible rather than unlikely — and catches the overlap that a date comparison in application code would miss under concurrency.

**`RentSchedule` is computed, not stored.** `generateRentPeriods` in `leases/domain/schedule.ts` derives the periods and due dates from the lease terms; step 4 turns them into `Charge` rows. Persisting the schedule as well would create two sources of truth for what a tenant owes. Period starts are computed from the original start date rather than from the previous period, so a tenancy beginning on 31 January runs 31 Jan, 28 Feb, 31 Mar — computing each from the last would clamp to the 28th and quietly move the rent day for the rest of the term.

**`expiring_soon` is derived, not stored.** LEASE-3 lists it among the lease states, and `lease_overview` computes it from the end date and the organisation's own `lease_expiry_alert_days`. A stored state would need a scheduled job and would be wrong between the threshold being crossed and the next run — and "wrong" here means a renewal conversation that did not happen, which is the failure LEASE-6 and AN-5 exist to prevent. The view is `security_invoker`, so the underlying policies apply to the caller; a pgTAP assertion requires that of every view, since a view without it is a hole straight through RLS.

`units.contracted_rent_kobo` was **removed** in the tenancy migration. Once a lease carries the rent the lease is authoritative, and a second stored copy can drift — which is how a tenant is billed the wrong amount. `asking_rent_kobo` remains: it is the advertised figure for a vacant unit and has no other source.

Lease history survives updates and termination (LEASE-11): a terminated lease and its charges remain readable, and a renewal is a new record retaining the historical terms (LEASE-4).

`lease_deposits` tracks the caution deposit as client funds through `expected` → `held` → deduction → `refunded`, `forfeited` or `transferred` (LEASE-13). `custodian` records whether the agency or the landlord holds it: PRD open decision 15 is unresolved, so both answers are representable as data and resolving it is a configuration change rather than a migration. How a deposit appears on a statement remains a step 6 question.

`deposit_deductions` is **append-only**: the amount and reason cannot be rewritten and a row cannot be deleted, so a correction is a linked reversal and the history of a dispute survives it (PRD §10.2). A deduction starts unapproved, because it takes a tenant's money; the database refuses an approval that would push the approved total past the deposit held, and a reversed deduction stops counting against it. The tenant can read every deduction and reversal against their own deposit — a deposit dispute the tenant cannot inspect is the dispute this lifecycle exists to prevent.

`ImportBatch` and `ImportRow` make a migration reversible — a completed import can be rolled back as a unit (MIG-3). Each row stores the parsed payload, its validation issues as `{field, code, message}` entries, and the id of what it created, which is what rollback will read. A batch moves draft → validated → applied, and `apply_property_import` refuses anything that is not validated, still has invalid rows, or has already been applied, so a retried request cannot duplicate a portfolio.

## Financial records

`Payment` · `PaymentAllocation` · `Receipt` · `ReceiptSequence` · `LandlordLedgerEntry` · `Remittance` · `StatementRevision` · `OpeningBalance` · `SettlementAccount` · `TaxRule` · `ReconciliationItem` · `ProviderPaymentEvent`

**The append-only core.** `Payment`, `PaymentAllocation` and `LandlordLedgerEntry` admit no amount-changing `UPDATE` and no `DELETE`. Corrections are linked reversal or adjustment rows ([ADR 0004](../decisions/0004-append-only-financial-history.md)).

A `Charge`'s paid balance derives from its allocations; allocations for a payment sum to the payment amount (§10.4).

`ReceiptSequence` issues sequential numbers per organisation, per branch where configured. Voided receipts keep their number; numbers are never reused (RENT-13). The format (prefix, branch, year) is configuration; the sequence guarantee is not.

`Payment` records whether the payment was manually recorded or partner-confirmed, and the two are labelled differently wherever they appear (RENT-12).

`StatementRevision` carries the draft → reviewed → issued lifecycle. Issued is immutable; a correction is a numbered revision referencing the original (LEDGER-8).

`OpeningBalance` rows are labelled as opening entries and frozen once the cutover is confirmed (MIG-2, RENT-16).

`SettlementAccount` records where partner virtual-account money settles — agency client account, landlord account, or split (LEDGER-11). `TaxRule` is off by default pending adviser validation (LEDGER-10).

`ProviderPaymentEvent` stores the raw provider event with its event ID as the idempotency key before any reconciliation; `ReconciliationItem` holds ambiguous matches for the review queue (RENT-8, RENT-9).

Client funds and agency income are distinguishable in the schema, not only in report filters (LEDGER-4).

## Maintenance

`MaintenanceRequest` · `WorkOrder` · `Vendor` · `VendorQuote` · `WorkOrderAssignment` · `MaintenanceApproval` · `MaintenanceCost` · `MaintenanceAttachment`

A `MaintenanceRequest` may generate one or more `WorkOrder` and `MaintenanceCost` records. Repair history is preserved against the property and unit after a tenancy ends (MAINT-16).

The R1 status set is deliberately small; quote and landlord-approval statuses activate with the R2 workflows, and administrators may configure allowed transitions (MAINT-3).

`MaintenanceCost` allocates to landlord, tenant, agency, service charge or another configured payer, with reason and approval (MAINT-11) — which is how costs reach the landlord ledger.

`MaintenanceApproval` enforces thresholds by landlord, property, cost or category. Work above the threshold cannot be marked authorised without a recorded approval, except under a configured emergency protocol (MAINT-8).

## CRM and appointments

`Lead` · `LeadActivity` · `PipelineStage` · `FollowUpTask` · `Appointment` · `AppointmentAttendee` · `AppointmentOutcome`

`PipelineStage` is configurable per organisation with PRD defaults (CRM-3). `LeadActivity` is a chronological timeline that survives a duplicate merge (CRM-7) and a reactivation (CRM-8).

`AppointmentOutcome` drives automatic `FollowUpTask` creation with an owner and due date (APPT-7).

Marketing consent is tracked separately from operational tenancy messaging (CRM-12).

## Screening

`ScreeningTemplate` · `ScreeningStepDefinition` · `ScreeningApplication` · `ScreeningStepInstance` · `ScreeningEvidence` · `ScreeningReview` · `ScreeningDecision` · `ConsentRecord`

Templates are **versioned**, and an application retains the template version and criteria applied to it, so a decision can be reviewed for fairness later (SCREEN-16).

`ConsentRecord` captures applicant consent, purpose, timestamp, privacy-notice version and any third-party checks requested (SCREEN-6).

Sensitive identifiers (NIN, BVN) are collected only where lawful and necessary, masked by default, with audited access — and a provider pass/fail result is preferred over storing the identifier at all (SCREEN-15). Retention and anonymisation rules for rejected or withdrawn applications are configurable (SCREEN-11).

Screening data is reachable only by explicitly authorised roles, not by general staff (SCREEN-8).

## Tenant self-service and communication

`PortalAccount` · `TenantRequest` · `Message` · `NotificationPreference` · `MessageDelivery`

`PortalAccount` links a portal user to one tenant record and lease. Whether this is a Supabase Auth user with narrow policies or a separate linkage is open — see [ADR 0002](../decisions/0002-supabase-postgres-rls.md).

`Message` and `MessageDelivery` hold recipient, template, send time, delivery status where the provider reports it, and the related record (COMMS-3). WhatsApp template approval status is tracked so a send against an unapproved template fails fast (COMMS-8).

## Financing (R3)

`FinancingProvider` · `FinancingReferral` · `FinancingConsent` · `FinancingApplicationReference` · `FinancingStatusEvent` · `FinancingDisbursementConfirmation`

Financing status is stored **separately** from rent payment status. Only a `FinancingDisbursementConfirmation` that has been confirmed and reconciled may affect a charge (FIN-8, FIN-9, §10.12).

Access to financing data is segregated from ordinary property-management permissions (FIN-6).

## Analytics

Report definitions and optional pre-aggregated snapshots. Source-of-truth values stay in operational records (PRD §14). Analytics applies the same organisation and property scoping as the application, including background report generation (AN-13).

## Key relationships

- A landlord owns one or more properties under a management mandate.
- A property contains one or more units.
- A lease joins one or more tenants to a unit and generates charges.
- Payments are allocated to charges; allocations and approved deductions feed the landlord ledger.
- A maintenance request may generate one or more work orders and cost records.
- A lead may have activities and appointments, then become a screening application and, after approval, a tenant and lease.
- A screening application uses a versioned template and retains the applied requirements and decisions.
- A financing referral belongs to a tenant or application and a provider; only a confirmed and reconciled payment event can affect rent payment status.
