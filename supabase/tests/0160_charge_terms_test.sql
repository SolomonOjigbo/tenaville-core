-- Non-rent charges agreed on a tenancy (LEASE-2, TV-154).
--
-- The clause LEASE-2 asks for and nothing covered: "rent, payment frequency,
-- due dates, deposit and other charges". Most of the value is that these are
-- ordinary rows in `charges`, so the two tests that matter most are the ones
-- about the overlap key — the thing that had to change for a lease to carry
-- two concurrent service charges without one being mistaken for a double
-- billing of the other.

begin;

select plan(21);

select tests.as_owner();

select tests.create_user('owner@ketulets.ng') as owner \gset
select tests.create_user('tenant@ketulets.ng') as tenant_user \gset

select tests.authenticate(:'owner'::uuid, 'owner@ketulets.ng');
select public.create_organisation_with_owner('Ketu Lets', 'agency', 'Ketu Owner') as org \gset

select tests.as_owner();

insert into public.landlords (organisation_id, display_name)
values (:'org'::uuid, 'Mr Balogun')
returning id as landlord \gset

insert into public.properties (
  organisation_id, landlord_id, name, property_type, address_line, state_code
)
values (
  :'org'::uuid, :'landlord'::uuid, 'Balogun Estate', 'residential', '3 Ikosi Road', 'LA'
)
returning id as property \gset

insert into public.units (organisation_id, property_id, label, unit_type)
values (:'org'::uuid, :'property'::uuid, 'Flat A', 'flat')
returning id as unit \gset

insert into public.tenants (organisation_id, display_name, user_id)
values (:'org'::uuid, 'Bisi Lawal', :'tenant_user'::uuid)
returning id as tenant \gset

select tests.authenticate(:'owner'::uuid, 'owner@ketulets.ng');

select public.create_lease_with_tenant(
  :'org'::uuid, :'unit'::uuid, :'tenant'::uuid,
  date '2026-01-01', date '2026-12-31', 120000000::bigint,
  'annual', 'KT/2026/01', null, 'agency', false
) as lease \gset

-- ---------------------------------------------------------------------------
-- A quarterly service charge
-- ---------------------------------------------------------------------------
select public.add_lease_charge_term(
  :'lease'::uuid,
  'service_charge',
  'Estate service charge',
  3000000::bigint,
  'quarterly',
  date '2026-01-01',
  date '2026-12-31',
  '[
    {"sequence":1,"period_start":"2026-01-01","period_end":"2026-03-31","due_on":"2026-01-01","amount_kobo":"3000000"},
    {"sequence":2,"period_start":"2026-04-01","period_end":"2026-06-30","due_on":"2026-04-01","amount_kobo":"3000000"},
    {"sequence":3,"period_start":"2026-07-01","period_end":"2026-09-30","due_on":"2026-07-01","amount_kobo":"3000000"},
    {"sequence":4,"period_start":"2026-10-01","period_end":"2026-12-31","due_on":"2026-10-01","amount_kobo":"3000000"}
  ]'::jsonb
) as service_term \gset

select is(
  (
    select count(*)
    from public.charges
    where charge_term_id = :'service_term'::uuid
  ),
  4::bigint,
  'LEASE-2: a quarterly service charge raises four instalments'
);

select is(
  (
    select kind
    from public.charges
    where charge_term_id = :'service_term'::uuid
    limit 1
  ),
  'service_charge'::public.charge_kind,
  'LEASE-2: carrying the kind the tenancy agreed'
);

select isnt(
  (select raised_at from public.lease_charge_terms where id = :'service_term'::uuid),
  null,
  'LEASE-2: and the term records that its instalments exist'
);

-- The whole point of TV-154: downstream code sees charges, not special cases.
select is(
  (
    select count(*)
    from public.charges
    where lease_id = :'lease'::uuid
  ),
  4::bigint,
  'RENT-1: they are ordinary charges, countable with rent by the same query'
);

