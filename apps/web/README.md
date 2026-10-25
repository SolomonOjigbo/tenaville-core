# @tenaville/web

Next.js App Router application serving three audiences plus the API the mobile app consumes.

## Why one app for three audiences

Staff, landlords and tenants see the same records through very different permissions. Keeping them in one Next.js app with separate route groups means the authorisation check is written once in `src/server/` and applied at the layout boundary of each group, rather than duplicated across three deployments that could drift.

Landlords and tenants are responsive web in R1 — not native (PRD TENANT-14). Native tenant and landlord apps are P2 and only if pilot data justifies them.

## Layout

```
src/app/
├── (auth)/       sign in, invitation acceptance, recovery           ORG-2, ORG-9
├── (staff)/      agency console — the main surface
├── (landlord)/   read-only portfolio, statements, repair approvals  OWN-3, OWN-4, OWN-6
├── (tenant)/     tenancy, balance, receipts, repairs, documents     TENANT-1…9
└── api/
    ├── v1/       versioned route handlers; the mobile app's only server contract
    └── webhooks/ payments, messaging delivery, financing callbacks

src/server/       session, role resolution, organisation scoping, audit helpers
src/lib/          Supabase browser/server clients, formatting, feature flags
src/components/   app-specific composition over @tenaville/ui primitives
```

## What exists (TV-007)

The shell, not the screens. Authorisation resolves once at the `(staff)` layout
boundary, so a page inside that group can assume a staff viewer — which is the
reason all three audiences live in one app rather than three.

- **Navigation is derived from the permission catalogue**, not a per-role list.
  A caretaker is never sent a Ledger link that the policy would then refuse, and
  landlords and tenants get no staff navigation at all: a landlord legitimately
  holds `maintenance.read` because OWN-4 has them approving repairs, and that
  belongs in their own portal rather than the agency sidebar.
- **Theme** follows the device unless the user chooses. The choice is stamped by
  an inline script before first paint, so the page does not render light and
  then flip.
- **Components**: layout, cards, buttons, badges with status tones, money,
  stats, empty states, labelled form controls and a self-scrolling table.
- **`/design`** renders the whole system in both themes, development only. A
  written specification cannot settle whether a badge reads correctly in dark
  mode; this can.

Verified at desktop and 375px with no horizontal page overflow, and the palette
is checked for WCAG AA contrast in `@tenaville/ui`.

Not built: authentication (TV-003), so the shell shows its signed-out state in
development; private file storage (TV-014), so photos cannot be served; and the
screens for each area.

## Rules

- Route handlers validate input with `@tenaville/validation` and delegate to a `@tenaville/core` use case. Business rules do not live in `src/app/`.
- Every handler resolves the caller's organisation from the session and relies on RLS as the second line of defence — never as the only one, and never bypassed with the service-role key for a user-initiated read.
- `api/v1` is versioned because the mobile app ships on store timelines and cannot be deployed in lockstep (PRD MOB-9).
- Webhook handlers verify signatures, are idempotent, and tolerate replay (PRD §10.5).
- Tenant and landlord routes must never be able to reach another organisation's records — covered by the isolation suite in `@tenaville/db`.
