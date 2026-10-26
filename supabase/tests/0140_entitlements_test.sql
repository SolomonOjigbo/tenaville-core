-- Plan limits and feature flags, enforced at the write (BILL-3, TV-147).
--
-- The acceptance criterion is "a request that would exceed a plan limit is
-- refused by the API, not only hidden in the UI". These tests go a layer below
-- the API, because that is where the refusal has to live: an import and the
-- mobile app do not go through a route handler.

begin;

select plan(29);

select tests.as_owner();

select tests.create_user('owner@onefreeflat.ng') as free_owner \gset
select tests.create_user('staff1@onefreeflat.ng') as free_staff_one \gset
select tests.create_user('staff2@onefreeflat.ng') as free_staff_two \gset
select tests.create_user('tenant@onefreeflat.ng') as free_tenant \gset
select tests.create_user('owner@ikejaagency.ng') as agent_owner \gset
select tests.create_user('nosy@elsewhere.ng') as outsider \gset

select tests.authenticate(:'free_owner'::uuid, 'owner@onefreeflat.ng');
select public.create_organisation_with_owner('One Free Flat', 'individual_landlord', 'Free Owner') as free_org \gset

select tests.authenticate(:'agent_owner'::uuid, 'owner@ikejaagency.ng');
select public.create_organisation_with_owner('Ikeja Agency', 'agency', 'Agency Owner') as agent_org \gset

-- Both start on the trial, which carries Growth's limits. Put one on Free and
-- one on Agent, which is what the rest of this file is about.
select tests.as_owner();

update public.subscriptions
set
  plan_id = 'free',
  status = 'active'
where organisation_id = :'free_org'::uuid;

update public.subscriptions
set
  plan_id = 'agent_monthly',
  status = 'active'
where organisation_id = :'agent_org'::uuid;

insert into public.landlords (organisation_id, display_name)
values (:'free_org'::uuid, 'The owner themselves')
returning id as free_landlord \gset

insert into public.properties (
  organisation_id, landlord_id, name, property_type, address_line, state_code
)
values (
  :'free_org'::uuid, :'free_landlord'::uuid, 'Yaba Block', 'residential',
  '1 Hughes Avenue', 'LA'
)
returning id as free_property \gset

-- ---------------------------------------------------------------------------
-- limit_verdict: the whole model, in four answers
-- ---------------------------------------------------------------------------
select is(app.limit_verdict(5, null, null), 'unlimited', 'BILL-3: a null limit is unlimited');
select is(app.limit_verdict(5, 10, null), 'within', 'BILL-3: under the limit is within it');
select is(
  app.limit_verdict(10, 10, 30000),
  'billable',
  'BILL-3: a full band with a per-unit price is a sale, not a refusal'
);
select is(
  app.limit_verdict(10, 10, null),
  'refused',
  'BILL-3: a full band with no per-unit price is a wall'
);

-- ---------------------------------------------------------------------------
-- Properties: the Free plan runs one
-- ---------------------------------------------------------------------------
select throws_ok(
  format(
    $$insert into public.properties
      (organisation_id, landlord_id, name, property_type, address_line, state_code)
      values (%L::uuid, %L::uuid, 'Second Block', 'residential', '2 Hughes Avenue', 'LA')$$,
    :'free_org', :'free_landlord'
  ),
  '53400',
  null,
  'BILL-3: the Free plan refuses a second property'
);

-- ---------------------------------------------------------------------------
-- Units: ten on Free, and the eleventh is refused because Free sells no extras
-- ---------------------------------------------------------------------------
insert into public.units (organisation_id, property_id, label, unit_type)
select :'free_org'::uuid, :'free_property'::uuid, 'Flat ' || n, 'flat'
from generate_series(1, 10) as n;

select is(
  (select count(*) from public.units where organisation_id = :'free_org'::uuid),
  10::bigint,
  'BILL-3: the Free plan runs its ten units'
);

