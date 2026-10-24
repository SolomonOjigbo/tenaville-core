# Tenaville: Property Management Platform

**Product Requirements Document (PRD)**  
**Working name:** Tenaville (previously Keyholder; subject to trademark, domain and CAC name checks)  
**Version:** 3.0 — Reviewed and revised (supersedes v2.0)  
**Status:** Draft for product, engineering and legal review  
**Market:** Nigeria  
**Product type:** Standalone, multi-tenant property-management SaaS  
**Platforms:** Native staff mobile app (iOS and Android) for field and daily work, plus a responsive web application for staff, landlords and tenants

---

## 0. Document control and revision summary

| Version | Summary |
|---|---|
| 1.0 | First draft: record-only rent tracking, landlord ledger, maintenance, web and native mobile |
| 2.0 | Revised direction: management-first (no marketplace), CRM, appointments, configurable screening, tenant portal, partner-enabled financing, analytics |
| 3.0 | Review pass: consistency fixes, missing requirements added, scope sequencing tightened, product renamed (see Appendix A) |

### What changed in v3

**Inconsistencies fixed**

1. **Financing priority.** v2 placed the rent-financing journey in R3 in the release table but tagged the FIN and TENANT-10 to 13 requirements P1. They are now P2 (R3) so requirements match the release plan.
2. **Lease creation dependency.** v2 made lease creation from an approved application P0, but applications and screening are P1. A direct lease path is now the P0 default (LEASE-12), and creation from an application is P1.
3. **Maintenance statuses.** v2 listed quote and landlord-approval statuses as P0 while quotes and approvals are P1. The P0 status set is now smaller, and the extra statuses switch on when those workflows are enabled.
4. **Platform scope.** v2 said "mobile application" in the header but "native app may be introduced" for tenants. The native app is now explicitly for staff, and landlords and tenants use responsive web in R1.
5. **Mobile requirements.** v2 had no dedicated mobile section. Section 8.18 now defines the staff app, including offline rules for financial records.

**Requirements added**

- Migration and onboarding (section 8.17): importing tenants, leases, balances and opening ledger balances, which v2 left out.
- Deposit lifecycle, receipt numbering, statement approval and immutability, tax lines, settlement-account model, notices and letters.
- Handling of sensitive identifiers (for example NIN and BVN) in screening.
- WhatsApp business-messaging constraints.
- Agency-controlled shareable unit sheets, so agents can send unit details to prospects without a marketplace.
- Targets framework for success metrics.
- A capacity warning and a cut order if delivery capacity is limited (section 16.1).

---

## 1. Executive summary

Tenaville is a property-management platform for Nigerian real estate agencies, property managers and individual landlords. It centralises property and unit records, landlord mandates, tenancy and lease administration, rent tracking, arrears, maintenance and repairs, tenant communications, appointments, CRM follow-ups, configurable tenant screening, landlord reporting and tenant self-service.

Tenaville is **not a public property marketplace**. It will not operate a public property-search portal, publish marketplace listings, sell property leads or facilitate property sales. Its focus is the operational lifecycle of managed properties and tenancies.

The product should help an agency move from first contact with a prospective tenant through qualification, appointment scheduling, configurable screening and lease creation, then manage the tenancy through rent collection, maintenance, renewals and eventual move-out. CRM and appointment features support an agency’s own internal pipeline; they are not a public property-discovery marketplace.

The tenant self-service portal will provide tenancy and payment information, maintenance requests and status tracking, documents, communications and, subject to a suitable regulated partner and legal review, access to third-party rent-financing options. Tenaville will not lend money, underwrite loans or hold customer funds itself.

The product will launch with dependable property, tenancy, financial-record and maintenance workflows, then expand into automation, configurable CRM and screening, portfolio analytics and partner-enabled payment and financing capabilities.

## 2. Problem statement

Nigerian agencies and landlords commonly manage property operations across notebooks, spreadsheets, bank alerts, email and WhatsApp. This creates fragmented records and manual work.

- **Rent tracking and arrears:** staff manually record payments, chase tenants and track outstanding balances.
- **Landlord accounting:** rent collected on behalf of landlords must be reconciled against commissions, maintenance costs and remittances.
- **Maintenance coordination:** repair requests, photos, quotations, approvals, vendors, work completion and costs are often spread across messages.
- **Lead and appointment follow-up:** prospective tenants, calls, viewing appointments and follow-up tasks are not managed in one consistent pipeline.
- **Tenant screening:** screening requirements and decisions vary by agency, property and landlord, but evidence and approval history are difficult to track.
- **Tenant experience:** tenants often have no reliable self-service channel for balances, receipts, documents, repair updates or questions.
- **Renewals and vacancies:** lease expiry, renewal follow-up and unit availability may be missed.
- **Portfolio visibility:** agency owners and landlords lack timely insight into occupancy, arrears, maintenance costs, renewal performance and net property income.
- **Remote ownership:** landlords, including those outside the property’s city or country, need secure visibility without relying on calls to agency staff.

## 3. Product vision and principles

### 3.1 Vision

Become the dependable operating system for Nigerian property managers: one place to manage the property, the people, the money, the maintenance and the tenancy lifecycle.

### 3.2 Product principles

1. **Management-first:** optimise for managing properties and tenancies, not public property discovery.
2. **One lifecycle:** link CRM, appointments, screening, lease creation, tenant service, maintenance and financial records.
3. **Configurable workflows:** allow agencies to tailor screening steps, task types, approvals, reminders and service processes without custom development.
4. **Financial integrity:** preserve a clear, auditable distinction between landlord/client funds and agency income.
5. **Tenant and landlord transparency:** show each party only the information and actions they are authorised to access.
6. **Mobile-first field work:** support caretakers and agents working from phones and unreliable connections.
7. **Partner-enabled finance:** present financing options only through suitable authorised providers; Tenaville does not itself lend.
8. **Privacy by design:** collect only the personal data needed for a defined purpose and apply role-based access, consent and retention rules.
9. **Practical Nigerian workflows:** support naira, Nigerian addresses and phone numbers, WhatsApp/SMS/email messaging, and state-configurable tenancy rules.

## 4. Goals, non-goals and success metrics

### 4.1 Goals

- Maintain a reliable source of truth for properties, units, landlords, tenants, leases, payments, repairs and documents.
- Reduce manual work in rent collection tracking, arrears follow-up, repair coordination and landlord statement preparation.
- Provide a structured pipeline from prospective tenant enquiry to appointment, screening and lease.
- Make tenant screening configurable by agency and, where appropriate, by property or landlord.
- Give tenants a secure self-service portal for routine tenancy tasks.
- Provide useful portfolio analytics for operational and financial decisions.
- (R3) Offer tenants a way to discover and apply for eligible third-party rent financing where a regulated partner supports it.
- Reach a paying pilot quickly and grow revenue with units under management.

### 4.2 Non-goals

- Public property marketplace, public property-search portal, listing syndication or sale-lead marketplace.
- Property sales transactions, mortgage brokerage, property valuation or title certification.
- Tenaville acting as a bank, lender, deposit taker, credit bureau or payment licence holder.
- Tenaville making autonomous credit decisions or guaranteeing financing approval.
- Full double-entry accounting for an agency’s own books.
- Hard-coding one tenant-screening policy or one state’s tenancy rules for all customers.
- Replacing legal advice, professional property inspection or independent title due diligence.

### 4.3 Success metrics

