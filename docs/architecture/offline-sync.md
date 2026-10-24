# Offline sync

> PRD MOB-3–MOB-5, §10.16, §12 (Offline operation), §16.2 exit criteria, risk table.

Caretakers and agents work on site, often with poor connectivity. The staff app must accept work offline — but a payment captured offline touches the ledger, and the PRD is unambiguous that financial records are server-authoritative and last-writer-wins is not allowed.

## What works offline

| Capability | Offline | Why |
|---|---|---|
| Maintenance notes and photos | Yes | Captured on site; no financial effect (MOB-3) |
| Tasks and follow-ups | Yes | Field work queue (MOB-3) |
| Payment records | Yes, provisional | Agents collect rent on site; the record is provisional until sync (MOB-4) |
| Receipt issue | Provisional only | Official number is server-assigned (RENT-13, MOB-4) |
| Inspections with photos and meter readings | Yes (R2) | MOB-2 |
| Allocation overrides, reversals, ledger entries, statements | No | Require server state and permission checks that cannot be evaluated offline |

Reads are cached for lists the agent needs in the field — assigned tenants, arrears, open jobs — paginated and compressed (MOB-7).

## The write queue

Every offline write enters a local queue with:

- a **client-generated UUID**, created on the device, which is the idempotency key for the whole lifetime of that record;
- the actor, the device, and the capture timestamp;
- a sync state: `pending`, `syncing`, `synced`, `failed`.

On connectivity, the queue drains in capture order. The server treats a repeated client UUID as the same write and returns the original result rather than creating a second record. A retried sync after a timeout — the common case on a bad connection — must therefore be safe by construction, not by hoping the first attempt failed.

## Provisional receipts

An offline payment prints a receipt clearly marked **pending sync**. It carries no official receipt number. On sync:

1. The server validates the payment against current state (the lease exists, the charge is open, the actor may record payments).
2. The server assigns the official sequential receipt number (RENT-13).
3. The tenant is notified **at that point** — not at capture time, because the record is not yet authoritative.
4. The device updates the record to `synced` and shows the official number.

Telling a tenant their rent is receipted before the server has confirmed it is the mistake this flow exists to prevent.

## Conflicts and failures

**Financial writes never overwrite server state.** If the server rejects a synced payment — the lease was terminated, the charge was already settled, the actor's permission was revoked — the write moves to `failed` with the server's reason, stays visible on the device, and surfaces for a human to resolve. It is never silently dropped (MOB-5).

**Non-financial writes may merge.** A maintenance note captured offline is appended to the activity timeline; it does not replace server content. Photos upload resumably (MOB-7).

Sync state is visible per record with a retry the user can reach. An agent must always be able to answer "did that payment go through?" from the app.

## Device protection

PIN or biometric lock, encrypted local storage, and remote session revocation that wipes the local cache (MOB-6). A lost phone in the field must not expose a portfolio's arrears.

## Testing

The PRD's exit criteria name this directly: offline payment recording is tested with **interrupted and repeated syncs** and produces no duplicate payments; offline-capable actions sync without duplicates and clearly show failed and pending state.

So the test suite must include: sync interrupted mid-request, the same queue drained twice, a queue drained from two devices for the same actor, a payment whose lease changed server-side between capture and sync, and a revoked session attempting to drain a queue.

The pilot target is zero duplicate payments or receipts (PRD §4.4).