select throws_ok(
  format(
    $$insert into public.units (organisation_id, property_id, label, unit_type)
      values (%L::uuid, %L::uuid, 'Flat 11', 'flat')$$,
    :'free_org', :'free_property'
  ),
  '53400',
  null,
  'BILL-3: and refuses the eleventh'
);

-- Inactive units are outside the band, so making room works and the way back
-- in is checked.
update public.units
set
  status = 'inactive'
where organisation_id = :'free_org'::uuid and label = 'Flat 10';

insert into public.units (organisation_id, property_id, label, unit_type)
values (:'free_org'::uuid, :'free_property'::uuid, 'Flat 11', 'flat');

select is(
  (
    select count(*)
    from public.units
    where organisation_id = :'free_org'::uuid and status <> 'inactive'
  ),
  10::bigint,
  'BILL-3: setting a unit inactive makes room for another'
);

select throws_ok(
  format(
    $$update public.units set status = 'vacant'
      where organisation_id = %L::uuid and label = 'Flat 10'$$,
    :'free_org'
  ),
  '53400',
  null,
  'BILL-3: reactivating a unit is checked too, so inactive is not a way round the limit'
);

-- ---------------------------------------------------------------------------
-- Units on a paid plan: past the band is billable, not refused
-- ---------------------------------------------------------------------------
insert into public.landlords (organisation_id, display_name)
values (:'agent_org'::uuid, 'Chief Adebayo')
returning id as agent_landlord \gset

insert into public.properties (
  organisation_id, landlord_id, name, property_type, address_line, state_code
)
values (
  :'agent_org'::uuid, :'agent_landlord'::uuid, 'Allen Towers', 'commercial',
  '40 Allen Avenue', 'LA'
)
returning id as agent_property \gset

-- Agent includes 100 units at ₦275 each beyond. 101 must be allowed.
insert into public.units (organisation_id, property_id, label, unit_type)
select :'agent_org'::uuid, :'agent_property'::uuid, 'Suite ' || n, 'office'
from generate_series(1, 101) as n;

select is(
  (select count(*) from public.units where organisation_id = :'agent_org'::uuid),
  101::bigint,
  'BILL-3: a paid plan sells the unit past its band rather than refusing it'
);

-- ---------------------------------------------------------------------------
-- Over-limit data is never removed (BILL-4, §3.1 principle 5)
-- ---------------------------------------------------------------------------
update public.subscriptions
set
  plan_id = 'free'
where organisation_id = :'agent_org'::uuid;

select is(
  (select count(*) from public.units where organisation_id = :'agent_org'::uuid),
  101::bigint,
  'BILL-4: dropping to Free deletes nothing — 101 units are still there'
);

select throws_ok(
  format(
    $$insert into public.units (organisation_id, property_id, label, unit_type)
      values (%L::uuid, %L::uuid, 'Suite 102', 'office')$$,
    :'agent_org', :'agent_property'
  ),
  '53400',
  null,
  'BILL-3: but the next one is refused, which is what a limit means'
);

update public.subscriptions
set
  plan_id = 'agent_monthly'
where organisation_id = :'agent_org'::uuid;

-- ---------------------------------------------------------------------------
-- The second landlord is the line between owning and agency work (§3.8)
-- ---------------------------------------------------------------------------
select throws_ok(
  format(
    $$insert into public.landlords (organisation_id, display_name)
      values (%L::uuid, 'Someone else''s building')$$,
    :'free_org'
  ),
  '53400',
  null,
  'BILL-3: a free account cannot take on a second landlord'
);

select lives_ok(
  format(
    $$insert into public.landlords (organisation_id, display_name)
      values (%L::uuid, 'Mrs Nwosu')$$,
    :'agent_org'
  ),
  'BILL-3: an Agent account can, which is what it is for'
);

select throws_ok(
  format(
    $$insert into public.management_mandates
      (organisation_id, landlord_id, commission_type, commission_rate_bps, remittance_schedule)
      values (%L::uuid, %L::uuid, 'percentage', 1000, 'monthly')$$,
    :'free_org', :'free_landlord'
  ),
  '53400',
  null,
  'BILL-3: and cannot hold a management mandate, which is how commission is charged'
);