- **Activation:** an agency imports at least 10 units and records a lease or payment within 7 days of signup.
- **Portfolio adoption:** number and percentage of managed units with current property, tenancy and payment status.
- **Collections visibility:** percentage of active leases with up-to-date payment status.
- **Statement efficiency:** reduction in time required to prepare landlord statements.
- **Maintenance responsiveness:** time from repair request to acknowledgement, assignment and resolution.
- **CRM effectiveness:** lead response time, appointment attendance rate and lead-to-lease conversion.
- **Screening operations:** median time from completed application to decision and percentage of applications with required steps completed.
- **Tenant self-service:** percentage of repair requests and routine enquiries submitted through the portal.
- **Renewal performance:** renewal rate and number of expired leases without a recorded next step.
- **Portfolio performance:** occupancy, arrears, maintenance spend and net landlord remittance visibility.
- **Retention and revenue:** agency retention at months 3 and 6, units under management and revenue per agency.
- **Financing partner outcomes (R3 only):** application starts, completed referrals and partner-reported outcomes, where data-sharing is lawful and available. Do not track or optimise for this before the financing journey exists.

### 4.4 Targets (starting hypotheses to validate in the pilot)

The metrics above need numbers to be useful. These are starting hypotheses, to be replaced with baselines measured in the pilot and agreed with pilot agencies.

| Metric | Starting hypothesis | How it is measured |
|---|---|---|
| Activation | Agency imports 10 or more units and records a lease or payment within 7 days | Signup and event timestamps |
| Payment-status currency | 95% or more of active leases show a payment status updated within 7 days of the due date | Ledger and lease data |
| Statement preparation time | At least 50% lower than the agency's own baseline | Timed pilot sessions plus in-app timestamps |
| Repair acknowledgement | Acknowledged within one business day for most requests | Work order timestamps |
| Offline sync integrity | Zero duplicate payments or receipts in pilot and test runs | Sync logs and ledger checks |
| Month-3 retention | Set after the pilot; measure from the first paying cohort | Subscription data |


## 5. Users and personas

| Persona | Context | Primary needs |
|---|---|---|
| Agency owner / administrator | Owns the agency relationship and controls staff and portfolios | Portfolio oversight, financial integrity, analytics, permissions, approvals and growth |
| Property manager | Manages assigned properties and tenancies | Daily operations, renewals, repairs, tenant communication and task management |
| Letting agent / CRM user | Handles prospective tenants and appointments | Lead pipeline, reminders, viewing schedule, application handoff and follow-up |
| Caretaker / field agent | Works on site, sometimes with poor connectivity | Log repairs with photos, update work status, complete inspections and record field activity |
| Maintenance coordinator | Coordinates vendors, quotations, approvals and jobs | Work orders, assignments, deadlines, evidence, costs and completion confirmation |
| Accountant / bookkeeper | Maintains rent records and landlord balances | Payment allocation, reconciliation, statements, remittances and exports |
| Landlord / property owner | Owns one or more managed properties | Statements, repair approvals, portfolio performance and secure remote access |
| Tenant | Lives in or occupies a managed unit | Rent balance, receipts, documents, repair requests, updates and financing referrals |
| Screening reviewer | Reviews tenant applications and supporting evidence | Configurable checklist, secure documents, review notes, decisions and audit history |
| Individual landlord-manager | Manages a small portfolio directly | A simplified version of the same management workflows |
| Financing partner (external) | Provides eligible rent-financing products | Consented referrals and only the minimum permitted application information |

## 6. Scope and release strategy

Priorities: **P0 = core launch**, **P1 = next release**, **P2 = later expansion**. Release boundaries should be validated against delivery capacity and pilot feedback.

| Release | Theme | Main scope |
|---|---|---|
| **R1 — Core management** | Record, track and coordinate | Organisation and roles; landlords, properties and units; tenants and leases; rent schedules and manual payment records; arrears; landlord ledger and statements; foundational maintenance requests and work orders; documents; basic reminders; landlord read-only portal; initial tenant portal; native staff mobile app for field workflows (offline-capable); landlord and tenant access on responsive web; basic reports |
| **R2 — Workflow automation** | Coordinate and automate | Virtual accounts/payment links through a licensed partner; auto-reconciliation; expanded tenant portal; CRM pipeline; appointment scheduling and follow-ups; configurable screening workflow; maintenance approvals, quotations and vendor coordination; landlord repair approvals; portfolio analytics; accounting exports; recurring inspections and reminders |
| **R3 — Tenant services and intelligence** | Improve outcomes and extend | Partner-enabled rent-financing journey; advanced analytics and configurable dashboards; deeper tenant self-service; advanced maintenance scheduling and service-charge workflows; e-signature; integrations/API; expanded branch and portfolio controls |

**Explicit exclusion across all releases:** no public marketplace listings or public property-search marketplace. Internal property/unit records and internal vacancy status remain necessary for management. Agencies may optionally share a private or agency-controlled vacancy page in a later release only if separately approved; this must not become a Tenaville public marketplace.

## 7. Core domain concepts

| Term | Meaning |
|---|---|
| Organisation | A tenant of the SaaS product: an agency or individual landlord account |
| Landlord | Person or entity that owns a property |
| Management mandate | Agreement defining an agency’s authority, commission, deductions and remittance terms |
| Property | Building, compound or estate under management |
| Unit | Rentable flat, room, shop, office or other space within a property |
| Tenant | Person or organisation occupying a unit under a lease |
| Prospect / lead | A potential tenant or other prospective customer being handled by an agency |
| Appointment | Scheduled viewing, inspection, maintenance visit or other property-related meeting |
| Screening profile | Configurable set of checks and decision steps applied to a tenant application |
| Lease | Agreement tying tenant(s) to a unit with dates, rent and other charges |
| Charge | Amount owed, such as rent, service charge, caution deposit, utility or agreed fee |
| Payment allocation | Assignment of a payment to one or more charges |
| Work order | Managed maintenance or repair job with assignment, status, approvals, evidence and costs |
| Landlord statement | Period report of collections, deductions, costs and net remittance |
| Client funds | Money collected on behalf of landlords, distinct from agency income |
| Financing referral | A tenant-authorised handoff or application flow to an external financing provider |

## 8. Functional requirements

### 8.1 Organisation, users, roles and audit (ORG)

- **ORG-1 (P0):** Signup creates an organisation of type agency or individual landlord with an owner account.
- **ORG-2 (P0):** Support verified email and/or phone, staff invitations and account recovery.
- **ORG-3 (P0):** Provide roles including Owner/Admin, Property Manager, Letting Agent, Caretaker, Maintenance Coordinator, Accountant, Screening Reviewer, Landlord and Tenant.
- **ORG-4 (P0):** Enforce role-based and property/portfolio-scoped access.
- **ORG-5 (P0):** Record audit events for financial changes, lease changes, screening decisions, sensitive document access, maintenance approvals and permission changes.
- **ORG-6 (P1):** Support multiple branches, teams and branch-level reporting.
- **ORG-7 (P1):** Allow organisation administrators to configure approval limits, workflow templates and notification defaults.
- **ORG-8 (P0):** Ensure every tenant organisation’s data is isolated at the database level.
- **ORG-9 (P0):** Provide session management: device list, remote sign-out, session timeout and password reset controls.
- **ORG-10 (P1):** Offer optional two-factor authentication for all users and make it configurable as required for owners and accountants.

### 8.2 Properties and units (PROP)

