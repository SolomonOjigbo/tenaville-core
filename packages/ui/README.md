# @tenaville/ui

Design tokens and shared primitives.

```
src/
├── tokens.ts   colour, spacing, type scale — platform-neutral values
└── index.ts    web primitives (React DOM)
```

## Split by platform

`tokens.ts` holds plain values — no DOM, no React Native imports — so both `apps/web` and `apps/mobile` can consume it. Components in `index.ts` are web-only; React Native cannot render them, and the mobile app builds its own primitives from the same tokens.

Attempting one component library across React DOM and React Native would mean both platforms getting the worse version of every primitive.

## What the PRD asks of the UI

- **Field-usable on a phone.** Core staff workflows usable with one hand where practical; caretakers work on site, one-handed, outdoors (§12 Mobile usability, principle 6).
- **Low data.** Compressed images, paginated lists, resumable uploads (MOB-7, TENANT-15).
- **Common screens under 2 seconds** on a typical mobile connection (§12 Performance).
- **Accessible.** Clear labels, keyboard support on web, readable contrast, accessible form validation (§12 Accessibility). Tenant-facing copy is plain language with clear error and retry behaviour (TENANT-15).
- **Money is unambiguous.** Amounts are formatted through `@tenaville/money`, never by a component. A provisional receipt reads as provisional, and a recorded payment never looks like a confirmed one (RENT-12, MOB-4).

## Brand

Wordmark and assets in [`brand/`](../../brand). "Tenaville" is a working name pending trademark, CAC and domain checks (PRD Appendix A) — keep it in content and configuration, not baked into component names.
