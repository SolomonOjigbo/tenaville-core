# 0005 — Server-authoritative offline sync

**Status:** Accepted
**Date:** 2026-10-24
**PRD:** MOB-3, MOB-4, MOB-5, §10.16, §12 (Offline operation), §16.2, §4.4 (zero duplicate payments target)

## Context

Agents and caretakers collect rent and log repairs on site, frequently without a usable connection. The app must accept those writes offline. But a payment is a ledger event, and the PRD forbids last-writer-wins for payments, allocations and ledger entries, requires client-generated IDs with idempotent sync, and sets a pilot target of zero duplicate payments or receipts.

## Decision

Offline capture is allowed for maintenance notes and photos, tasks, inspections (R2) and payment records. Allocation overrides, reversals, ledger entries and statements require connectivity.

For every offline write:

- A **client-generated UUID** is the idempotency key for the record's whole lifetime. A repeated sync of the same UUID returns the original result instead of creating a second record.
- Financial writes are validated against current server state on sync and **never overwrite** it. A rejected write becomes `failed` with the server's reason, stays visible, and waits for a human.
- A payment captured offline prints a receipt marked **pending sync** with no official number. The server assigns the sequential number on sync, and only then is the tenant notified.
- Sync state (`pending`, `syncing`, `synced`, `failed`) is visible per record with a reachable retry. A failed write is never silently discarded.
- Non-financial writes may merge: an offline maintenance note is appended to the timeline, not substituted for server content.

## Consequences

- An agent can always answer "did that payment go through?" from the app.
- A tenant is never told their rent is receipted before the server agrees.
- Cost: two receipt states (provisional and official) in the UI, the printed output, and the tenant notification path. This complexity is the requirement, not an accident of the design.
- Cost: the failure path needs a real resolution surface. Records that sit `failed` with nowhere to go will be ignored, and ignored failures are lost rent.
- Testing is specified by the exit criteria: interrupted syncs, repeated drains, two devices for one actor, a lease changed server-side between capture and sync, and a revoked session draining a queue.

## Alternatives considered

**CRDTs or last-writer-wins across the board.** Rejected: explicitly forbidden for financial records, and the semantics are wrong — two devices recording a payment are two payments or one duplicate, and only the server knows which.

**Online-only payment recording.** Rejected: it removes the single workflow that most justifies the native app. Agents collect money where there is no signal.

**Device-assigned receipt numbers from a reserved block.** Rejected: blocks go unused when a device is lost or reset, producing exactly the numbering gaps RENT-13 and the exit criteria forbid.