- **PROP-1 (P0):** Create properties with name/reference, address, state, LGA/area, property type, photos, notes and optional map coordinates.
- **PROP-2 (P0):** Create units with label/reference, type, size/bedrooms where applicable, occupancy status, asking/contracted rent, facilities and notes.
- **PROP-3 (P0):** Support statuses such as vacant, occupied, reserved, under maintenance and inactive.
- **PROP-4 (P0):** Import properties and units from spreadsheet templates with row-level validation and error reporting.
- **PROP-5 (P0):** Link properties to one landlord; support ownership shares and multiple landlords in a later release.
- **PROP-6 (P1):** Support custom fields per property or unit.
- **PROP-7 (P1):** Keep an internal vacancy history, including dates vacant/occupied, reason for vacancy and next action.
- **PROP-8 (P1):** Attach property-specific operating documents, warranties, manuals and inspection records.
- **PROP-9 (P0):** Do not expose property records in a public marketplace or public search index.
- **PROP-10 (P1):** Generate an agency-controlled unit sheet (PDF or private link) that staff can send to a prospect. Links are unguessable, can expire, are excluded from search engines and show only fields the agency chooses. This supports prospect follow-up without creating a public marketplace.

### 8.3 Landlords and management mandates (OWN)

- **OWN-1 (P0):** Store landlord contact details, preferred communication channel and remittance details with restricted access.
- **OWN-2 (P0):** Configure management mandate, commission type/rate, remittance schedule and permitted deductions.
- **OWN-3 (P0):** Give landlords secure read-only access to their assigned properties, statements, balances and documents.
- **OWN-4 (P1):** Allow landlords to approve or reject repairs above a configurable amount.
- **OWN-5 (P1):** Allow landlord comments, approval history and supporting attachments on relevant maintenance requests.
- **OWN-6 (P1):** Show landlords agreed portfolio indicators such as occupancy, arrears, maintenance costs and remittance history.

### 8.4 Tenant and lease management (LEASE)

- **LEASE-1 (P0):** Maintain tenant records, contacts, optional next-of-kin/employer/business details and authorised documents.
- **LEASE-2 (P0):** Create a lease with tenant(s), unit, dates, rent, payment frequency, due dates, deposit and other charges.
- **LEASE-3 (P0):** Support lease states draft, active, expiring soon, expired, terminated and renewed. When screening is enabled (P1), add screening pending and ready for approval.
- **LEASE-4 (P0):** Generate renewal records from existing leases while retaining historical terms.
- **LEASE-5 (P0):** Record move-in, move-out, handover notes, outstanding balance, meter readings and deposit handling.
- **LEASE-6 (P0):** Configure expiry alerts, for example 90, 60 and 30 days before expiry.
- **LEASE-7 (P1):** Support configurable rent-review/escalation rules and approval before applying new terms.
- **LEASE-8 (P2):** Provide tenancy agreement templates and electronic signature through an appropriate provider.
- **LEASE-9 (P1):** Support co-tenants and guarantors.
- **LEASE-10 (P1):** Create a tenant lease from an approved application without re-entering the same information.
- **LEASE-11 (P0):** Preserve lease and tenant history when a tenant record is updated or a lease is terminated.
- **LEASE-12 (P0):** Create a lease directly from a tenant and unit without an application. This is the default R1 path. Screening and CRM add an optional route in R2.
- **LEASE-13 (P0):** Manage the caution deposit lifecycle: record the deposit as client funds, hold status, deductions at move-out with evidence and approval, and refund or transfer with a ledger entry.
- **LEASE-14 (P1):** Generate notices and letters from agency-configured templates (formal rent reminder, lease expiry or renewal notice, rent-review notice, demand letter) with merge fields. Tenaville supplies no legal wording as advice; templates and notice periods are set by the agency.

### 8.5 Rent schedules, payments and arrears (RENT)

- **RENT-1 (P0):** Generate charges from lease terms, including annual, half-yearly, quarterly or monthly rent where configured.
- **RENT-2 (P0):** Record payments received through cash, bank transfer, POS or other configured methods, with reference and evidence.
- **RENT-3 (P0):** Allocate payments to one or more charges and issue receipts.
- **RENT-4 (P0):** Support reversals and corrections without silently overwriting the financial history.
- **RENT-5 (P0):** Provide rent roll, upcoming dues, arrears ageing and payment history by tenant, unit, property, landlord and portfolio.
- **RENT-6 (P0):** Configure reminders and follow-up tasks for upcoming and overdue charges.
- **RENT-7 (P1):** Configure late fees only where the agency’s policy and applicable law permit them.
- **RENT-8 (P1):** Provide virtual accounts and payment links via a licensed payment partner, with signed webhooks, idempotency and reconciliation.
- **RENT-9 (P1):** Match incoming bank/payment records to tenants, units and charges; provide a review queue for ambiguous matches.
- **RENT-10 (P1):** Support scheduled landlord remittance runs with approval and reconciliation.
- **RENT-11 (P1):** Export financial records for external accounting tools.
- **RENT-12 (P0):** Clearly label recorded payments versus partner-confirmed payments; never claim payment is confirmed without reliable confirmation.
- **RENT-13 (P0):** Issue receipts with unique, sequential numbers per organisation (per branch if configured). Voided or reversed receipts keep their numbers, and numbers are never reused.
- **RENT-14 (P0):** Handle part payments, overpayments and tenant credit. Default allocation is oldest charge first, with a permissioned manual override.
- **RENT-15 (P0):** Provide a daily cash-up per user and payment method for reconciliation against bank and cash.
- **RENT-16 (P0):** Support opening balances and historical arrears at cutover (see MIG-2).

### 8.6 Landlord ledger, statements and remittances (LEDGER)

- **LEDGER-1 (P0):** Maintain an auditable landlord ledger for rent receipts, commission, approved costs, adjustments and remittances.
- **LEDGER-2 (P0):** Generate period statements showing opening balance, collections, deductions, costs, remittances and closing balance.
- **LEDGER-3 (P0):** Attach receipts, invoices and approval evidence to ledger-related entries.
- **LEDGER-4 (P0):** Separate landlord/client funds from agency income in the data model and financial reports.
- **LEDGER-5 (P0):** Restrict statement visibility to authorised staff and the relevant landlord.
- **LEDGER-6 (P1):** Support approval and batch processing of remittance schedules.
- **LEDGER-7 (P1):** Allow branded PDF and downloadable statements.
- **LEDGER-8 (P0):** Route statements through draft, reviewed and issued states. Issued statements are immutable; corrections are issued as a numbered revision that references the original.
- **LEDGER-9 (P0):** Recognise commission when rent is received by default, with the basis defined in the mandate. Other bases (for example on invoice) are configurable in P1.
- **LEDGER-10 (P1):** Support configurable tax lines (for example VAT on commission, withholding tax on rent), off by default and validated with a tax adviser before use.
- **LEDGER-11 (P1):** Record the settlement-account model for partner-provided virtual accounts (agency client account, landlord account or split) as organisation configuration, and reflect it in the ledger and statements.

### 8.7 Maintenance and repair management (MAINT)

- **MAINT-1 (P0):** Create a maintenance request against a property/unit, submitted by staff or tenant.
- **MAINT-2 (P0):** Capture category, description, urgency, reported date, access constraints, photos/videos where supported, and whether the issue affects safety or habitability.
- **MAINT-3 (P0):** Track core statuses Submitted, Acknowledged, Assigned, In Progress, On Hold, Completed, Rejected and Closed. When quotation and approval workflows are enabled (P1), add Triage, Awaiting Quote, Awaiting Landlord Approval and Approved. Administrators may configure allowed transitions.
- **MAINT-4 (P0):** Assign an owner/coordinator, priority, due date and responsible staff member.
- **MAINT-5 (P0):** Record activity timeline, comments, status changes, attachments and communications.
- **MAINT-6 (P0):** Maintain vendor records, contact details, trade/category, service areas, availability notes and internal performance history.
- **MAINT-7 (P1):** Request and compare one or more vendor quotations, including labour, materials, call-out fees, taxes and validity period.
- **MAINT-8 (P1):** Configure approval thresholds by landlord, property, cost or job category. Jobs above the threshold must not proceed to authorised work until approval is recorded, except where a separately configured emergency protocol applies.
- **MAINT-9 (P1):** Create work orders with scope, assigned vendor, target date, agreed cost and access instructions.
- **MAINT-10 (P0):** Record actual cost, invoices, receipts, before/after photos and completion notes.
- **MAINT-11 (P0):** Allocate repair costs to landlord, tenant, agency, service charge or another configured payer, with reason and approval.
- **MAINT-12 (P0):** Notify tenants of acknowledgement, appointment/visit, status changes and completion, subject to notification preferences.
- **MAINT-13 (P1):** Let tenants confirm whether the issue is resolved or reopen it with a reason.
- **MAINT-14 (P1):** Support recurring preventive maintenance and inspection schedules.
- **MAINT-15 (P1):** Track response time, resolution time, repeat incidents, vendor cost and overdue jobs.
- **MAINT-16 (P0):** Preserve the repair history against the property/unit even after a tenancy ends.
- **MAINT-17 (P1):** Support emergency escalation rules, named contacts and an auditable record of actions taken.

