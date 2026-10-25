-- What the lease audit trail actually records (ORG-5, PRD §10.7).
--
-- The coverage test proves a trigger exists. This proves it answers the
-- questions a dispute asks: who changed the rent, when, from what to what.

begin;
select plan(13);

select tests.as_owner();

insert into public.plans (id, name, unit_limit, price_kobo, billing_period, trial_days)
values ('trial', 'Trial', 10, 0, 'monthly', 14)
on conflict (id) do nothing;

select tests.create_user('owner@gbagada.ng')   as gb_owner   \gset
select tests.create_user('manager@gbagada.ng') as gb_manager \gset

select tests.authenticate(:'gb_owner'::uuid, 'owner@gbagada.ng');
select public.create_organisation_with_owner('Gbagada Lets', 'agency', 'Gbagada Owner') as gb_org \gset

select tests.as_owner();
insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
values (:'gb_org'::uuid, :'gb_manager'::uuid, 'property_manager', 'active', now());

insert into public.landlords (organisation_id, display_name)
values (:'gb_org'::uuid, 'Mr Eze') returning id as landlord \gset
insert into public.properties
  (organisation_id, landlord_id, name, property_type, address_line, state_code)
values (:'gb_org'::uuid, :'landlord'::uuid, 'Eze Court', 'residential', '5 Diya Street', 'LA')
returning id as property \gset
insert into public.units (organisation_id, property_id, label, unit_type)
values (:'gb_org'::uuid, :'property'::uuid, 'Flat 3', 'flat') returning id as unit \gset
insert into public.tenants (organisation_id, display_name)
values (:'gb_org'::uuid, 'Yemi Cole') returning id as tenant \gset

insert into public.assignments (organisation_id, user_id, scope_type, scope_id)
values (:'gb_org'::uuid, :'gb_manager'::uuid, 'property', :'property'::uuid);

-- --- scoped access is a permission change (ORG-4, ORG-5) ------------------
select is(
  (select action from public.audit_events where entity_type = 'assignment' order by id desc limit 1),
  'assignment.created',
  'ORG-5: granting someone a property is audited, like granting a role'
);
select is(
  (select after->>'scope_type' from public.audit_events
    where entity_type = 'assignment' order by id desc limit 1),
  'property',
  'ORG-5: and records what they were given'
);

-- --- creating a lease ------------------------------------------------------
select tests.authenticate(:'gb_manager'::uuid, 'manager@gbagada.ng');

select public.create_lease_with_tenant(
  :'gb_org'::uuid, :'unit'::uuid, :'tenant'::uuid,
  date '2026-02-01', date '2027-01-31', 180000000::bigint,
  'annual', 'GB/2026/01', 40000000::bigint, 'agency', false
) as lease \gset

select tests.as_owner();

select is(
  (select action from public.audit_events where entity_type = 'lease' order by id desc limit 1),
  'lease.created',
  'ORG-5: creating a lease is audited'
);
select is(
  (select actor_user_id from public.audit_events where entity_type = 'lease' order by id desc limit 1),
  :'gb_manager'::uuid,
  'ORG-5: attributed to whoever created it'
);
select is(
  (select (after->>'rent_kobo')::bigint from public.audit_events
    where entity_type = 'lease' order by id desc limit 1),
  180000000::bigint,
  'ORG-5: with the terms it was created on'
);
select is(
  (select count(*)::int from public.audit_events where entity_type = 'lease_deposit'),
  1,
  'LEASE-13: the deposit is audited too, because it is client money'
);

-- --- changing the rent -----------------------------------------------------
select tests.authenticate(:'gb_manager'::uuid, 'manager@gbagada.ng');
update public.leases set rent_kobo = 195000000 where id = :'lease'::uuid;

select tests.as_owner();
select is(
  (select action from public.audit_events where entity_type = 'lease' order by id desc limit 1),
  'lease.updated',
  'ORG-5: changing the rent is audited'
);
select is(
  (select (before->>'rent_kobo')::bigint || ' -> ' || (after->>'rent_kobo')::bigint
     from public.audit_events where entity_type = 'lease' order by id desc limit 1),
  '180000000 -> 195000000',
  'ORG-5: with what it was and what it became — the question a dispute asks'
);

-- --- a status change is its own action -------------------------------------
select tests.as_owner();
insert into public.lease_parties (organisation_id, lease_id, tenant_id, role)
values (:'gb_org'::uuid, :'lease'::uuid, :'tenant'::uuid, 'co_tenant');

select is(
  (select action from public.audit_events where entity_type = 'lease_party' order by id desc limit 1),
  'lease_party.created',
  'ORG-5: adding a party to a tenancy is audited'
);

update public.leases set status = 'active' where id = :'lease'::uuid;
select is(
  (select action from public.audit_events where entity_type = 'lease' order by id desc limit 1),
  'lease.status_changed',
  'ORG-5: a status change reads as a status change, not a generic update'
);

-- --- an update that changes nothing writes nothing -------------------------
select count(*)::int as before_noop from public.audit_events where entity_type = 'lease' \gset
update public.leases set rent_kobo = rent_kobo where id = :'lease'::uuid;
select count(*)::int as after_noop from public.audit_events where entity_type = 'lease' \gset

select is(
  :after_noop,
  :before_noop,
  'ORG-5: an update that changes nothing is not recorded, so the trail stays readable'
);

-- --- the trail is append-only ----------------------------------------------
select throws_ok(
  $$update public.audit_events set after = '{}'::jsonb where entity_type = 'lease'$$,
  '42501',
  null,
  'PRD §10.2: a lease audit entry cannot be rewritten'
);

-- --- and a manager cannot read another organisation's trail ----------------
select tests.authenticate(:'gb_manager'::uuid, 'manager@gbagada.ng');
select is(
  (select count(*)::int from public.audit_events),
  0,
  'ORG-5: a property manager cannot read the audit trail; that is owner, admin and accountant'
);

select * from finish();
rollback;
