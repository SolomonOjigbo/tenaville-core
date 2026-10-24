# @tenaville/adapters

Provider integrations behind narrow ports. Full rationale in [provider adapters](../../docs/architecture/provider-adapters.md).

```
src/
├── messaging/   WhatsApp Business · SMS · email    R1
├── payments/    virtual accounts · links · webhooks R2
├── financing/   referral handoff · callbacks        R3
├── storage/     private buckets · signed URLs       R1
└── identity/    optional verification providers     R2+
```

## The contract

A port is a narrow TypeScript interface owned by this package. `@tenaville/core` depends on the port; the concrete provider is selected by configuration at the edge. No provider SDK type ever appears in domain code.

Adding a provider means implementing an existing port. If it requires widening the port, the port was modelled around the first provider rather than around the need.

## Why this package exists

Four of the PRD's named risks are provider risks: WhatsApp templates get rejected, messaging costs rise, a payment partner's terms change, a financing provider fails or changes terms. Each must be a configuration change with a blast radius that stops at one directory.

## Per-adapter constraints

**messaging** — explicit fallback order; WhatsApp template approval status tracked so a send against an unapproved template fails fast; message cost surfaced where the provider reports it (COMMS-8). The adapter reports delivery; the comms module stores it (COMMS-3). Consent decisions are made before a send is requested, not here.

**payments** — licensed partner only; Tenaville holds no customer funds (PRD §11). Signature verification, idempotency on provider event IDs, replay rejection. A provider event becomes a record first, then reconciles — with a review queue for ambiguous matches rather than a silent wrong guess (RENT-8, RENT-9).

**financing** — disabled by default behind `FEATURE_FINANCING_ENABLED`. Provider-neutral so a partner is replaceable (FIN-1). Tenaville never receives, pools, lends or holds proceeds (FIN-4). Only consented minimum data crosses, with consent and payload recorded (FIN-5). An approval never marks rent paid (FIN-8). Nothing in R1 or R2 imports this — ESLint blocks it.

**storage** — private buckets; access is a short-lived signed URL issued after an authorisation check at download time, never a long-lived or guessable URL (DOC-7). Upload type and size validation, malware scanning where supported (DOC-6).

**identity** — the port returns a **verification result**, not an identifier, so screening can be satisfied without storing a NIN or BVN (SCREEN-15). Providers onboarded only after security, legal, pricing and data-processing review (SCREEN-13).