### 8.8 CRM pipeline and prospective tenant management (CRM)

CRM is an internal operational workflow, not a public marketplace or lead-selling feature.

- **CRM-1 (P1):** Create a prospect manually or from an agency-controlled channel such as a phone call, WhatsApp message, referral, email or private enquiry form.
- **CRM-2 (P1):** Record contact details, preferred contact method, requested property/unit or property type, budget range, preferred area, intended move-in date, household/occupancy requirements and notes, collecting only necessary information.
- **CRM-3 (P1):** Track configurable pipeline stages, with defaults such as New, Contacted, Qualified, Appointment Booked, Viewed, Application Started, Screening, Approved, Lease Offered, Converted, Lost and Nurture.
- **CRM-4 (P1):** Assign each lead to an agent or team and record the source, owner, next action and follow-up due date.
- **CRM-5 (P1):** Maintain a chronological activity timeline for calls, messages, appointments, notes, tasks and stage changes.
- **CRM-6 (P1):** Schedule reminders and overdue follow-up alerts; show an agent’s daily follow-up queue.
- **CRM-7 (P1):** Detect likely duplicate leads and allow authorised merging while preserving activity history.
- **CRM-8 (P1):** Record lost reasons and nurture dates, and support reactivation without creating duplicate records.
- **CRM-9 (P1):** Convert a qualified lead to an application and, after approval, to a tenant/lease while reusing data with permission.
- **CRM-10 (P1):** Report lead response time, pipeline ageing, appointment conversion, application conversion, lead-to-lease rate and lost reasons.
- **CRM-11 (P1):** Support messaging templates for follow-ups via configured WhatsApp Business, SMS and email providers. Record delivery status where the provider makes it available.
- **CRM-12 (P1):** Honour opt-outs and consent requirements for marketing communications. Operational tenancy messages must be distinguished from promotional messages.

### 8.9 Appointment scheduling and follow-ups (APPT)

- **APPT-1 (P1):** Schedule property viewings, tenant meetings, inspections, maintenance visits and other configured appointment types.
- **APPT-2 (P1):** Link an appointment to a lead, tenant, property/unit, maintenance request or staff member as applicable.
- **APPT-3 (P1):** Record date, start/end time, location or meeting instructions, attendees, assigned staff and access requirements.
- **APPT-4 (P1):** Prevent or flag conflicts in the assigned staff member’s schedule and support rescheduling/cancellation.
- **APPT-5 (P1):** Send configurable confirmations and reminders through available channels, with delivery status where supported.
- **APPT-6 (P1):** Record outcomes such as Completed, No-show, Cancelled, Rescheduled, Interested, Follow-up Required or Not Suitable.
- **APPT-7 (P1):** Automatically create follow-up tasks from appointment outcomes, with an owner and due date.
- **APPT-8 (P1):** Capture feedback, next steps and the prospect’s interest level after a viewing.
- **APPT-9 (P1):** Provide calendar and list views, daily agenda and filters by team, appointment type and status.
- **APPT-10 (P2):** Integrate with external calendars where justified and permitted by user consent.

### 8.10 Configurable tenant screening (SCREEN)

Screening must be a configurable workflow, not a single fixed checklist. Requirements and decisions are controlled by the agency and applicable landlord policy. Tenaville does not guarantee the accuracy of third-party evidence or make an automatic eligibility decision.

- **SCREEN-1 (P1):** Create screening templates by organisation and optionally apply overrides by property, landlord or unit type.
- **SCREEN-2 (P1):** Configure steps such as identity evidence, employment/business information, income/affordability evidence, previous landlord reference, guarantor details, consent, interview, document review and manual decision.
- **SCREEN-3 (P1):** Mark each step required/optional, assign a reviewer, define accepted evidence types and set an expiry/recency rule where appropriate.
- **SCREEN-4 (P1):** Support statuses such as Not Started, Requested, Submitted, Under Review, More Information Required, Passed, Failed, Waived and Expired, with reasons and authorised override.
- **SCREEN-5 (P1):** Provide a tenant-facing application form and secure document-upload flow within the portal.
- **SCREEN-6 (P1):** Record applicant consent, purpose, timestamp, privacy notice version and any third-party checks requested.
- **SCREEN-7 (P1):** Keep reviewer notes, evidence, decision rationale, reviewer identity and timestamps in an auditable history.
- **SCREEN-8 (P1):** Restrict access to screening information to explicitly authorised roles; do not expose sensitive screening notes to other tenants or general staff.
- **SCREEN-9 (P1):** Allow a reviewer to request additional information and notify the applicant of required actions without revealing confidential internal notes.
- **SCREEN-10 (P1):** Prevent lease activation where required screening steps remain incomplete, unless an authorised user records an override and reason.
- **SCREEN-11 (P1):** Support configurable retention and deletion/anonymisation rules for rejected or withdrawn applications, subject to legal obligations.
- **SCREEN-12 (P1):** Report application volume, completion time, pending steps and outcomes without exposing unnecessary personal details.
- **SCREEN-13 (P2):** Integrate with identity or reference-check providers only after security, legal, pricing and data-processing review.
- **SCREEN-14 (P1):** Do not use protected or sensitive personal characteristics as screening criteria. Criteria must be lawful, relevant, explainable and reviewable.
- **SCREEN-15 (P1):** Treat national and financial identifiers (for example NIN and BVN) as highly sensitive. Collect them only where necessary and lawful, mask them by default, restrict and audit access, and prefer a verification result (pass or fail) from an authorised provider over storing the identifier. Confirm the legal basis before launch.
- **SCREEN-16 (P1):** Apply each template's criteria consistently across applicants and record the criteria version used, so decisions can be reviewed for fairness.

### 8.11 Tenant self-service portal (TENANT)

