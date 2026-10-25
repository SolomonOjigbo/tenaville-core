# Multi-tenancy and row-level security

> PRD ORG-8, ORG-4, §10.8, §12 (Data isolation), §16.2 exit criteria.

A cross-tenant leak is the failure that ends the product. One agency seeing another's tenants, arrears or landlord statements is unrecoverable reputationally, and the PRD treats it accordingly: isolation must be enforced at the database layer, and automated cross-tenant tests must pass in CI on every release.

## The model

One Postgres database. Every organisation-scoped table carries `organisation_id uuid not null`, with RLS enabled and a policy that restricts rows to the caller's organisation.

Shared-database-with-RLS was chosen over a schema or database per tenant because the PRD targets thousands of organisations with a small team: per-tenant schemas multiply migration risk by the number of customers, and the 100-unit agency and the 10,000-unit agency would need the same 17 modules migrated in lockstep. RLS puts the boundary in one place that is testable.

## Rules

1. **Every scoped table has RLS enabled and at least one policy.** A table with RLS enabled and no policy denies everything; a table without RLS enabled denies nothing. The second mistake is the dangerous one, so `supabase db lint` and a pgTAP test gate it.
2. **The organisation comes from the session, never from the request body.** A client-supplied `organisation_id` is an attack, not an input.
3. **The service-role key never serves a user-initiated read or write.** It bypasses RLS. It belongs to migrations and background jobs, which carry their own explicit scoping.
4. **Role checks are additive, not a substitute.** RLS answers "which organisation"; application authorisation answers "may this role, for this property or portfolio, do this" (ORG-4). Property- and portfolio-scoped assignment means organisation membership alone is not sufficient authority.
5. **Analytics and exports apply the same restrictions** as the main application, including background report generation (AN-13, §10.14). A report job that runs as service-role and emails a PDF is a leak with extra steps.
6. **Landlords and tenants are the sharpest edges.** A landlord sees only their assigned properties and statements (OWN-3, LEDGER-5); a tenant sees only their own tenancy and lease (TENANT-1). Both are in-organisation users whose visibility is narrower than the organisation — RLS alone does not express this, so both need policies keyed to their own linkage.

## Testing

`packages/db/src/__tests__/isolation/` runs as a required CI job (`pnpm test:isolation`). The suite seeds at least two organisations with overlapping-looking data and asserts, for every scoped table, that organisation A's session cannot read, update or delete organisation B's rows — and that a landlord and a tenant session cannot reach records outside their own linkage.

Policy-level tests live beside the migrations in `supabase/tests/` as pgTAP, so a policy regression is caught at the database rather than inferred from an application failure.

New table, new test. The checklist in the PR template asks for it.

## As implemented (R1 step 1)

`app.current_organisation_ids()` is the boundary: a `security definer`, `stable` function with `search_path = ''` returning the organisations where the caller has an _active_ membership. Policies restrict rows to that set; `app.has_role` answers role authority separately. `security definer` is what stops policies on `memberships` recursing into themselves.

Both questions that were open here are now settled:

- Identity and membership — one Supabase Auth user per person, authority through `memberships` ([ADR 0008](../decisions/0008-identity-and-membership-model.md)).
- Branch scoping — `branches` and a nullable `memberships.branch_id` exist from R1, so ORG-6 adds features rather than reshaping every policy.

One finding worth recording: the Supabase Postgres image sets default privileges that grant new `public` tables to `anon`, so the first migration picked up `anon` grants nobody asked for. RLS still blocked the rows, but an unauthenticated role holding table grants contradicts PROP-9. The migration now revokes them and resets the default privileges, and a pgTAP assertion keeps it that way.
