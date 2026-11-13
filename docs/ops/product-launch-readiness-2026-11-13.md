# Tenaville — Product-to-Market Launch Readiness

**Review date:** 12 November 2026
**Revision reviewed:** `1620281` (P0 hardening)
**Review basis:** code, migrations, tests, CI, documentation and live QA checks against the hosted Supabase project. The P0 hardening migration was applied to production on 12 November 2026. No external penetration test, load test, accessibility audit or pilot has been run.

## Verdict

> **NOT LAUNCH-READY — 57 / 100**
>
> The web R1 core is substantial and the six remaining P0 web gaps have been closed. The launch programme is still incomplete: there is no mobile app, outbound messaging is simulated, subscription billing has no gateway, migration/export is incomplete, and production operations, security assurance and legal gates are open.

| Readiness band | Score            | Meaning                                                |
| -------------- | ---------------- | ------------------------------------------------------ |
| 85–100         | Launch-ready     | Can launch to paying customers with routine monitoring |
| 70–84          | Pilot-ready      | Can run a controlled pilot with named exceptions       |
| 50–69          | Not launch-ready | Strong core, material launch gaps                      |
| 0–49           | Foundational     | Product cannot yet support the target workflow         |

**Recommended posture:** Do not schedule a public launch. A controlled, web-only design-partner pilot is defensible only if mobile, outbound messaging and gateway billing are explicitly removed from the pilot contract, and backup/restore, data export, counsel-reviewed legal notices and support ownership are closed first.

## Score sheet

| #   | Area                                           |  Weight | Score /10 |            Weighted | Why this score                                                                                                                                                                                                                             |
| --- | ---------------------------------------------- | ------: | --------: | ------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Web product coverage (R1 workflows)            |      20 |         9 |                 180 | 70 page files cover portfolio, tenancy, money, ledger, statements, reports, maintenance, portals, comms, documents, devices and billing. The six P0 web gaps are implemented; the operational report set remains incomplete.               |
| 2   | Data, security and financial integrity         |      15 |         9 |                 135 | RLS on every table, 24 pgTAP files / 474 assertions, append-only financial records, gapless receipts, audited approvals, evidence links and private storage. Independent security testing is still missing.                                |
| 3   | Web UX, accessibility and responsiveness       |      10 |         8 |                  80 | Responsive shell, 44px controls, print views, contextual deposit/handover/media actions, error/loading/not-found boundaries and empty states. No automated accessibility audit or browser E2E suite.                                       |
| 4   | Mobile app (R1)                                |      15 |         1 |                  15 | `apps/mobile` contains only a theme file and empty feature/offline folders. Typecheck passes because there is nothing to typecheck. No screens, auth, offline queue, provisional receipts, device lock or push.                            |
| 5   | Communications, reminders and tasks            |      10 |         4 |                  40 | Templates, message log, delivery attempts, fallback order, task queue, preferences, reminder generation and in-app tenant notices exist. The only outbound provider is a logging stub; reminders are manual and there is no inbound queue. |
| 6   | Billing and monetisation                       |      10 |         6 |                  60 | Plans, entitlements, upgrades/downgrades, downgrade guards, invoices, overage lines and manual payments work. No Nigerian payment gateway/checkout, subscription receipts, dunning or preserved export access.                             |
| 7   | Migration and onboarding                       |       5 |         3 |                  15 | Property/unit import framework exists in the backend. No import UI, no tenant/lease import, no opening balances, no dry-run/rollback UI and no organisation data export.                                                                   |
| 8   | Reliability, operations and security assurance |       8 |         3 |                  24 | CI covers format, lint, typecheck, tests, RLS and traceability structure. No staging deploy, build/deploy job, observability, error tracking, uptime monitoring, backup/restore drill, incident process or pen test.                       |
| 9   | Legal and compliance                           |       5 |         3 |                  15 | Draft privacy, terms, processor, data-request, messaging, client-money and name/trademark pages exist. Counsel review, name/trademark/domain clearance and regulatory sign-off remain open.                                                |
| 10  | Release evidence, GTM and support              |       2 |         3 |                   6 | This report is refreshed and public legal pages exist. README, traceability and backlog status remain stale; no public pricing, support channels, SLAs or status page.                                                                     |
|     | **Total**                                      | **100** |           | **570 / 1000 → 57** |                                                                                                                                                                                                                                            |

