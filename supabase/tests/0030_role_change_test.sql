-- Role changes: authority and audit (ORG-3, ORG-4, ORG-5).

begin;
select plan(8);

select tests.as_owner();

insert into public.plans (id, name, unit_limit, price_kobo, billing_period, trial_days)
values ('trial', 'Trial', 10, 0, 'monthly', 14)
on conflict (id) do nothing;

select tests.create_user('owner@kano.ng')   as kano_owner   \gset
select tests.create_user('admin@kano.ng')   as kano_admin   \gset
select tests.create_user('agent@kano.ng')   as kano_agent   \gset

select tests.authenticate(:'kano_owner'::uuid, 'owner@kano.ng');
select public.create_organisation_with_owner('Kano Keys', 'agency', 'Kano Owner') as kano_org \gset

select tests.as_owner();
insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
values
  (:'kano_org'::uuid, :'kano_admin'::uuid, 'admin',         'active', now()),
  (:'kano_org'::uuid, :'kano_agent'::uuid, 'letting_agent', 'active', now());

select id as agent_membership from public.memberships
 where user_id = :'kano_agent'::uuid \gset
select id as owner_membership from public.memberships
 where user_id = :'kano_owner'::uuid \gset

-- --- a reason is mandatory (ORG-5) -----------------------------------------
select tests.authenticate(:'kano_admin'::uuid, 'admin@kano.ng');

select throws_ok(
  format('select public.change_membership_role(%L, %L, %L)',
         :'agent_membership'::uuid, 'property_manager', ''),
  '22023',
  null,
  'ORG-5: a role change without a reason is rejected'
);

-- --- an admin may promote within their authority ---------------------------
select lives_ok(
  format('select public.change_membership_role(%L, %L, %L)',
         :'agent_membership'::uuid, 'property_manager', 'Taking over the Ikeja portfolio'),
  'ORG-3: an admin may change a letting agent to property manager'
);

select tests.as_owner();
select is(
  (select role::text from public.memberships where id = :'agent_membership'::uuid),
  'property_manager',
  'ORG-3: the role actually changed'
);
select is(
  (select reason from public.audit_events
    where entity_id = :'agent_membership'::text and action = 'membership.role_changed'
    order by occurred_at desc limit 1),
  'Taking over the Ikeja portfolio',
  'ORG-5: the reason is recorded on the audit entry'
);
select is(
  (select (before->>'role') || '->' || (after->>'role') from public.audit_events
    where entity_id = :'agent_membership'::text and action = 'membership.role_changed'
    order by occurred_at desc limit 1),
  'letting_agent->property_manager',
  'ORG-5: before and after values are recorded'
);

-- --- only an owner creates an owner ---------------------------------------
select tests.authenticate(:'kano_admin'::uuid, 'admin@kano.ng');

select throws_ok(
  format('select public.change_membership_role(%L, %L, %L)',
         :'agent_membership'::uuid, 'owner', 'Trying to create a second owner'),
  '42501',
  null,
  'ORG-4: an admin may not assign the owner role'
);

select throws_ok(
  format('select public.change_membership_role(%L, %L, %L)',
         :'owner_membership'::uuid, 'admin', 'Trying to demote the owner'),
  '42501',
  null,
  'ORG-4: an admin may not change an owner''s role'
);

-- --- a non-admin may not change roles at all ------------------------------
select tests.authenticate(:'kano_agent'::uuid, 'agent@kano.ng');

select throws_ok(
  format('select public.change_membership_role(%L, %L, %L)',
         :'agent_membership'::uuid, 'admin', 'Self promotion attempt'),
  '42501',
  null,
  'ORG-4: a property manager may not change roles'
);

select * from finish();
rollback;
