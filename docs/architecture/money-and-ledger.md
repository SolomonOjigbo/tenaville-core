# Money, ledger and financial integrity

> PRD §10.1–10.5, §10.15, §10.17, RENT-_, LEDGER-_, LEASE-13, §16.2 exit criteria.

Agencies hold other people's money. The PRD's risk table names "financial records are incorrect or manipulated" as a trust-and-disputes risk, and the launch exit criteria require landlord statements accepted without material manual correction, and receipt numbering with no gaps, duplicates or reuse. Everything below exists to make those outcomes structural rather than careful.

## Amounts

Naira is stored as **integer kobo** in Postgres `bigint`. No `numeric` with scale, no float, no currency string.

All arithmetic goes through `@tenaville/money`. Allocation across charges is where rounding errors become disputes — splitting ₦1,000,000 across three charges must lose nothing — so the split logic lives in one tested place rather than at each call site.

## Append-only history

Payments, payment allocations and landlord ledger entries are never amended in place and never deleted (§10.2, RENT-4). A correction is a new, linked row: a reversal that references what it reverses, or an adjustment that references what it adjusts. The history of what was recorded, when and by whom survives the correction — which is the point, because the dispute arrives months later.

Practically: no `UPDATE` touching an amount column, no `DELETE` on these tables. Enforce with database triggers and column grants, not only with code review.

## Derived balances

A charge's paid balance is **derived from its allocations** (§10.4). It may be cached for query performance, but the allocations remain the source of truth and a reconciliation job must be able to prove the cache correct. A stored balance that can drift from its allocations is how a tenant gets chased for rent they paid.

Default allocation is oldest charge first, with a permissioned manual override (RENT-14). Part payments, overpayments and tenant credit all fall out of this rule — credit is an unallocated balance, not a negative charge.

## Receipt numbering

Sequential per organisation, per branch where configured (RENT-13). Numbers are allocated by the server from a `ReceiptSequence`, never by a client. Voided or reversed receipts keep their number; numbers are never reused.

This interacts with offline capture: an offline payment gets a provisional receipt marked _pending sync_, and the official number is assigned on sync (MOB-4). See [offline sync](offline-sync.md).

Pilot agencies expect a particular format — prefix, branch, year (PRD open decision 16) — so the format is configuration, while the sequence guarantee is not.

## Client funds versus agency income

Separated in the data model, the permissions and the reports (LEDGER-4). Rent collected for a landlord and caution deposits are client funds; commission and fees are agency income. A single table with a "type" column that reports filter on is not sufficient — the distinction has to be visible in the schema so that a query written in a hurry cannot blend them.

Caution deposits have their own lifecycle: recorded as client funds, held, deducted at move-out with evidence and approval, then refunded or transferred with a ledger entry (LEASE-13). Who actually holds deposits in practice is a PRD open decision (15) that affects how they appear in statements.

## Statements

Statements move through draft → reviewed → issued (LEDGER-8). An issued statement is immutable; a correction is a numbered revision referencing the original. A landlord who received a PDF must be able to reconcile it against what the system says today.

Commission is recognised when rent is received by default, with the basis set in the management mandate (LEDGER-9). Tax lines — VAT on commission, withholding tax on rent — are configurable and **off by default** until validated with a tax adviser (LEDGER-10).

## Idempotency

Payment records, provider webhooks and any retryable operation must not create duplicates (§10.5). Client-generated IDs for offline writes, provider event IDs for webhooks, and a uniqueness constraint that makes the duplicate impossible rather than unlikely.

## Dates

Contractual due dates are **calendar dates**, not timestamps (§10.6). A rent due date of 1 April is 1 April regardless of the reader's timezone. Audit and event timestamps are `timestamptz` in UTC, displayed in West Africa Time.

## Daily cash-up

Per user and per payment method, for reconciliation against bank and cash (RENT-15). This is the control that catches a mis-keyed amount the same day instead of at month end, so it is R1 rather than a reporting nicety.

## Opening balances

Agencies arrive with existing arrears and landlord balances. Opening entries are imported at a chosen cutover date, labelled as opening entries, and frozen once the cutover is confirmed (MIG-2, RENT-16). A launch exit criterion is that each pilot agency's imported opening balances reconcile to their own records.
