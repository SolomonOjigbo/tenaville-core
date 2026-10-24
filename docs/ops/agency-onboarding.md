# Agency onboarding and cutover

> PRD §8.17 (MIG-1…5), RENT-16, §16.2 exit criteria, risk table ("migration of existing records is slow or error-prone").

Every agency arrives with existing tenants, leases, arrears and landlord balances in spreadsheets, notebooks and bank alerts. The PRD names slow or error-prone migration as the risk that prevents agencies switching at all — so this is a product capability, not a support activity.

## The cutover model

A **cutover date** is the date from which Tenaville becomes the system of record. Balances are stated as at that date.

1. **Portfolio import** — properties and units from the spreadsheet template, with row-level validation and an error report (PROP-4).
2. **Tenancy import** — tenants, leases and current charges (MIG-1).
3. **Opening balances** — tenant arrears and credits, and landlord ledger balances, as at the cutover date (MIG-2, RENT-16).
4. **Reconciliation** — the agency confirms imported balances against their own records. This is an exit criterion: imported opening balances must reconcile for every pilot agency.
5. **Cutover confirmed** — opening entries are frozen and can no longer be edited. From here, corrections are ordinary reversals and adjustments.

## Non-negotiables

- **Dry run first.** Every import shows exactly what will be created before anything is created (MIG-3).
- **Rollback.** A completed import batch can be rolled back as a unit (`ImportBatch`). An agency that imported the wrong spreadsheet must not have to start a fresh account.
- **Opening entries are labelled.** They are visibly opening balances, not ordinary transactions, so a statement reader can tell what predates the system.
- **Frozen after confirmation.** Editable opening balances make every subsequent statement unverifiable.
- **Export always available.** Administrators can export all organisation data in documented formats at any time (MIG-5), including while a subscription is unpaid (BILL-4).

## Activation target

PRD §4.4: an agency imports 10 or more units and records a lease or payment within 7 days of signup. If import is hard, this target is missed and the agency goes back to spreadsheets.

## Assisted import (R2)

MIG-4 adds an onboarding checklist, sample templates, and an optional assisted-import service for larger agencies. Until then, onboarding a pilot agency is a hands-on exercise — which is useful, because it reveals exactly where the self-service templates need to be better.