- **TENANT-1 (P0):** Provide secure tenant access linked to the correct organisation, tenant record and active lease.
- **TENANT-2 (P0):** Show lease summary, rent due dates, charge breakdown, recorded payment history, receipts and current balance.
- **TENANT-3 (P1):** Show partner-confirmed payments and virtual account/payment instructions when enabled; clearly distinguish pending from confirmed payments.
- **TENANT-4 (P0):** Let tenants submit maintenance requests with category, description, preferred access times and attachments.
- **TENANT-5 (P1):** Let tenants track repair status, appointments, expected next step and relevant messages.
- **TENANT-6 (P0):** Provide access to lease documents, receipts, notices and other documents explicitly shared with the tenant.
- **TENANT-7 (P1):** Allow tenants to update permitted contact details and notification preferences; sensitive changes may require verification or staff approval.
- **TENANT-8 (P1):** Provide a secure communication/request channel and show status for submitted requests.
- **TENANT-9 (P1):** Show renewal prompts and allow a tenant to indicate whether they wish to renew, without automatically renewing a lease.
- **TENANT-10 (P2):** Provide a financing information area only where an eligible partner is integrated. Explain that financing is provided by the partner, subject to its eligibility checks and terms.
- **TENANT-11 (P2):** Obtain explicit, purpose-specific consent before sharing tenant data with a financing partner. Show the recipient, data fields, purpose and applicable privacy information.
- **TENANT-12 (P2):** Allow a tenant to start a financing referral/application and redirect or securely hand off to the provider’s approved flow. Show only partner-provided application status where supported.
- **TENANT-13 (P2):** Do not promise approval, display misleading affordability claims or describe financing as a Tenaville loan.
- **TENANT-14 (P0):** Provide responsive mobile web access for tenants and landlords in R1. Native tenant and landlord apps are P2 and only if pilot data shows material value.
- **TENANT-15 (P1):** Provide accessible language, low-data and clear error/retry behaviour for common tenant actions.

### 8.12 Rent financing and partner integrations (FIN)

This whole section is **R3**. Nothing here is required for R1 or R2, and nothing in R1 or R2 should depend on it.

- **FIN-1 (P2):** Design a provider-neutral integration boundary so a financing partner can be added or replaced without rewriting core tenancy workflows.
- **FIN-2 (P2):** Only onboard providers after legal/regulatory review, due diligence, security review and clear contractual responsibilities.
- **FIN-3 (P2):** Make clear who the lender is, who makes the credit decision, who services the financing and who receives repayments.
- **FIN-4 (P2):** Do not let Tenaville receive, pool, lend or hold tenant financing proceeds unless a separately approved legal/regulatory model explicitly permits it. Default design is direct provider-to-recipient settlement.
- **FIN-5 (P2):** Share only consented minimum data and record consent, payload, provider reference and handoff time.
- **FIN-6 (P2):** Keep financing application data and status access restricted and segregated from ordinary property-management permissions.
- **FIN-7 (P2):** Support provider callbacks/webhooks with signature verification, idempotency, replay protection and audit logging.
- **FIN-8 (P2):** Record financing status separately from rent payment status. A financing approval is not proof that rent has been paid.
- **FIN-9 (P2):** Where contractually and technically supported, reconcile confirmed disbursements to the relevant rent charge and show the resulting payment evidence.
- **FIN-10 (P2):** Do not charge tenants hidden fees or make financing a mandatory condition of tenancy management.

### 8.13 Portfolio analytics and reporting (ANALYTICS)

- **AN-1 (P0):** Provide core operational reports: rent roll, occupancy/unit status, lease expiries, arrears, collections, maintenance queue and landlord statements.
- **AN-2 (P1):** Provide portfolio dashboard filters by date range, branch, property, landlord, manager and unit type, subject to permissions.
- **AN-3 (P1):** Calculate occupancy rate using a documented and configurable denominator that excludes units intentionally marked inactive where appropriate.
- **AN-4 (P1):** Show rent billed versus collected, arrears ageing, collection rate, overdue balances and upcoming rent due.
- **AN-5 (P1):** Show lease expiry pipeline, renewal rate, vacancy duration, time from vacancy to occupancy and units requiring action.
- **AN-6 (P1):** Show maintenance request volume, response/resolution time, overdue jobs, repeat issues, cost by property/category/vendor and maintenance cost per unit.
- **AN-7 (P1):** Show landlord-level collections, approved costs, deductions and net remittances.
- **AN-8 (P1):** Show CRM funnel metrics including lead response time, appointment attendance, application conversion and lead-to-lease conversion.
- **AN-9 (P1):** Support export to CSV/XLSX/PDF where appropriate and permitted.
- **AN-10 (P1):** Define metric formulas and time windows in the product so users can understand what each metric means.
- **AN-11 (P2):** Support saved dashboards and configurable KPI cards for different roles.
- **AN-12 (P2):** Add optional benchmark comparisons only where reliable, lawful data sources exist; do not imply market-wide representativeness without evidence.
- **AN-13 (P0):** Enforce the same organisation and property-level access restrictions in analytics, exports and background reports as in the main application.

### 8.14 Communications, reminders and tasks (COMMS)

- **COMMS-1 (P0):** Provide configurable templates for rent reminders, receipts, lease expiry, maintenance updates and landlord statements.
- **COMMS-2 (P0):** Abstract messaging providers for WhatsApp Business, SMS and email.
- **COMMS-3 (P0):** Store message metadata, recipient, template, send time, delivery status where available and related record.
- **COMMS-4 (P0):** Allow tasks with owner, due date, priority, related record, notes and completion status.
- **COMMS-5 (P1):** Support recurring tasks and automated task creation from configurable events.
- **COMMS-6 (P0):** Respect consent, opt-outs, channel preferences, rate limits and provider policy.
- **COMMS-7 (P1):** Provide an inbox or work queue for messages requiring a human response, subject to provider capabilities.
- **COMMS-8 (P0):** Model WhatsApp business messaging within provider rules: use provider-approved templates for business-initiated messages, track template approval status, handle send failures with a fallback channel (SMS or email), and show message cost to administrators where the provider reports it.

### 8.15 Documents and inspections (DOC)

- **DOC-1 (P0):** Attach documents to properties, units, landlords, tenants, leases, screening applications, maintenance jobs and payments as appropriate.
- **DOC-2 (P0):** Support access controls, document type, issue/expiry date, uploader and audit trail.
- **DOC-3 (P0):** Generate and download receipts and landlord statements.
- **DOC-4 (P1):** Support inspection checklists, photos, notes, meter readings and acknowledgement/signature capture where supported.
- **DOC-5 (P1):** Alert authorised staff to expiring documents.
- **DOC-6 (P1):** Scan uploads for malware where supported and use time-limited secure download links.
- **DOC-7 (P0):** Never expose a document through a guessable public URL; enforce authorisation at download time.

### 8.16 Subscription and billing (BILL)

- **BILL-1 (P0):** Offer a trial and subscription tiers priced primarily by units under management, billed in naira.
- **BILL-2 (P0):** Support subscription payment through an appropriate Nigerian payment gateway, with invoices and receipts.
- **BILL-3 (P0):** Show plan limits and upgrade prompts. Provide a grace period before restrictions.
- **BILL-4 (P0):** Do not delete customer data solely because a subscription is unpaid; preserve export access subject to security and legal policy.
- **BILL-5 (P1):** Validate any optional transaction or financing-related revenue model before implementation and disclose fees clearly.

### 8.17 Migration and onboarding (MIG)

Agencies start with existing tenants, leases and balances. Without a way to bring these in, onboarding stalls.

- **MIG-1 (P0):** Import tenants, leases and current charges from spreadsheet templates, extending the property and unit import (PROP-4), with validation and row-level error reports.
- **MIG-2 (P0):** Import opening balances at a chosen cutover date: tenant arrears and credits, and landlord ledger balances. Opening entries are labelled as such and cannot be edited after the cutover is confirmed.
- **MIG-3 (P0):** Provide a dry-run import that shows what will be created, with the ability to roll back a completed import batch.
- **MIG-4 (P1):** Provide an onboarding checklist and sample templates, and an optional assisted-import service for larger agencies.
- **MIG-5 (P0):** Let administrators export all organisation data in documented formats at any time.

### 8.18 Staff mobile app (MOB)