-- ---------------------------------------------------------------------------
-- Two concurrent service charges, which the old overlap key forbade
-- ---------------------------------------------------------------------------
select lives_ok(
  format(
    $$select public.add_lease_charge_term(
        %L::uuid, 'service_charge', 'Waste disposal levy', 500000::bigint, 'quarterly',
        date '2026-01-01', date '2026-12-31',
        '[
          {"sequence":1,"period_start":"2026-01-01","period_end":"2026-03-31","due_on":"2026-01-01","amount_kobo":"500000"},
          {"sequence":2,"period_start":"2026-04-01","period_end":"2026-06-30","due_on":"2026-04-01","amount_kobo":"500000"},
          {"sequence":3,"period_start":"2026-07-01","period_end":"2026-09-30","due_on":"2026-07-01","amount_kobo":"500000"},
          {"sequence":4,"period_start":"2026-10-01","period_end":"2026-12-31","due_on":"2026-10-01","amount_kobo":"500000"}
        ]'::jsonb
      )$$,
    :'lease'
  ),
  'LEASE-2: a second service charge over the same quarters is an estate levy, not a double billing'
);

select is(
  (
    select count(distinct charge_term_id)
    from public.charges
    where lease_id = :'lease'::uuid and kind = 'service_charge'
  ),
  2::bigint,
  'LEASE-2: so the lease carries two distinct agreements'
);

-- Within one agreement, overlap is still the bug it always was.
select throws_ok(
  format(
    $$insert into public.charges
      (organisation_id, lease_id, kind, charge_term_id, sequence, period_start, period_end, due_on, amount_kobo)
      values (%L::uuid, %L::uuid, 'service_charge', %L::uuid, 9,
              date '2026-02-01', date '2026-02-28', date '2026-02-01', 3000000)$$,
    :'org', :'lease', :'service_term'
  ),
  '23P01',
  null,
  'LEASE-2: two instalments of the *same* charge covering one day is still refused'
);

-- And rent keeps the protection the key was written for.
select is(
  public.activate_lease(
    :'lease'::uuid,
    '[{"sequence":1,"period_start":"2026-01-01","period_end":"2026-12-31","due_on":"2026-01-01","amount_kobo":"120000000"}]'::jsonb
  ),
  1,
  'RENT-1: rent still raises alongside the service charges'
);

select throws_ok(
  format(
    $$insert into public.charges
      (organisation_id, lease_id, kind, sequence, period_start, period_end, due_on, amount_kobo)
      values (%L::uuid, %L::uuid, 'rent', 2,
              date '2026-06-01', date '2026-06-30', date '2026-06-01', 120000000)$$,
    :'org', :'lease'
  ),
  '23P01',
  null,
  'RENT-1: and a second rent charge over the same month is still unrepresentable'
);

-- ---------------------------------------------------------------------------
-- A one-off fee
-- ---------------------------------------------------------------------------
select public.add_lease_charge_term(
  :'lease'::uuid,
  'agreed_fee',
  'Agreement preparation fee',
  2500000::bigint,
  'one_off',
  date '2026-01-01',
  date '2026-12-31',
  '[{"sequence":1,"period_start":"2026-01-01","period_end":"2026-12-31","due_on":"2026-01-01","amount_kobo":"2500000"}]'::jsonb
) as fee_term \gset

select is(
  (
    select count(*)
    from public.charges
    where charge_term_id = :'fee_term'::uuid
  ),
  1::bigint,
  'LEASE-2: a one-off fee is a single charge'
);

select throws_ok(
  format(
    $$select public.add_lease_charge_term(
        %L::uuid, 'utility', 'Diesel levy', 1000000::bigint, 'one_off',
        date '2026-01-01', date '2026-12-31',
        '[
          {"sequence":1,"period_start":"2026-01-01","period_end":"2026-06-30","due_on":"2026-01-01","amount_kobo":"1000000"},
          {"sequence":2,"period_start":"2026-07-01","period_end":"2026-12-31","due_on":"2026-07-01","amount_kobo":"1000000"}
        ]'::jsonb
      )$$,
    :'lease'
  ),
  '23514',
  null,
  'LEASE-2: a one-off charge cannot arrive as two instalments'
);

