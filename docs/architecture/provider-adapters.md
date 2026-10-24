# Provider adapters

> PRD §13, COMMS-2, COMMS-8, RENT-8, FIN-1, SCREEN-13, §12 (Interoperability), risk table.

Four of the PRD's named risks are provider risks: WhatsApp templates get rejected, messaging costs rise, a payment partner's terms change, a financing provider fails. Each must be a configuration change, not a refactor. `packages/adapters` exists so that the blast radius of a provider change stops at one directory.

```
packages/adapters/src/
├── messaging/   WhatsApp Business · SMS · email
├── payments/    virtual accounts · payment links · webhooks   (R2)
├── financing/   referral handoff · status callbacks            (R3)
├── storage/     private buckets · signed URLs
└── identity/    optional verification providers                (R2+)
```

## The contract

A port is a narrow TypeScript interface owned by the adapter package. Domain code depends on the port; the concrete provider is selected by configuration at the edge. No provider SDK type ever appears in `packages/core`.

A new provider means a new implementation of an existing port. If adding one requires widening the port, the port was modelled around the first provider rather than around the need.

## Messaging

Three channels, one port, with an explicit fallback order (COMMS-8). Business-initiated WhatsApp messages require provider-approved templates, so the adapter tracks template approval status and a send against an unapproved template fails fast rather than silently. A failed WhatsApp send falls back to SMS or email. Where the provider reports message cost, it is surfaced to administrators.

Message metadata — recipient, template, send time, delivery status, related record — is stored by the comms module, not by the adapter (COMMS-3). The adapter reports; the domain remembers.

Consent matters at this boundary: operational tenancy messages and promotional messages are distinct, and opt-outs apply to the second (COMMS-6, CRM-12). The adapter is not where that decision is made — it is made in the comms module before a send is requested.

## Payments (R2)

Virtual accounts and payment links through a **licensed** partner. Tenaville does not hold customer funds (PRD §11).

The adapter verifies webhook signatures, enforces idempotency on provider event IDs, and rejects replays (RENT-8, §10.5). A provider event becomes a `ProviderPaymentEvent` record first, then is reconciled against tenants, units and charges — with a review queue for ambiguous matches (RENT-9). Auto-matching that guesses wrong silently is worse than a queue.

Partner-confirmed payments are labelled distinctly from manually recorded ones everywhere they appear (RENT-12, TENANT-3).

Where virtual-account money settles — the agency's client account, the landlord's account, or a split — is organisation configuration (LEDGER-11) and an open commercial decision (PRD open decision 13).

## Financing (R3)

Disabled by default and gated behind `FEATURE_FINANCING_ENABLED`. The adapter boundary is provider-neutral so a partner can be replaced without touching tenancy workflows (FIN-1).

Hard constraints, enforced here and in the financing module:

- Tenaville never receives, pools, lends or holds financing proceeds. Default design is direct provider-to-recipient settlement (FIN-4).
- Only consented minimum data crosses the boundary, with the consent, payload, provider reference and handoff time recorded (FIN-5).
- Financing status is stored and displayed separately from rent payment status. An approval never marks rent paid; only a confirmed, reconciled disbursement affects a charge (FIN-8, FIN-9).
- Callbacks are signature-verified, idempotent, replay-protected and audited (FIN-7).

Nothing in R1 or R2 may import from this adapter.

## Storage

Private buckets only. Access is a time-limited signed URL issued after an authorisation check at download time — never a long-lived or guessable URL (DOC-7). Upload validation on type and size, with malware scanning where the provider supports it (DOC-6).

## Identity (R2+)

Optional verification providers, onboarded only after security, legal, pricing and data-processing review (SCREEN-13). The port deliberately returns a **verification result** rather than an identifier, so the system can satisfy screening without storing a NIN or BVN (SCREEN-15).