- **MOB-1 (P0):** Provide native iOS and Android apps for staff covering daily field work: record a payment and send a receipt, view tenants and arrears, log and update maintenance with photos, and work tasks and follow-ups.
- **MOB-2 (P1):** Add inspection checklists with photos, notes and meter readings.
- **MOB-3 (P0):** Support offline capture for maintenance notes and photos, tasks and payment records. Offline records use client-generated unique IDs and sync idempotently.
- **MOB-4 (P0):** Offline payments get a clearly marked provisional receipt ("pending sync"). The official receipt number is assigned by the server on sync, and the tenant is notified then. Financial records are server-authoritative, and last-writer-wins is not allowed for payments, allocations or ledger entries.
- **MOB-5 (P0):** Show sync state (pending, synced, failed) per record with a visible retry, and never silently discard a failed write.
- **MOB-6 (P0):** Protect devices: PIN or biometric lock, encrypted local storage, and remote session revocation that wipes locally cached data.
- **MOB-7 (P0):** Support low-data operation: compress images before upload, resume interrupted uploads and paginate lists.
- **MOB-8 (P0):** Send push notifications for tasks, assignments and alerts.
- **MOB-9 (P1):** Define supported OS versions and a forced-update policy for breaking API changes.

## 9. Core workflows

### 9.1 Prospect-to-lease workflow

1. Staff records a prospect from an agency-controlled channel.
2. Prospect is assigned to an agent and given a pipeline stage and next action.
3. Agent contacts the prospect and schedules a viewing or meeting.
4. Appointment reminders are sent and the outcome is recorded.
5. If interested, the prospect receives an application through a secure flow.
6. The organisation’s configured screening template is applied.
7. Reviewers request missing evidence, complete checks and record a decision.
8. An authorised user approves or rejects the application, with rationale and audit history.
9. Approved applicant details are converted into a tenant and lease.
10. The lease generates the rent schedule and links the tenant to the self-service portal.

### 9.2 Maintenance-to-resolution workflow

1. Tenant or staff submits a repair request.
2. The system acknowledges receipt and classifies priority.
3. Coordinator reviews the request, requests information if necessary and assigns a responsible person.
4. Where required, vendor quotation(s) are obtained and landlord approval is requested.
5. An authorised user approves the work and budget.
6. Work order is assigned and a visit is scheduled.
7. Vendor/staff updates status and uploads evidence.
8. Actual costs and invoices are recorded and allocated to the correct payer.
9. Tenant is notified; tenant may confirm resolution or reopen with a reason.
10. Job is closed and included in property history, landlord statement and analytics as applicable.

### 9.3 Rent collection and remittance workflow

1. Lease terms generate rent charges.
2. Payment is recorded manually in R1 or received through a licensed partner integration in a later release.
3. Payment is allocated to charges and receipt is issued.
4. Arrears and reminders update based on the ledger.
5. Landlord ledger reflects collection, commission and approved deductions.
6. Authorised staff reviews the remittance batch and issues the statement.
7. Any correction is handled through a linked reversal or adjustment, not silent deletion.

### 9.4 Tenant financing referral workflow (R3)

1. Tenant opens the financing information area in the self-service portal.
2. Tenaville explains that the product is provided by an external partner and that eligibility, cost and approval are determined by that provider.
3. Tenant reviews the privacy notice and grants explicit consent to the specific data sharing.
4. Tenant is handed off to the partner’s approved application journey, or uses a secure integration.
5. Partner returns an application reference/status where permitted.
6. If a disbursement occurs, it is treated as rent paid only after reliable confirmation and reconciliation.
7. Tenaville records the event and audit trail; it does not make the credit decision.

## 10. Money, privacy and data rules

1. **Integer minor units:** store naira amounts as integer kobo; do not use floating-point values for money.
2. **Append-only financial history:** payments, allocations and landlord ledger entries are corrected with linked reversals/adjustments rather than silently overwritten or deleted.
3. **Client-fund separation:** distinguish landlord/client money from agency income in the data model, permissions, reports and reconciliation.
4. **Allocation integrity:** payment allocations must reconcile to the payment amount; charge paid balances must derive from allocations.
5. **Idempotency:** payment records, provider webhooks and retryable operations must not create duplicates.
6. **Time handling:** store timestamps in UTC and display in West Africa Time; treat contractual due dates as calendar dates.
7. **Audit:** record actor, time, action, before/after values where applicable, and reason for sensitive overrides.
8. **Multi-tenancy isolation:** enforce organisation boundaries at the database layer as well as in application logic.
9. **Sensitive screening data:** apply least-privilege access, encryption in transit and at rest, retention controls and access auditing.
10. **Consent and purpose limitation:** collect and share only information necessary for the stated purpose; separate operational communication consent from marketing consent.
11. **Data subject rights:** provide processes for access, correction, deletion where applicable, retention exceptions and privacy requests.
12. **Financing separation:** provider application status must not be conflated with rent charge/payment status.
13. **Evidence integrity:** retain the provenance and timestamp of uploaded documents, approvals, inspection evidence and payment confirmations.
14. **Exports:** apply the same access controls and audit expectations to exports as to on-screen data.
15. **Receipt and statement integrity:** receipt numbers are sequential and never reused; issued statements are immutable and corrected by numbered revision.
16. **Offline financial writes:** offline records sync idempotently with client-generated IDs, receive official numbers from the server, and never overwrite server-side financial data.
17. **Client-fund deposits:** caution deposits are tracked as client funds with an auditable lifecycle.

## 11. Legal, regulatory and policy considerations

These items require review by qualified Nigerian legal, privacy and financial-services advisers before production launch.

- **Tenancy rules:** laws and requirements can vary by state. Configure agency rules and applicable notices; do not present defaults as legal advice.
- **Tenant screening:** use lawful, relevant and explainable criteria; document purpose and consent where required; define retention and review processes.
- **Data protection:** assess obligations under the Nigeria Data Protection Act and applicable guidance, including privacy notices, lawful basis, processor agreements, security and breach handling.
- **Rent financing:** onboard only appropriately authorised providers and confirm lending, advertising, referral, data-sharing and complaint-handling responsibilities.
- **Payments:** virtual accounts and payment processing must be supplied by suitable licensed partners. Tenaville should not hold customer funds.
- **Agency commissions, tax and remittance:** make applicable tax treatment configurable and validate with an adviser.
- **Professional claims:** do not imply Tenaville certifies title, verifies property ownership, guarantees tenant identity or provides legal advice.
- **Consumer transparency:** financing costs, eligibility, repayment obligations and provider identity must be disclosed by the responsible provider before application/acceptance.
- **Identifiers:** national and financial identification numbers (for example NIN and BVN) carry specific legal and security expectations. Confirm what may be collected, stored or displayed before using them.
- **Messaging:** WhatsApp business messaging has provider policies (approved templates, opt-in). Marketing messages need explicit consent under data protection rules; operational tenancy messages should be separated from promotional ones.
- **Deposits and client money:** confirm how caution deposits and rent collected for landlords must be held and accounted for under the agency's professional and legal obligations.
- **Naming:** confirm the product name, domain, app-store listings and CAC business name before any public use.

