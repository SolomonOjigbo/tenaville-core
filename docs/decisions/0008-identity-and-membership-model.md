# 0008 — One identity per person, authority through membership

**Status:** Accepted
**Date:** 2026-10-24
**PRD:** ORG-1, ORG-2, ORG-3, ORG-4, ORG-8, OWN-3, TENANT-1, §14 (`PortalAccount`)
**Supersedes the open question in:** [ADR 0002](0002-supabase-postgres-rls.md)

## Context

ADR 0002 left one question open: are landlord and tenant portal users Supabase Auth users with narrow policies, or a separate `PortalAccount` linkage as the PRD data model suggests? R1 step 1 cannot be built without answering it, because every policy depends on how a caller is identified.

Three constituencies reach the product: agency staff, landlords, and tenants. They see the same records under very different authority. A landlord may also be a landlord at a second agency. A former tenant may later be a staff member.

## Decision

**One Supabase Auth user per person.** `public.users` mirrors `auth.users` and is not organisation-scoped.

**Authority comes from `memberships`**: one row per (organisation, person) carrying a role from the `app_role` enum and a status. A person may hold memberships in several organisations — a landlord with properties under two agencies is a real case, not a hypothetical.

**There is no separate portal account.** Landlord and tenant are roles in the `app_role` enum, not a parallel identity system.

**`app.current_organisation_ids()` is the isolation boundary.** Every policy restricts rows to the organisations where the caller has an _active_ membership. Role authority is a second, separate question answered by `app.has_role`.

**Permissions are code, not rows.** `packages/core/src/modules/org/domain/roles.ts` holds the role-to-permission catalogue. This is a deliberate deviation from the PRD's `Permission` entity: a typed catalogue is reviewable in a diff, testable without a database, and a mistake in it fails to compile. Agency-configurable approval limits (ORG-7, R2) are genuinely data and will live in a table that _narrows_ these permissions, never widens them.

## Consequences

- One sign-in, one password reset, one session list per person, however many organisations and roles they hold (ORG-9).
- A tenant who later joins the agency keeps their identity and history instead of acquiring a second account.
- Multi-organisation membership falls out for free, and no "current organisation" concept is needed for _isolation_ — policies admit any organisation the user actively belongs to, and the application chooses what to display.
- **Cost, and the sharpest edge in the design:** landlords and tenants are members of an organisation whose visibility is narrower than the organisation. RLS alone does not express this. Their policies must be keyed to their own linkage, and getting one wrong leaks between parties _inside_ one agency — which is why `supabase/tests/0020_organisation_isolation_test.sql` asserts that a tenant cannot enumerate the agency roster or read the audit trail.
- **Cost:** every policy check runs a membership lookup. `app.current_organisation_ids()` is `stable` and backed by a partial index on `(user_id, organisation_id) where status = 'active'`. If this ever becomes a measured bottleneck, the alternative is stamping the organisation into the JWT via a custom access token hook — which trades the lookup for staleness after a role change, and that is the worse failure for a revoked member.
- The helper functions are `security definer` with `search_path = ''`, so policies on `memberships` do not recurse into themselves and a caller cannot shadow a table.

## Alternatives considered

**Separate `PortalAccount` table with its own credentials.** Rejected: a second authentication system to secure, a second password reset flow to get right, and a person who is both tenant and staff would hold two identities with no link between them. The PRD lists `PortalAccount` as an entity, not as a requirement for separate credentials — the linkage it describes is satisfied by a membership row plus, from R1 step 3, a tenant record.

**One membership per user (single organisation).** Rejected: it breaks the landlord whose properties are managed by two agencies, and would force duplicate accounts — exactly what this decision avoids.

**Permissions as database rows from the start.** Rejected for R1: it adds a table, a cache, and a seeding problem, to express a matrix that nobody can yet configure. ORG-7 is R2, and when it arrives the configurable part is approval _limits_, not the base matrix.
