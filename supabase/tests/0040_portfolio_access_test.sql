-- Portfolio access: landlords, mandates, properties, units
-- (OWN-1, OWN-2, OWN-3, PROP-5, PROP-9, ORG-4).

begin;
select plan(19);

select tests.as_owner();

insert into public.plans (id, name, unit_limit, price_kobo, billing_period, trial_days)
values ('trial', 'Trial', 10, 0, 'monthly', 14)
on conflict (id) do nothing;

-- Two agencies. Ikoyi Realty has a manager scoped to one property only, an
-- accountant, a letting agent, and two landlords with their own portal users.
select tests.create_user('owner@ikoyirealty.ng')      as ik_owner    \gset
select tests.create_user('manager@ikoyirealty.ng')    as ik_manager  \gset
select tests.create_user('accountant@ikoyirealty.ng') as ik_acct     \gset
select tests.create_user('agent@ikoyirealty.ng')      as ik_agent    \gset
select tests.create_user('bola@landlord.ng')          as ll_bola     \gset
select tests.create_user('chike@landlord.ng')         as ll_chike    \gset
select tests.create_user('owner@gwarimpahomes.ng')    as gw_owner    \gset

select tests.authenticate(:'ik_owner'::uuid, 'owner@ikoyirealty.ng');
select public.create_organisation_with_owner('Ikoyi Realty', 'agency', 'Ikoyi Owner') as ik_org \gset

select tests.authenticate(:'gw_owner'::uuid, 'owner@gwarimpahomes.ng');
select public.create_organisation_with_owner('Gwarimpa Homes', 'agency', 'Gwarimpa Owner') as gw_org \gset

select tests.as_owner();

insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
values
  (:'ik_org'::uuid, :'ik_manager'::uuid, 'property_manager', 'active', now()),
  (:'ik_org'::uuid, :'ik_acct'::uuid,    'accountant',       'active', now()),
  (:'ik_org'::uuid, :'ik_agent'::uuid,   'letting_agent',    'active', now()),
  (:'ik_org'::uuid, :'ll_bola'::uuid,    'landlord',         'active', now()),
  (:'ik_org'::uuid, :'ll_chike'::uuid,   'landlord',         'active', now());

insert into public.landlords (organisation_id, user_id, display_name, phone)
values (:'ik_org'::uuid, :'ll_bola'::uuid,  'Bola Adewale', '+2348030000001')
returning id as bola_id \gset
insert into public.landlords (organisation_id, user_id, display_name, phone)
values (:'ik_org'::uuid, :'ll_chike'::uuid, 'Chike Obi',    '+2348030000002')
returning id as chike_id \gset
insert into public.landlords (organisation_id, display_name)
values (:'gw_org'::uuid, 'Gwarimpa Landlord')
returning id as gw_landlord_id \gset

insert into public.landlord_remittance_details
  (landlord_id, organisation_id, bank_name, account_name, account_number)
values (:'bola_id'::uuid, :'ik_org'::uuid, 'First Bank', 'Bola Adewale', '0123456789');

insert into public.properties
  (organisation_id, landlord_id, name, property_type, address_line, state_code, lga)
values (:'ik_org'::uuid, :'bola_id'::uuid, 'Bola Court', 'residential', '12 Kingsway Road', 'LA', 'Eti-Osa')
returning id as bola_property \gset

insert into public.properties
  (organisation_id, landlord_id, name, property_type, address_line, state_code, lga)
values (:'ik_org'::uuid, :'chike_id'::uuid, 'Chike Plaza', 'commercial', '9 Awolowo Road', 'LA', 'Eti-Osa')
returning id as chike_property \gset

insert into public.units (organisation_id, property_id, label, unit_type, asking_rent_kobo)
values
  (:'ik_org'::uuid, :'bola_property'::uuid,  'Flat 1', 'flat', 120000000),
  (:'ik_org'::uuid, :'chike_property'::uuid, 'Shop A', 'shop',  45000000);

-- The manager is scoped to Bola Court only (ORG-4).
insert into public.assignments (organisation_id, user_id, scope_type, scope_id)
values (:'ik_org'::uuid, :'ik_manager'::uuid, 'property', :'bola_property'::uuid);
-- The accountant and agent are organisation-wide.
insert into public.assignments (organisation_id, user_id, scope_type)
values
  (:'ik_org'::uuid, :'ik_acct'::uuid,  'organisation'),
  (:'ik_org'::uuid, :'ik_agent'::uuid, 'organisation');