## Launch blockers

1. **No staff mobile app.** R1 requires native iOS/Android with offline capture, provisional receipts, visible sync state, device protection, low-data uploads and push. None exists. This alone prevents meeting the R1 exit criteria.
2. **Outbound messaging is not real.** `createLoggingProvider()` reports success without contacting WhatsApp, SMS or email. In-app tenant notices now work, but the message log can still say “sent” when nobody was messaged, and there is no scheduled job runner.
3. **Subscription billing has no gateway.** Invoices and manual payment recording are implemented; BILL-2's gateway, checkout and subscription receipts are not. There is no way for a new customer to pay Tenaville from the product.
4. **Migration, opening balances and export are missing.** There is no tenant/lease import, cutover opening balances, dry-run/rollback UI or organisation-wide export. The pilot exit criteria explicitly require opening balances to reconcile and staff to export organisation data.
5. **Production operations are absent.** No staging/deployment configuration, no error tracking or uptime monitoring, no backup/restore test, no incident/support process, no status page and no security testing.
6. **Legal and compliance gates are open.** Draft policy pages are published, but counsel review, product name/trademark/domain clearance, client-money treatment, WhatsApp business policy, payment licensing and consumer transparency remain unresolved.

## Checklist — done and verified

- [x] Organisation creation for agency/individual landlord, owner membership and organisation-wide assignment
- [x] Email verification, password reset and staff invitations
- [x] Roles, permission catalogue and property/portfolio-scoped access
- [x] Row-level security on every table, with CI isolation tests
- [x] Audit trail with before/after, reasons, document access and approval events
- [x] Landlords, remittance details, management mandates and commission terms
- [x] Properties and units with statuses; no public marketplace exposure
- [x] Tenants, direct lease creation, activation, renewal and historical preservation
- [x] Rent schedule generation and charge persistence
- [x] Payment recording, allocation, part-payment handling, overpayment credit rows, gapless receipts and reversals
- [x] Daily cash-up, arrears ageing, rent roll and collections reports with CSV export
- [x] Landlord ledger with client funds versus agency income, commission posting and remittances
- [x] Statements with draft → reviewed → issued, revisions, immutability and landlord visibility
- [x] Maintenance requests, assignment, vendors, timeline, costs, approvals, completion and tenant confirm/reopen
- [x] Maintenance photo/document attachments for staff and tenants, plus in-app tenant status notices
- [x] Landlord-borne maintenance costs post to the ledger; tenant-borne costs create repair charges
- [x] Landlord portal: portfolio, statements, repairs/approvals and documents
- [x] Tenant portal: tenancy, rent schedule, receipts, maintenance, messages, notices and documents
- [x] Message templates, message log, delivery attempts, fallback order and task queue
- [x] Notification preferences with separate operational and marketing consent
- [x] Document registry, private upload, short-lived download links, document access audit and ledger evidence
- [x] Document expiry task generation
- [x] Billing plans, entitlements, plan changes, downgrade guards, invoices, overage lines and manual payments
- [x] Device/session register, remote sign-out, sign-out everywhere and 30-day idle expiry
- [x] Property photo upload with private gallery and short-lived signed URLs
- [x] Lease move-in/move-out handover records with condition notes, meter readings, balances and key status
- [x] Lease termination with recorded date/reason, unit release and tenant notice
- [x] Full deposit lifecycle UI: receipt, deductions, approval, refund/forfeit/transfer settlement and tenant notification
- [x] CI: format, lint, typecheck, unit/integration tests, RLS tests and traceability structure
- [x] Current verification: 24 database test files / 474 assertions, 153 core tests, 103 web tests and a passing production build
- [x] Live hosted checks across receipts, statements, maintenance, communications, documents, plan changes, invoices, download auditing and the P0 hardening migration

