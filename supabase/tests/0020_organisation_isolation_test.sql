-- Cross-tenant isolation, exercised through the policies as a real session
-- would hit them (ORG-8, ORG-4, PRD §16.2).
--
-- Two organisations are created with deliberately similar data, because a
-- leak between obviously-different fixtures is easy to miss by eye.

begin;
select plan(14);

-- --- fixtures, as owner (policies would block this setup) -------------------
select tests.as_owner();

-- The seed may already have created this; the test must not depend on whether
-- it ran.
insert into public.plans (id, name, unit_limit, price_kobo, billing_period, trial_days)
values ('trial', 'Trial', 10, 0, 'monthly', 14)
on conflict (id) do nothing;

-- Lagos Lettings: owner, a property manager, and a tenant.
-- Abuja Estates: owner only. Same shape, different tenant.
select tests.create_user('owner@lagoslettings.ng')    as lagos_owner   \gset
select tests.create_user('manager@lagoslettings.ng')  as lagos_manager \gset
select tests.create_user('tenant@lagoslettings.ng')   as lagos_tenant  \gset
select tests.create_user('owner@abujaestates.ng')     as abuja_owner   \gset

-- --- ORG-1: signup creates organisation + owner + trial --------------------
select tests.authenticate(:'lagos_owner', 'owner@lagoslettings.ng');
select public.create_organisation_with_owner('Lagos Lettings', 'agency', 'Lagos Owner') as lagos_org \gset

select tests.authenticate(:'abuja_owner', 'owner@abujaestates.ng');
select public.create_organisation_with_owner('Abuja Estates', 'agency', 'Abuja Owner') as abuja_org \gset

select isnt(:'lagos_org'::uuid, :'abuja_org'::uuid, 'ORG-1: each signup creates a distinct organisation');

select tests.as_owner();
select is(
  (select count(*)::int from public.memberships
    where organisation_id = :'lagos_org'::uuid and role = 'owner' and status = 'active'),
  1,
  'ORG-1: signup creates exactly one active owner membership'
);
select is(
  (select status::text from public.subscriptions where organisation_id = :'lagos_org'::uuid),
  'trialing',
  'BILL-1: signup starts a trial subscription'
);
select isnt(
  (select trial_ends_on::text from public.subscriptions where organisation_id = :'lagos_org'::uuid),
  null::text,
  'BILL-1: the trial has an end date'
);

-- Staff and tenant memberships for the isolation checks below.
insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
values
  (:'lagos_org'::uuid, :'lagos_manager'::uuid, 'property_manager', 'active', now()),
  (:'lagos_org'::uuid, :'lagos_tenant'::uuid,  'tenant',           'active', now());

-- --- ORG-8: the organisation boundary --------------------------------------
select tests.authenticate(:'lagos_owner', 'owner@lagoslettings.ng');

select is(
  (select count(*)::int from public.organisations),
  1,
  'ORG-8: a member sees only their own organisation, not the seeded ones'
);
select is(
  (select name from public.organisations),
  'Lagos Lettings',
  'ORG-8: and it is the right one'
);
select is_empty(
  format('select id from public.organisations where id = %L', :'abuja_org'::uuid),
  'ORG-8: another organisation is invisible even when its id is known'
);

-- Writing across the boundary must fail too — a read-only check would miss
-- the case where select is filtered but update is not.
-- A data-modifying CTE must be top level, so the row count is captured first
-- and asserted after.
with attempted as (
  update public.organisations set name = 'Hijacked'
  where id = :'abuja_org'::uuid
  returning 1
)
select count(*)::int as cross_org_updates from attempted \gset

select is(
  :cross_org_updates,
  0,
  'ORG-8: a member cannot update another organisation'
);

select tests.as_owner();
select is(
  (select name from public.organisations where id = :'abuja_org'::uuid),
  'Abuja Estates',
  'ORG-8: and the other organisation is genuinely unchanged'
);

-- --- ORG-4: role authority inside one organisation -------------------------
select tests.authenticate(:'lagos_manager', 'manager@lagoslettings.ng');

select is(
  (select count(*)::int from public.memberships where organisation_id = :'lagos_org'::uuid),
  3,
  'ORG-4: staff can see their organisation''s memberships'
);
with attempted as (
  update public.memberships set role = 'owner'
  where user_id = :'lagos_manager'::uuid
  returning 1
)
select count(*)::int as self_promotions from attempted \gset

select is(
  :self_promotions,
  0,
  'ORG-4: a property manager cannot promote themselves to owner'
);

-- A tenant is a member of the organisation but must not be able to enumerate
-- it. This is the sharp edge the RLS notes call out: in-organisation users
-- whose visibility is narrower than the organisation.
select tests.authenticate(:'lagos_tenant', 'tenant@lagoslettings.ng');

select is(
  (select count(*)::int from public.memberships),
  1,
  'ORG-4: a tenant sees only their own membership, not the agency roster'
);
select is(
  (select count(*)::int from public.users),
  1,
  'ORG-4: a tenant cannot enumerate the organisation''s people'
);
select is_empty(
  'select id from public.audit_events',
  'ORG-5: a tenant cannot read the audit trail'
);

select * from finish();
rollback;
