# 0004 — Append-only financial history

**Status:** Accepted
**Date:** 2026-10-24
**PRD:** §10.2, §10.15, RENT-4, LEDGER-8, risk table ("financial records are incorrect or manipulated")

## Context

Agencies hold landlords' money and tenants' deposits. Disputes surface months later: a tenant says they paid, a landlord questions a deduction. If a payment amount can be edited in place, the system cannot answer what was recorded, when, or by whom — and a staff member can quietly change history.

The PRD requires corrections through linked reversals and adjustments rather than silent overwrites, gapless non-reused receipt numbers, and immutable issued statements corrected by numbered revision.

## Decision

`payments`, `payment_allocations` and `landlord_ledger_entries` are append-only.

- Corrections are new rows that reference what they correct: a reversal, or an adjustment.
- No `UPDATE` that changes an amount; no `DELETE`. Enforced with database triggers and column grants, not only by convention.
- A charge's paid balance is derived from its allocations; any cached balance must be provable against them.
- Receipt numbers come from a server-side per-organisation sequence. Voided receipts keep their number. Numbers are never reused.
- Statements move draft → reviewed → issued. Issued is immutable; a correction is a numbered revision referencing the original.
- Every financial change writes an audit event with actor, time, before/after and the reason for any override.

## Consequences

- The system can always reconstruct what a tenant or landlord was told at any past moment — which is the only useful answer in a dispute.
- Reversal and adjustment are first-class user-facing operations, so the UI must make correcting a mistake straightforward. If it is painful, staff will find a way to edit, or stop recording in the system at all.
- Cost: balance queries read from allocations rather than a column, so they need deliberate indexing and a reconciliation job for any cache.
- Cost: more rows. Irrelevant at this scale compared to the trust it buys.

## Alternatives considered

**Mutable rows with an audit log alongside.** Rejected: the audit log becomes the real history while the primary table shows something else, and reconciling the two during a dispute is exactly the work this decision avoids. It also leaves the main table legitimately writable, which is the attack surface.

**Soft deletes.** Rejected: a soft-deleted payment still has to be explained, and "deleted" carries none of the information a reversal carries — who reversed it, when, and why.