## 12. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Common screens should load in under 2 seconds on a typical mobile connection where practical; large lists use pagination and search |
| Availability | Define target availability and incident response before production; communicate planned maintenance |
| Mobile usability | Responsive UI for small screens; core field workflows usable with one hand where practical |
| Offline operation | Support offline capture for selected field actions such as maintenance notes/photos and inspections; financial writes must sync safely and expose sync status |
| Security | Secure authentication, least privilege, session controls, rate limiting, secure secrets and regular dependency updates |
| Data isolation | Database-enforced organisation-level isolation and automated tests for cross-tenant access |
| Files | Private object storage, authorised access, size/type limits, upload validation and malware scanning where supported |
| Auditability | Searchable audit trail for financial, lease, screening, maintenance approval and permission events |
| Accessibility | Clear labels, keyboard support on web, readable contrast and accessible form validation |
| Reliability | Idempotent background jobs, retries with limits, dead-letter/error visibility and reconciliation tools |
| Interoperability | Versioned API and provider adapters for messaging, payments, financing and calendar integrations |
| Data portability | Organisations can export their data in documented formats, subject to access rights and applicable law |
| Observability | Structured logs, error tracking, uptime monitoring, background-job monitoring and alerting |
| Scalability | Start with a maintainable modular architecture that can support thousands of organisations and large portfolios without premature microservices |
| Localisation | Nigeria-first formats: NGN, Nigerian phone numbers, state/LGA fields and WAT display; design for future localisation |
| Support and onboarding | Define support channels and response targets for pilot and launch. Provide migration help and a status page |
| Recovery objectives | Define recovery point and recovery time objectives before launch, test restores regularly and publish the targets internally |

## 13. Proposed technical approach

This is an engineering recommendation and may be revised during technical design.

- **Architecture:** modular monolith initially, with clear domain/application boundaries and provider adapters.
- **Language:** TypeScript across the main application where practical.
- **Web:** responsive React framework with server-rendering support where useful; installable PWA may supplement native mobile.
- **Mobile:** React Native with Expo, sharing types and validation with the web application where appropriate.
- **API and jobs:** typed API with background workers for reminders, report generation, sync and provider callbacks.
- **Database:** PostgreSQL with database-enforced organisation scoping and Row-Level Security where appropriate.
- **Queue/cache:** managed queue or Redis for background jobs, rate limits and short-lived cache as required.
- **Files:** private S3-compatible object storage with signed access, image optimisation and upload validation.
- **Messaging:** provider abstraction for WhatsApp Business, SMS and email.
- **Payments:** integrate virtual accounts/payment links through a licensed provider; verify signed webhooks and reconcile idempotently.
- **Financing:** separate provider adapter and consented data-sharing boundary; never couple financing eligibility to core lease or ledger logic.
- **Analytics:** start with indexed operational queries and defined metric calculations; introduce pre-aggregation only when scale justifies it.
- **Hosting:** managed services and a simple deployment model to minimise early operational overhead.
- **Security:** automated tenant-isolation tests, audit coverage, secrets management, backups and restore drills.

## 14. Data model overview

Core entities should be organisation-scoped unless a carefully reviewed cross-organisation integration requires otherwise.

- **Organisation and access:** Organisation, User, Role, Permission, Assignment, Branch, DeviceSession, AuditEvent, Subscription, Plan.
- **Property management:** Landlord, ManagementMandate, Property, Unit, UnitShareLink, PropertyDocument, Inspection, InspectionItem.
- **Tenancy:** Tenant, TenantContact, Lease, LeaseParty, Charge, RentSchedule, DepositRecord, Renewal, Notice, DocumentTemplate, ImportBatch.
- **Financial records:** Payment, PaymentAllocation, Receipt, ReceiptSequence, LandlordLedgerEntry, Remittance, StatementRevision, OpeningBalance, SettlementAccount, TaxRule, ReconciliationItem, ProviderPaymentEvent.
- **Maintenance:** MaintenanceRequest, WorkOrder, Vendor, VendorQuote, WorkOrderAssignment, MaintenanceApproval, MaintenanceCost, MaintenanceAttachment.
- **CRM and appointments:** Lead, LeadActivity, PipelineStage, FollowUpTask, Appointment, AppointmentAttendee, AppointmentOutcome.
- **Screening:** ScreeningTemplate, ScreeningStepDefinition, ScreeningApplication, ScreeningStepInstance, ScreeningEvidence, ScreeningReview, ScreeningDecision, ConsentRecord.
- **Tenant self-service and communication:** PortalAccount, TenantRequest, Message, NotificationPreference, MessageDelivery.
- **Financing:** FinancingProvider, FinancingReferral, FinancingConsent, FinancingApplicationReference, FinancingStatusEvent, FinancingDisbursementConfirmation.
- **Analytics:** report definitions and optional pre-aggregated snapshots, with source-of-truth values remaining in operational records.

Key relationships:
- A landlord owns one or more properties under a management mandate.
- A property contains one or more units.
- A lease joins one or more tenants to a unit and generates charges.
- Payments are allocated to charges; allocations and approved deductions feed the landlord ledger.
- A maintenance request may generate one or more work orders and cost records.
- A lead may have activities and appointments, then become a screening application and, after approval, a tenant and lease.
- A screening application uses a versioned template and retains the applied requirements and decisions.
- A financing referral belongs to a tenant/application and provider; only a confirmed and reconciled payment event can affect rent payment status.

## 15. Pricing model (to validate)

- Price primarily by units under management, with volume tiers in naira.
- Consider a small-landlord trial or low-cost tier to support acquisition.
- Include CRM, appointments, maintenance and analytics in clearly defined tiers rather than charging for every routine action.
- Treat payment processing fees as transparent partner pass-throughs or a separately disclosed service fee, subject to validation.
- Do not assume revenue from rent financing. Any referral or integration revenue requires partner contracts, legal review and clear disclosures.
- Validate willingness to pay with 5–10 Nigerian agencies and individual landlords before publishing prices.

## 16. Delivery plan and acceptance criteria

### 16.1 Suggested build order

**R1: core management**

1. Foundations: organisation, authentication, roles, audit, session management, subscription shell, automated tenant-isolation tests.
2. Portfolio: landlords, mandates, properties, units, and spreadsheet import.
3. Tenancy: tenants, leases (direct creation), rent schedules, renewals, expiry alerts, deposit lifecycle.
4. Money: charges, payment records, allocation, receipts with numbering, reversals, cash-up, arrears.
5. Migration: tenant and lease import, opening balances, dry-run and rollback.
6. Landlord ledger: mandates, commission, statements with approval and revisions, remittances, exports.
7. Staff mobile app: payment recording, tenants and arrears, maintenance logging, tasks, offline sync.
8. Maintenance foundation: requests, assignment, statuses, attachments, vendors and costs.
9. Tenant and landlord web access: lease summary, receipts, documents, repair requests, statements.
10. Communications and tasks: templates, reminders, provider abstraction, consent.
11. Hardening and pilot: security testing, backup and restore drills, performance, onboarding, pilot.

**R2: workflow automation**

12. Payment automation: virtual accounts, payment links, reconciliation, remittance runs, settlement model.
13. CRM and appointments: pipeline, activity timeline, scheduling, outcomes, unit sheets.
14. Configurable screening: templates, evidence, review, decisions, consent, audit.
15. Maintenance expansion: quotations, approvals, work orders, preventive schedules, inspections.
16. Analytics: operational dashboard first, then CRM, maintenance and portfolio KPIs.
17. Notices, letters and tax lines.

**R3: tenant services and intelligence**

18. Rent-financing partner integration, only after provider, legal, privacy and security approval.
19. Advanced analytics, e-signature, API and expanded branch controls.

**Capacity warning and cut order.** R1 and R2 together are a large scope. If delivery capacity is limited, protect the money, ledger, migration and mobile payment flows first, since they decide whether an agency can switch from spreadsheets. If something has to move, defer in this order: tenant-portal extras, inspections, maintenance expansion, analytics beyond the operational reports, CRM and appointments, screening, then financing. Re-confirm sizing with a bottom-up estimate once the data model and API are drafted.

### 16.2 Core launch exit criteria

