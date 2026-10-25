-- Staff invitations (TV-143, ORG-2, ORG-3, ORG-5).

begin;
select plan(17);

select tests.as_owner();

insert into public.plans (id, name, unit_limit, price_kobo, billing_period, trial_days)
values ('trial', 'Trial', 10, 0, 'monthly', 14)
on conflict (id) do nothing;

select tests.create_user('owner@lekkilets.ng')   as lk_owner   \gset
select tests.create_user('admin@lekkilets.ng')   as lk_admin   \gset
select tests.create_user('newpm@lekkilets.ng')   as lk_newpm   \gset
select tests.create_user('stranger@other.ng')    as stranger   \gset

select tests.authenticate(:'lk_owner'::uuid, 'owner@lekkilets.ng');
select public.create_organisation_with_owner('Lekki Lets', 'agency', 'Lekki Owner') as lk_org \gset

select tests.as_owner();
insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
values (:'lk_org'::uuid, :'lk_admin'::uuid, 'admin', 'active', now());

-- --- an admin may invite ordinary staff ------------------------------------
select tests.authenticate(:'lk_admin'::uuid, 'admin@lekkilets.ng');

select lives_ok(
  format($$insert into public.memberships
            (organisation_id, user_id, role, status, invited_by, invited_at)
           values (%L, %L, 'property_manager', 'invited', %L, now())$$,
         :'lk_org'::uuid, :'lk_newpm'::uuid, :'lk_admin'::uuid),
  'ORG-2: an admin can invite a property manager'
);

-- --- but not an owner ------------------------------------------------------
select throws_ok(
  format($$insert into public.memberships
            (organisation_id, user_id, role, status, invited_by, invited_at)
           values (%L, %L, 'owner', 'invited', %L, now())$$,
         :'lk_org'::uuid, :'stranger'::uuid, :'lk_admin'::uuid),
  '42501',
  null,
  'ORG-3: an admin cannot invite an owner, which would route around the role rules'
);

-- --- an invitee sees the organisation name but not its data ---------------
select tests.authenticate(:'lk_newpm'::uuid, 'newpm@lekkilets.ng');

select is(
  (select name from public.organisations where id = :'lk_org'::uuid),
  'Lekki Lets',
  'ORG-2: an invitee can see the name of the organisation inviting them'
);
select is(
  (select count(*)::int from public.memberships),
  1,
  'ORG-2: an invitee sees only their own pending membership, not the roster'
);
select is_empty(
  'select id from public.audit_events',
  'ORG-2: an invitee cannot read the audit trail before accepting'
);

-- An invitee must not be able to promote themselves while pending.
with attempted as (
  update public.memberships set role = 'owner'
  where user_id = :'lk_newpm'::uuid
  returning 1
)
select count(*)::int as self_promotions from attempted \gset
select is(
  :self_promotions,
  0,
  'ORG-2: an invitee cannot change the role they were offered'
);

-- --- accepting -------------------------------------------------------------
select lives_ok(
  format('select public.accept_invitation(%L)', :'lk_org'::uuid),
  'ORG-2: the invitee can accept their own invitation'
);

select tests.as_owner();
select is(
  (select status::text from public.memberships where user_id = :'lk_newpm'::uuid),
  'active',
  'ORG-2: accepting activates the membership'
);
select isnt(
  (select accepted_at from public.memberships where user_id = :'lk_newpm'::uuid),
  null::timestamptz,
  'ORG-2: and records when'
);
select is(
  (select role::text from public.memberships where user_id = :'lk_newpm'::uuid),
  'property_manager',
  'ORG-2: accepting never changes the role that was offered'
);
select is(
  (select reason from public.audit_events
    where entity_id = (select id::text from public.memberships where user_id = :'lk_newpm'::uuid)
      and action = 'membership.status_changed'
    order by occurred_at desc limit 1),
  'Invitation accepted by the invitee',
  'ORG-5: the audit entry says why the status changed'
);

-- --- accepting twice, and accepting what is not yours ---------------------
select tests.authenticate(:'lk_newpm'::uuid, 'newpm@lekkilets.ng');

select throws_ok(
  format('select public.accept_invitation(%L)', :'lk_org'::uuid),
  'P0002',
  null,
  'ORG-2: an invitation cannot be accepted twice'
);

select tests.authenticate(:'stranger'::uuid, 'stranger@other.ng');
select throws_ok(
  format('select public.accept_invitation(%L)', :'lk_org'::uuid),
  'P0002',
  null,
  'ORG-2: an account with no invitation cannot accept one'
);
select is(
  (select count(*)::int from public.organisations),
  0,
  'ORG-8: and still sees no organisation at all'
);

-- --- revoking --------------------------------------------------------------
select tests.as_owner();
insert into public.memberships
  (organisation_id, user_id, role, status, invited_by, invited_at)
values (:'lk_org'::uuid, :'stranger'::uuid, 'caretaker', 'invited', :'lk_owner'::uuid, now());

select tests.authenticate(:'lk_admin'::uuid, 'admin@lekkilets.ng');

with removed as (
  delete from public.memberships
  where user_id = :'stranger'::uuid and status = 'invited'
  returning 1
)
select count(*)::int as revoked from removed \gset
select is(:revoked, 1, 'ORG-2: an admin can revoke a pending invitation');

select tests.as_owner();
-- Ordered by id, not occurred_at: now() is the transaction timestamp, so every
-- event written inside one transaction shares it and cannot be ordered by it.
select is(
  (select action from public.audit_events
    where entity_type = 'membership' order by id desc limit 1),
  'membership.removed',
  'ORG-5: revoking is audited'
);

select tests.authenticate(:'stranger'::uuid, 'stranger@other.ng');
select throws_ok(
  format('select public.accept_invitation(%L)', :'lk_org'::uuid),
  'P0002',
  null,
  'ORG-2: a revoked invitation can no longer be accepted'
);

select * from finish();
rollback;