-- ---------------------------------------------------------------------------
-- What the agreement says is what is charged
-- ---------------------------------------------------------------------------
select throws_ok(
  format(
    $$select public.add_lease_charge_term(
        %L::uuid, 'utility', 'Water', 400000::bigint, 'half_yearly',
        date '2026-01-01', date '2026-12-31',
        '[
          {"sequence":1,"period_start":"2026-01-01","period_end":"2026-06-30","due_on":"2026-01-01","amount_kobo":"400000"},
          {"sequence":2,"period_start":"2026-07-01","period_end":"2026-12-31","due_on":"2026-07-01","amount_kobo":"900000"}
        ]'::jsonb
      )$$,
    :'lease'
  ),
  '23514',
  null,
  'LEASE-2: an instalment that is not the agreed amount is refused'
);

select throws_ok(
  format(
    $$select public.add_lease_charge_term(
        %L::uuid, 'utility', 'Water', 400000::bigint, 'half_yearly',
        date '2026-01-01', date '2026-12-31',
        '[{"sequence":1,"period_start":"2026-01-01","period_end":"2026-06-30","due_on":"2026-01-01","amount_kobo":"400000"}]'::jsonb
      )$$,
    :'lease'
  ),
  '23514',
  null,
  'LEASE-2: a schedule that stops short of the agreement is refused'
);

-- ---------------------------------------------------------------------------
-- A charge term lives inside its tenancy
-- ---------------------------------------------------------------------------
select throws_ok(
  format(
    $$insert into public.lease_charge_terms
      (organisation_id, lease_id, kind, description, amount_kobo, frequency, starts_on, ends_on)
      values (%L::uuid, %L::uuid, 'utility', 'Beyond the tenancy', 100000, 'one_off',
              date '2026-01-01', date '2027-06-30')$$,
    :'org', :'lease'
  ),
  '23514',
  null,
  'LEASE-2: a charge for time the tenancy does not cover is refused'
);

select throws_ok(
  format(
    $$insert into public.lease_charge_terms
      (organisation_id, lease_id, kind, description, amount_kobo, frequency, starts_on, ends_on)
      values (%L::uuid, %L::uuid, 'rent', 'Rent again', 100000, 'annual',
              date '2026-01-01', date '2026-12-31')$$,
    :'org', :'lease'
  ),
  '23514',
  null,
  'LEASE-2: rent cannot be stated here as well as on the lease'
);

-- ---------------------------------------------------------------------------
-- Raised terms freeze (PRD §10.2)
-- ---------------------------------------------------------------------------
select throws_ok(
  format(
    $$update public.lease_charge_terms set amount_kobo = 1 where id = %L::uuid$$,
    :'service_term'
  ),
  '42501',
  null,
  'PRD §10.2: the amount cannot change once instalments exist'
);

select throws_ok(
  format($$delete from public.lease_charge_terms where id = %L::uuid$$, :'service_term'),
  '42501',
  null,
  'PRD §10.2: nor can the agreement be deleted'
);

select lives_ok(
  format(
    $$update public.lease_charge_terms set description = 'Estate service charge (2026)'
      where id = %L::uuid$$,
    :'service_term'
  ),
  'LEASE-2: but what it is called can still be corrected'
);

select throws_ok(
  format(
    $$update public.charges set charge_term_id = %L::uuid
      where charge_term_id = %L::uuid$$,
    :'fee_term', :'service_term'
  ),
  '42501',
  null,
  'PRD §10.2: and a charge cannot be moved to another agreement'
);

-- ---------------------------------------------------------------------------
-- Who sees it (ORG-8), and that it is audited (ORG-5)
-- ---------------------------------------------------------------------------
select tests.authenticate(:'tenant_user'::uuid, 'tenant@ketulets.ng');
select is(
  (select count(*) from public.lease_charge_terms),
  3::bigint,
  'TENANT-2: a tenant can see what they have agreed to pay'
);

select tests.as_owner();
select is(
  (
    select count(*)
    from public.audit_events
    where entity_type = 'lease_charge_term' and action = 'lease_charge_term.created'
  ),
  3::bigint,
  'ORG-5: agreeing a charge is audited, like changing the rent'
);

select * from finish();

rollback;
