# @tenaville/ui

Design tokens and shared primitives.

```
src/
├── tokens/tokens.json   the source of truth, from the Tenaville UI kit
├── tokens/tokens.css    CSS variables as R G B channels: light, dark, system
├── tokens.ts            typed, platform-neutral re-export
├── native/theme.ts      React Native light and dark themes (imports nothing)
└── index.ts             web primitives, added as screens are built

tailwind/tailwind.preset.cjs   Tailwind 3.4+ preset keyed to the CSS variables
```

## Three representations, one palette

The kit ships the same colours three times: `tokens.json`, the CSS variables the
web uses, and the React Native themes. They will drift, so
`src/__tests__/tokens.test.ts` asserts all three agree on every semantic role in
both schemes. It also checks that the spacing, radius and touch-target scales
match, and that money uses tabular figures — proportional digits make a column
of naira amounts impossible to scan, and a rent roll is read as a column.

Colours are stored as space-separated R G B channels rather than hex so
Tailwind's opacity modifiers resolve against them: `bg-primary/10` works off
`--tv-primary`. `cssColor('primary', 0.1)` builds the same reference in
TypeScript.

## Consuming it

Web: import `@tenaville/ui/tokens.css` once in the root layout, add
`presets: [require('@tenaville/ui/tailwind')]` to the Tailwind config, and set
`data-theme="dark"` on `<html>` for an explicit dark choice. Omitting the
attribute follows the device.

Mobile: `useTenavilleTheme()` in `apps/mobile/src/lib/theme.ts`. The themes
themselves live here and import nothing from react-native, which is what lets
the drift test read them from node and keeps react-native out of the web build.

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