## Checklist — partial

- [~] **ORG-2 / ORG-9:** email verification, invitations, password reset, device list, remote sign-out and idle session expiry exist; phone verification and account-recovery runbooks remain.
- [~] **PROP-1 / PROP-2:** properties, units and photo galleries exist; facilities editing, property/unit edit and archive remain.
- [~] **PROP-4:** import mapping/validation/apply exists in the backend; there is no import screen and no tenant/lease import.
- [~] **LEASE-6:** lease expiry is derived and reminder tasks can be generated; configurable 90/60/30 alerts are not scheduled or configurable in the UI.
- [~] **RENT-14:** part payments and credit rows are handled; applying credit to a future charge is explicitly deferred.
- [~] **MAINT-2 / MAINT-10 / MAINT-12:** contextual photo/media works and in-app tenant notices are sent; outbound WhatsApp/SMS/email delivery is still simulated.
- [~] **AN-1:** rent roll, arrears and collections are reported; occupancy, lease-expiry and maintenance-queue report views are not all in the report set.
- [~] **COMMS-2 / COMMS-6 / COMMS-8:** provider interface, fallback order, preferences and WhatsApp approval state exist; only a logging provider is wired, with no rate limits, scheduled sends, template-status sync or inbound inbox.
- [~] **DOC-1 / DOC-3 / DOC-6:** registry, signed downloads and access audit work; screening-application attachment, generated PDFs and malware scanning remain incomplete.
- [~] **BILL-2 / BILL-4:** invoices and manual payments work; gateway checkout, subscription receipts, dunning and export-preservation are absent.
- [~] **MIG-1 / MIG-2 / MIG-3 / MIG-5:** no tenant/lease import, opening balances, dry-run/rollback UI or organisation data export.
- [~] **LEGAL:** draft privacy, terms, processor, data-request, messaging, client-money and name/trademark pages are published; counsel review and formal clearance remain.
- [~] **Mobile:** only the workspace scaffold exists.

## Checklist — not done

- [ ] Native iOS/Android staff app, offline write queue, client-generated ids, provisional receipts, visible sync/retry, device lock/encrypted cache, image compression and push notifications (MOB-1, MOB-3…MOB-8)
- [ ] Real WhatsApp Business, SMS and email providers with webhooks, template approval sync, rate limits and cost reporting (COMMS-2, COMMS-6, COMMS-8)
- [ ] Scheduled background jobs for rent, lease, maintenance and document reminders (RENT-6, LEASE-6, COMMS-5)
- [ ] Subscription payment gateway/checkout, gateway receipts and dunning (BILL-2)
- [ ] Tenant/lease import, opening balances, import dry-run/rollback and full organisation export (MIG-1, MIG-2, MIG-3, MIG-5, BILL-4)
- [ ] Production/staging deployment, observability, error tracking, uptime and job monitoring, backup/restore drill, incident response and support/status channels
- [ ] Penetration test, dependency-update cadence, load/performance test, browser E2E suite and accessibility audit
- [ ] Public pricing, onboarding runbook, support SLAs and launch communications
- [ ] Counsel sign-off and clearance for privacy, processor, client-money and messaging policies; product name/trademark/domain clearance

## R1 exit-criteria assessment (PRD §16.2)