- At least 3 pilot agencies use live portfolios for a complete month-end cycle.
- Pilot agencies can create and maintain properties, leases, rent schedules, payments and arrears without spreadsheet workarounds for core records.
- Landlord statements are accepted without material manual correction.
- Maintenance requests can be created, assigned, updated and closed with an auditable history.
- Tenant portal access is limited to the correct tenant and lease.
- Offline-capable actions sync without duplicate records and clearly show failed/pending sync.
- No open critical security or cross-tenant data isolation defects.
- Backup restoration has been tested.
- Staff can export organisation data.
- Opening balances imported for each pilot agency reconcile to the agency's own records at cutover.
- Receipt numbering shows no gaps, duplicates or reuse in test and pilot data.
- Automated cross-tenant isolation tests pass in CI on every release.
- Offline payment recording is tested with interrupted and repeated syncs and produces no duplicate payments.

### 16.3 Workflow release exit criteria

- CRM leads can be assigned, followed up, scheduled for appointments and converted to applications without losing activity history.
- Configured screening steps are enforced; overrides are permission-controlled and audited.
- Maintenance approvals prevent non-emergency work from being marked authorised before required approval.
- Analytics metrics are documented and reconcile with underlying records.


### 16.4 R3 exit criteria (financing)

- Financing referral is disabled by default until a provider has passed required legal, security and operational checks.
- Financing consent is captured before any personal data is shared, and a financing approval alone never marks rent as paid.
- Financing status and rent payment status are stored and displayed separately.

## 17. Risks and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| Staff continue using paper and WhatsApp | Adoption risk | Make common actions faster, support import, reminders and practical onboarding |
| Financial records are incorrect or manipulated | Trust and disputes | Append-only ledger, permissions, audit logs, reversals and daily cash-up |
| Maintenance jobs exceed budget or are disputed | Landlord trust and cost control | Quote capture, thresholds, approval evidence and itemised costs |
| Vendors miss visits or deliver poor work | Tenant satisfaction | Assignment, reminders, evidence, performance history and escalation |
| CRM becomes overcomplicated | Low agent adoption | Ship simple default stages, allow configuration and measure usage |
| Screening data is mishandled | Privacy and discrimination risk | Least privilege, purpose limitation, lawful criteria, audit and retention policy |
| Tenants do not use the portal | Low self-service adoption | Mobile-first UX, links from messages, useful repair tracking and receipts |
| Financing provider fails or changes terms | Tenant harm and operational disruption | Provider abstraction, due diligence, clear disclosure and ability to disable referrals |
| Financing is mistaken for rent payment | Ledger errors and disputes | Separate status models; reconcile only confirmed disbursements |
| Messaging cost or provider policy changes | Margin and delivery risk | Provider abstraction, fallback channels and cost controls |
| State tenancy requirements differ | Incorrect workflows or notices | Configurable rules and legal review |
| Offline sync conflicts | Data integrity risk | Idempotent operations, server-authoritative financial records and visible sync state |
| Pricing is unproven | Revenue risk | Pilot price tests and unit economics review |
| Scope grows too quickly | Delayed launch | Keep marketplace and sales out of scope; phase CRM, screening, analytics and financing |
| Migration of existing records is slow or error-prone | Agencies cannot switch from spreadsheets | Import tooling with dry-run and rollback, opening-balance support and assisted onboarding |
| Offline payments create duplicate or mismatched receipts | Financial trust | Client-generated IDs, server-assigned receipt numbers, provisional receipts and sync tests |
| WhatsApp templates are rejected or messaging costs rise | Reminders fail or margin shrinks | Template tracking, SMS and email fallback, cost visibility |
| Sensitive identifiers are stored unnecessarily | Privacy and security exposure | Collect only if required, mask, restrict, prefer provider verification |
| Product name is unavailable or conflicts with another mark | Rebrand cost after launch | Check name, domain, app stores and CAC before any public use |

## 18. Open product decisions

1. Which Nigerian states and agency segments are the first launch focus?
2. Which CRM pipeline stages and appointment types should be defaults?
3. Which screening templates should ship as examples, and which checks require third-party integrations?
4. What maintenance approval thresholds and emergency rules are needed for the pilot?
5. Which tenant portal actions should be available in R1 versus R2?
6. Which metrics are essential for the first portfolio dashboard?
7. Which payment provider is suitable for virtual accounts, payment links and reconciliation?
8. Which rent-financing providers are properly authorised and commercially suitable?
9. Will tenant financing be introduced in the initial launch market or deferred until the core platform is stable?
10. What are the data retention periods for rejected applications, screening evidence, repair photos and communication history?
11. What subscription tiers and unit-based price points are acceptable to pilot customers?
12. What mobile offline actions are essential at launch, and which can wait?
13. Where do partner-provided virtual accounts settle: the agency's client account, the landlord's account, or a split, and who is the contracting party?
14. Is commission recognised on cash received (default) or on another basis for pilot agencies, and which tax lines apply?
15. Who holds caution deposits in practice (agency or landlord), and how should they appear in statements?
16. What receipt numbering format do pilot agencies expect (prefix, branch, year)?
17. How should identity be verified without storing sensitive identifiers (provider choice and legal basis)?
18. Which mobile OS versions must be supported at launch?
19. Which product name is final, after trademark, domain and CAC checks?

## 19. Glossary

- **Arrears:** rent or other charges that are overdue.
- **CRM pipeline:** internal stages used to track a prospect from first contact through follow-up and application.
- **Caution deposit:** refundable deposit subject to the lease and applicable rules.
- **Lead:** a prospective tenant or prospective customer handled by the agency.
- **Management mandate:** agreement describing the agency’s authority and financial terms for managing a property.
- **Remittance:** transfer of money due to a landlord after agreed deductions.
- **Screening template:** reusable, configurable sequence of checks and review steps for tenant applications.
- **Tenant self-service portal:** secure tenant-facing interface for tenancy information, documents, payments, maintenance and permitted requests.
- **Virtual account:** account number assigned through a payment provider to help identify incoming payments.
- **Work order:** approved, assigned unit of maintenance or repair work.
- **Client money:** funds held or collected on behalf of landlords, including caution deposits, kept distinct from agency income.
- **Cutover date:** the date from which the product becomes the system of record; opening balances are stated as at this date.
- **Provisional receipt:** an offline-issued receipt marked pending sync until the server assigns the official number.
- **Rent roll:** list of all units with tenant, rent, status and balance.
- **Settlement account:** the bank account into which a partner's virtual-account payments are settled.
- **Unit sheet:** an agency-controlled, non-public summary of a unit that staff can send to a prospect.

---

## Appendix A: Product naming

The working name Keyholder was replaced. The selected name is **Tenaville**, a blend of "tenant" and "ville" that suggests a community of tenants. It is easy to say and spell, and it reads as property-related straight away.

| Option | Assessment | Watch-outs |
|---|---|---|
| **Tenaville** (selected) | Descriptive, warm, easy to pronounce and spell. A preliminary search found no matching property-management software product | A Cyprus company of that name was struck off in 2022. "-ville" is common in names of housing estates, so confirm it is distinctive enough. The start of the name resembles an existing hygiene brand, so ask a trademark adviser about the risk |
| Assetville | Clear and professional | Reads as asset or investment tracking rather than tenancy. The .com was listed for sale |
| Estiville | Estate-related | Close to the surname Estivill, so it is easy to misspell |
| Estuville | No exact match surfaced in a preliminary search | Hard to say and spell, and the meaning is unclear |
| Tenura | Short and modern, echoes tenure and tenancy | Invented word with no descriptive pull; a preliminary search found no conflict |

These results are from preliminary searches only and do not confirm availability. Names beginning with "Rent" are crowded in software directories, so they are not recommended.

**Before using the name publicly:**
- Check the CAC business-name register and a trademark search in Nigeria.
- Check the .com, .ng and .com.ng domains, social handles and app-store listings.
- Say the name aloud to five agents and ask them to write it down, to test pronunciation and spelling.