-- ---------------------------------------------------------------------------
-- Seats
-- ---------------------------------------------------------------------------
select throws_ok(
  format(
    $$insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
      values (%L::uuid, %L::uuid, 'property_manager', 'active', now())$$,
    :'free_org', :'free_staff_one'
  ),
  '53400',
  null,
  'BILL-3: the Free plan is owner and caretaker, so a property manager is refused'
);

-- Free allows two seats and the owner holds one. A caretaker is the second.
select lives_ok(
  format(
    $$insert into public.memberships (organisation_id, user_id, role, status, invited_at)
      values (%L::uuid, %L::uuid, 'caretaker', 'invited', now())$$,
    :'free_org', :'free_staff_one'
  ),
  'BILL-3: and a caretaker fills the second seat'
);

select throws_ok(
  format(
    $$insert into public.memberships (organisation_id, user_id, role, status, invited_at)
      values (%L::uuid, %L::uuid, 'caretaker', 'invited', now())$$,
    :'free_org', :'free_staff_two'
  ),
  '53400',
  null,
  'BILL-3: an invitation holds a seat, so the third is refused rather than trapping the invitee'
);

select lives_ok(
  format(
    $$insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
      values (%L::uuid, %L::uuid, 'tenant', 'active', now())$$,
    :'free_org', :'free_tenant'
  ),
  'BILL-3: portal access is not a staff seat — three tenants would otherwise use up a plan'
);

update public.memberships
set
  status = 'suspended',
  suspended_at = now()
where organisation_id = :'free_org'::uuid and user_id = :'free_staff_one'::uuid;

select lives_ok(
  format(
    $$insert into public.memberships (organisation_id, user_id, role, status, invited_at)
      values (%L::uuid, %L::uuid, 'caretaker', 'invited', now())$$,
    :'free_org', :'free_staff_two'
  ),
  'BILL-3: a suspended member releases their seat — the plan sells access, not rows'
);

-- ---------------------------------------------------------------------------
-- The feature catalogue
-- ---------------------------------------------------------------------------
select throws_ok(
  format($$select app.plan_allows(%L::uuid, 'ledger_statments')$$, :'free_org'),
  '22023',
  null,
  'BILL-3: a mistyped feature key raises rather than quietly denying a paying customer'
);

select is(
  app.plan_allows(:'agent_org'::uuid, 'multi_landlord_ledger'),
  true,
  'BILL-3: Agent grants the multi-landlord ledger'
);

select is(
  app.plan_allows(:'free_org'::uuid, 'multi_landlord_ledger'),
  false,
  'BILL-3: Free does not'
);

-- ---------------------------------------------------------------------------
-- What the caller can see of all this (ORG-8)
-- ---------------------------------------------------------------------------
select tests.authenticate(:'free_owner'::uuid, 'owner@onefreeflat.ng');

select is(
  (select count(*) from public.plan_entitlements()),
  1::bigint,
  'ORG-8: plan_entitlements answers for the caller''s own organisation'
);

select is(
  (select plan_id from public.plan_entitlements()),
  'free',
  'BILL-3: and names the plan the limits came from'
);

select is(
  (select properties_verdict from public.plan_entitlements()),
  'refused',
  'BILL-3: the screen reads the same verdict the trigger did, so the two cannot disagree'
);

select is(
  (select units_used from public.plan_entitlements()),
  10,
  'BILL-3: usage counts active units only'
);

select throws_ok(
  format($$select * from app.organisation_usage(%L::uuid)$$, :'agent_org'),
  '42501',
  null,
  'ORG-8: a signed-in user cannot count another organisation''s portfolio'
);

select tests.authenticate(:'outsider'::uuid, 'nosy@elsewhere.ng');
select is(
  (select count(*) from public.plan_entitlements()),
  0::bigint,
  'ORG-8: someone with no membership learns nothing'
);

select * from finish();

rollback;