| Criterion                                                    | Status           | Evidence                                               |
| ------------------------------------------------------------ | ---------------- | ------------------------------------------------------ |
| At least 3 pilot agencies through a month-end cycle          | Not met          | No pilot run                                           |
| Core records maintained without spreadsheets                 | Partial          | Web flows exist; import/opening balances absent        |
| Statements accepted without material manual correction       | Not demonstrated | Statements built and live-checked, no pilot acceptance |
| Maintenance requests assigned, updated and closed with audit | Met              | Implemented and live-checked                           |
| Tenant portal limited to correct tenant/lease                | Met              | RLS and pgTAP cover tenant/landlord isolation          |
| Offline actions sync without duplicates                      | Not met          | No mobile app                                          |
| No open critical security or isolation defects               | Partial          | Strong RLS/audit, no pen test                          |
| Backup restoration tested                                    | Not met          | No backup/restore runbook or drill                     |
| Staff can export organisation data                           | Not met          | Report CSVs only, no organisation export               |
| Opening balances reconcile at cutover                        | Not met          | No opening-balance import                              |
| Receipt numbering has no gaps, duplicates or reuse           | Met              | Gapless counter and database tests                     |
| Automated isolation tests pass in CI every release           | Met              | `tenant-isolation` job                                 |
| Offline payment sync tested with interrupted/repeated sync   | Not met          | No mobile app                                          |

## Evidence reviewed

- 24 SQL migrations and 24 pgTAP test files (474 assertions)
- 70 web page files and two versioned API route handlers
- 153 core unit tests and 103 web tests; mobile has no tests and no screens
- CI jobs for format, lint, typecheck, tests, cross-tenant isolation and requirement/backlog structure
- Compliance register (open items), operations README, release plan and R1 exit criteria
- Live hosted checks from the document, billing, maintenance, comms, rent, statement and P0 hardening slices
- Production migration ledger includes `20261104100000_p0_hardening`; notifications, deposit settlement, lease termination and device-session columns verified in production

## Documentation drift

The implementation has moved well beyond the written release record:

- `README.md` still says “pre-implementation … no feature code yet”.
- `backlog-mapping.md` says 8 tickets done, 120 todo and “no user interface exists”.
- `traceability.md` summary says 0 of 194 requirements done.
- `backlog.json` still has 127 todo tickets and 6 partial, despite the web R1 surface now existing.

**This is a launch-readiness defect in its own right.** An external reviewer, pilot agency or investor cannot rely on the repository's own status. Close the launch should include refreshing traceability/backlog status for every shipped requirement and recording known exceptions.

## Recommended path to launch

1. **Decide launch scope explicitly.** Either build mobile R1 or re-baseline launch to a web-only pilot with contractual scope removal. Do not claim R1 complete while mobile is absent.
2. **Make messaging real.** Wire one production provider per channel, add scheduled reminder jobs, surface “logged, not delivered” honestly until then, and add rate-limit/consent enforcement. In-app notices are not a substitute for outbound delivery.
3. **Close billing.** Add a licensed Nigerian payment path for subscriptions, gateway receipts, webhook reconciliation and dunning; otherwise launch as invoice-only by explicit commercial decision.
4. **Close migration and export.** Build tenant/lease import, opening balances, dry-run/rollback and organisation data export. These are pilot exit criteria, not polish.
5. **Make production operable.** Staging, deploy pipeline, error tracking, uptime/job monitoring, backup/restore drill, incident response, support ownership and status page.
6. **Clear the legal register.** Counsel review of the draft notices, name/trademark/domain clearance, client-money treatment, messaging policy, payment licensing and consumer copy.
7. **Test adversarially.** Penetration test, dependency cadence, load test, browser E2E and accessibility audit; fix critical/high findings before pilot.
8. **Run a controlled pilot.** Three agencies, one full month-end cycle, offline/payment/receipt/statement acceptance and documented exceptions before a public launch decision.

## Decision

**No public launch.**  
**Conditional web-only pilot:** possible after items 2–7 above are closed or formally accepted as pilot exceptions.  
**R1 product readiness:** strong web core, not a complete R1 product without mobile.
