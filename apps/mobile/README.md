# @tenaville/mobile

Expo (React Native) app for agency staff doing field work — the surface caretakers, agents and managers use on a phone, often on a poor connection.

Staff only. Landlords and tenants use responsive web in R1 (PRD TENANT-14).

## Scope

R1 (MOB-1, MOB-3…MOB-8): record a payment and issue a receipt, view tenants and arrears, log and update maintenance with photos, work tasks and follow-ups, offline capture with visible sync state, device lock, low-data operation, push notifications.

R2 (MOB-2): inspection checklists with photos, notes and meter readings.

## Layout

```
src/app/        expo-router screens
src/features/   payments · arrears · maintenance · tasks · inspections
src/offline/    write queue, client-generated IDs, idempotent sync, conflict surfacing
src/lib/        Supabase client, secure storage, image compression, push registration
```

## Offline rules — read before touching `src/offline/`

These are correctness requirements from PRD MOB-3…MOB-5 and §10.16, and the pilot exit criteria test them directly (§16.2).

1. **The server is authoritative for money.** Last-writer-wins is not permitted for payments, allocations or ledger entries.
2. **Client-generated IDs.** Every offline record carries a UUID generated on the device, so a retried sync is recognised as the same write rather than creating a duplicate.
3. **Provisional receipts.** An offline payment prints a receipt clearly marked *pending sync*. The official, sequential receipt number is assigned by the server on sync (RENT-13), and the tenant is notified at that point — not before.
4. **Sync state is visible per record** — pending, synced, failed — with a retry the user can reach. A failed write is never silently discarded.
5. **Revocation wipes the cache.** Remote session revocation clears locally cached data (MOB-6).

A duplicate payment or a reused receipt number is a launch blocker, not a bug to triage later.