-- --- cross-organisation integrity (PROP-5) ---------------------------------
select throws_ok(
  format($$insert into public.properties
            (organisation_id, landlord_id, name, property_type, address_line, state_code)
           values (%L, %L, 'Smuggled', 'residential', '1 Nowhere', 'LA')$$,
         :'ik_org'::uuid, :'gw_landlord_id'::uuid),
  '23503',
  null,
  'PROP-5: a property cannot be attached to another organisation''s landlord'
);

select throws_ok(
  format($$insert into public.assignments (organisation_id, user_id, scope_type, scope_id)
           values (%L, %L, 'property', %L)$$,
         :'gw_org'::uuid, :'gw_owner'::uuid, :'bola_property'::uuid),
  '23503',
  null,
  'ORG-4: an assignment cannot scope a user to another organisation''s property'
);

-- --- mandate constraints (OWN-2) -------------------------------------------
select throws_ok(
  format($$insert into public.management_mandates
            (organisation_id, landlord_id, commission_type, commission_fixed_kobo, starts_on)
           values (%L, %L, 'percentage', 500000, current_date)$$,
         :'ik_org'::uuid, :'bola_id'::uuid),
  '23514',
  null,
  'OWN-2: a percentage mandate must carry a rate, not a fixed amount'
);

select throws_ok(
  format($$insert into public.management_mandates
            (organisation_id, landlord_id, commission_type, commission_rate_bps, starts_on,
             permitted_deductions)
           values (%L, %L, 'percentage', 1000, current_date, array['maintenance']::public.deduction_category[])$$,
         :'ik_org'::uuid, :'bola_id'::uuid),
  '23514',
  null,
  'OWN-2: a mandate cannot forbid commission, which would make the agency fee unremittable'
);

select lives_ok(
  format($$insert into public.management_mandates
            (organisation_id, landlord_id, commission_type, commission_rate_bps, starts_on)
           values (%L, %L, 'percentage', 1000, current_date)$$,
         :'ik_org'::uuid, :'bola_id'::uuid),
  'OWN-2: a well-formed percentage mandate is accepted'
);

-- --- ORG-4: assignment scope limits a staff member -------------------------
select tests.authenticate(:'ik_manager'::uuid, 'manager@ikoyirealty.ng');

select is(
  (select count(*)::int from public.properties),
  1,
  'ORG-4: a manager scoped to one property sees only that property'
);
select is(
  (select name from public.properties),
  'Bola Court',
  'ORG-4: and it is the assigned one'
);
select is(
  (select count(*)::int from public.units),
  1,
  'ORG-4: units follow the property scope'
);

select tests.authenticate(:'ik_agent'::uuid, 'agent@ikoyirealty.ng');
select is(
  (select count(*)::int from public.properties),
  2,
  'ORG-4: an organisation-wide assignment sees the whole portfolio'
);

-- --- OWN-1: remittance details are restricted ------------------------------
select is(
  (select count(*)::int from public.landlord_remittance_details),
  0,
  'OWN-1: a letting agent cannot read remittance details'
);
select isnt(
  (select count(*)::int from public.landlords),
  0,
  'OWN-1: but can see the landlord record itself'
);

select tests.authenticate(:'ik_acct'::uuid, 'accountant@ikoyirealty.ng');
select is(
  (select account_number from public.landlord_remittance_details),
  '0123456789',
  'OWN-1: an accountant can read remittance details'
);

-- Changing an account number is audited, with the number masked.
select lives_ok(
  format($$update public.landlord_remittance_details
             set account_number = '9876543210'
           where landlord_id = %L$$, :'bola_id'::uuid),
  'OWN-1: an accountant may update remittance details'
);

select tests.as_owner();
select is(
  (select (after->>'account_number_last4') from public.audit_events
    where action = 'remittance_details.updated'
    order by occurred_at desc limit 1),
  '3210',
  'OWN-1: the change is audited with the account number masked'
);

-- --- OWN-3: a landlord sees their own portfolio, read-only -----------------
select tests.authenticate(:'ll_bola'::uuid, 'bola@landlord.ng');

select is(
  (select count(*)::int from public.properties),
  1,
  'OWN-3: a landlord sees only their own property'
);
select is(
  (select name from public.properties),
  'Bola Court',
  'OWN-3: and it is theirs, not the other landlord''s'
);
select is(
  (select count(*)::int from public.units),
  1,
  'OWN-3: a landlord sees the units of their own property only'
);

with attempted as (
  update public.properties set name = 'Renamed by landlord'
  where id = :'bola_property'::uuid
  returning 1
)
select count(*)::int as landlord_writes from attempted \gset

select is(
  :landlord_writes,
  0,
  'OWN-3: landlord access is read-only'
);

select is(
  (select count(*)::int from public.import_batches),
  0,
  'PROP-4: a landlord cannot see imports'
);

select * from finish();
rollback;
