-- Charges generated from lease terms (RENT-1, TV-018).
--
-- The rules that cost money when they are wrong: a schedule that covers the
-- term exactly, no double-billed period, amounts that match the lease, and a
-- charge nobody can quietly rewrite.

begin;

select plan(24);

select tests.as_owner();

select tests.create_user('owner@yabalets.ng') as yb_owner \gset
select tests.create_user('tenant@yabalets.ng') as yb_tenant_user \gset
select tests.create_user('outsider@other.ng') as outsider \gset

select tests.authenticate(:'yb_owner'::uuid, 'owner@yabalets.ng');
select public.create_organisation_with_owner('Yaba Lets', 'agency', 'Yaba Owner') as yb_org \gset

select tests.as_owner();
insert into public.landlords (organisation_id, display_name)
values (:'yb_org'::uuid, 'Mrs Adeyemi')
returning id as landlord \gset

insert into public.properties (
  organisation_id, landlord_id, name, property_type, address_line, state_code
)
values (
  :'yb_org'::uuid, :'landlord'::uuid, 'Adeyemi Court', 'residential',
  '12 Herbert Macaulay Way', 'LA'
)
returning id as property \gset

insert into public.units (organisation_id, property_id, label, unit_type)
values (:'yb_org'::uuid, :'property'::uuid, 'Flat 1', 'flat')
returning id as unit_one \gset

insert into public.units (organisation_id, property_id, label, unit_type)
values (:'yb_org'::uuid, :'property'::uuid, 'Flat 2', 'flat')
returning id as unit_two \gset

insert into public.units (organisation_id, property_id, label, unit_type)
values (:'yb_org'::uuid, :'property'::uuid, 'Flat 3', 'flat')
returning id as unit_three \gset

insert into public.tenants (organisation_id, display_name, user_id)
values (:'yb_org'::uuid, 'Chidi Okeke', :'yb_tenant_user'::uuid)
returning id as tenant \gset

-- A quarterly lease: ₦300,000 a quarter for a year, so four charges.
select tests.authenticate(:'yb_owner'::uuid, 'owner@yabalets.ng');

select public.create_lease_with_tenant(
  :'yb_org'::uuid, :'unit_one'::uuid, :'tenant'::uuid,
  date '2026-01-01', date '2026-12-31', 30000000::bigint,
  'quarterly', 'YB/2026/01', null, 'agency', false
) as lease \gset

-- ---------------------------------------------------------------------------
-- Activation raises the schedule
-- ---------------------------------------------------------------------------
select is(
  public.activate_lease(
    :'lease'::uuid,
    '[
      {"sequence":1,"period_start":"2026-01-01","period_end":"2026-03-31","due_on":"2026-01-01","amount_kobo":"30000000","covers_partial_period":false},
      {"sequence":2,"period_start":"2026-04-01","period_end":"2026-06-30","due_on":"2026-04-01","amount_kobo":"30000000","covers_partial_period":false},
      {"sequence":3,"period_start":"2026-07-01","period_end":"2026-09-30","due_on":"2026-07-01","amount_kobo":"30000000","covers_partial_period":false},
      {"sequence":4,"period_start":"2026-10-01","period_end":"2026-12-31","due_on":"2026-10-01","amount_kobo":"30000000","covers_partial_period":false}
    ]'::jsonb
  ),
  4,
  'RENT-1: activating a quarterly lease raises one charge per quarter'
);

select is(
  (select status from public.leases where id = :'lease'::uuid),
  'active'::public.lease_status,
  'LEASE-3: and the lease is now active'
);

select is(
  (
    select
      sum(amount_kobo)::bigint
    from public.charges
    where lease_id = :'lease'::uuid
  ),
  120000000::bigint,
  'RENT-1: the year totals four quarters of rent, not one'
);

select is(
  (select min(period_start) || '..' || max(period_end) from public.charges
    where lease_id = :'lease'::uuid),
  '2026-01-01..2026-12-31',
  'RENT-1: the schedule covers the term exactly'
);

-- ---------------------------------------------------------------------------
-- Generating twice would double every tenant's arrears
-- ---------------------------------------------------------------------------
select throws_ok(
  format(
    $$select app.insert_lease_charges(%L::uuid, '[{"sequence":1,"period_start":"2026-01-01","period_end":"2026-12-31","due_on":"2026-01-01","amount_kobo":"30000000"}]'::jsonb)$$,
    :'lease'
  ),
  '23505',
  null,
  'RENT-1: a lease cannot be given a second rent schedule'
);

select throws_ok(
  format(
    $$select public.activate_lease(%L::uuid, '[{"sequence":1,"period_start":"2026-01-01","period_end":"2026-12-31","due_on":"2026-01-01","amount_kobo":"30000000"}]'::jsonb)$$,
    :'lease'
  ),
  '23514',
  null,
  'LEASE-3: an already active lease cannot be activated again'
);

-- ---------------------------------------------------------------------------
-- A schedule that does not cover the term
-- ---------------------------------------------------------------------------
select public.create_lease_with_tenant(
  :'yb_org'::uuid, :'unit_two'::uuid, :'tenant'::uuid,
  date '2026-01-01', date '2026-12-31', 30000000::bigint,
  'quarterly', 'YB/2026/02', null, 'agency', false
) as gap_lease \gset

select throws_ok(
  format(
    $$select public.activate_lease(%L::uuid, '[
      {"sequence":1,"period_start":"2026-01-01","period_end":"2026-03-31","due_on":"2026-01-01","amount_kobo":"30000000"},
      {"sequence":2,"period_start":"2026-05-01","period_end":"2026-12-31","due_on":"2026-05-01","amount_kobo":"30000000"}
    ]'::jsonb)$$,
    :'gap_lease'
  ),
  '23514',
  null,
  'RENT-1: a gap between periods is refused — April would never be billed'
);

select throws_ok(
  format(
    $$select public.activate_lease(%L::uuid, '[
      {"sequence":1,"period_start":"2026-01-01","period_end":"2026-03-31","due_on":"2026-01-01","amount_kobo":"30000000"}
    ]'::jsonb)$$,
    :'gap_lease'
  ),
  '23514',
  null,
  'RENT-1: a schedule that stops short of the lease end is refused'
);

select throws_ok(
  format(
    $$select public.activate_lease(%L::uuid, '[
      {"sequence":1,"period_start":"2026-02-01","period_end":"2026-12-31","due_on":"2026-02-01","amount_kobo":"30000000"}
    ]'::jsonb)$$,
    :'gap_lease'
  ),
  '23514',
  null,
  'RENT-1: a schedule starting after the lease does is refused'
);

select throws_ok(
  format(
    $$select public.activate_lease(%L::uuid, '[
      {"sequence":1,"period_start":"2026-01-01","period_end":"2026-06-30","due_on":"2026-01-01","amount_kobo":"30000000"},
      {"sequence":2,"period_start":"2026-06-01","period_end":"2026-12-31","due_on":"2026-06-01","amount_kobo":"30000000"}
    ]'::jsonb)$$,
    :'gap_lease'
  ),
  '23P01',
  null,
  'RENT-1: two charges covering the same day are unrepresentable, not merely unlikely'
);

select throws_ok(
  format(
    $$select public.activate_lease(%L::uuid, '[
      {"sequence":1,"period_start":"2026-01-01","period_end":"2026-06-30","due_on":"2026-01-01","amount_kobo":"30000000"},
      {"sequence":2,"period_start":"2026-07-01","period_end":"2026-12-31","due_on":"2026-07-01","amount_kobo":"25000000"}
    ]'::jsonb)$$,
    :'gap_lease'
  ),
  '23514',
  null,
  'RENT-1: a full period charged at anything but the lease rent is refused'
);

select throws_ok(
  format(
    $$select public.activate_lease(%L::uuid, '[
      {"sequence":1,"period_start":"2026-01-01","period_end":"2026-06-30","due_on":"2026-01-01","amount_kobo":"30000000","covers_partial_period":true},
      {"sequence":2,"period_start":"2026-07-01","period_end":"2026-12-31","due_on":"2026-07-01","amount_kobo":"30000000"}
    ]'::jsonb)$$,
    :'gap_lease'
  ),
  '23514',
  null,
  'RENT-1: only the last period of a term can be a part period'
);

select throws_ok(
  format(
    $$select public.activate_lease(%L::uuid, '[
      {"sequence":1,"period_start":"2026-01-01","period_end":"2026-12-31","due_on":"2025-12-01","amount_kobo":"30000000"}
    ]'::jsonb)$$,
    :'gap_lease'
  ),
  '23514',
  null,
  'RENT-1: a charge cannot fall due before the period it covers'
);

select is(
  (select count(*) from public.charges where lease_id = :'gap_lease'::uuid),
  0::bigint,
  'RENT-1: every rejected schedule left nothing behind'
);

-- ---------------------------------------------------------------------------
-- An irregular rent: staged instalments that must add up to the term's rent
-- ---------------------------------------------------------------------------
select public.create_lease_with_tenant(
  :'yb_org'::uuid, :'unit_three'::uuid, :'tenant'::uuid,
  date '2026-01-01', date '2026-12-31', 500000000::bigint,
  'irregular', 'YB/2026/03', null, 'agency', false
) as odd_lease \gset

select throws_ok(
  format(
    $$select public.activate_lease(%L::uuid, '[
      {"sequence":1,"period_start":"2026-01-01","period_end":"2026-06-30","due_on":"2026-01-01","amount_kobo":"300000000"},
      {"sequence":2,"period_start":"2026-07-01","period_end":"2026-12-31","due_on":"2026-07-01","amount_kobo":"150000000"}
    ]'::jsonb)$$,
    :'odd_lease'
  ),
  '23514',
  null,
  'RENT-1: instalments that do not add up to the agreed rent are refused'
);

select is(
  public.activate_lease(
    :'odd_lease'::uuid,
    '[
      {"sequence":1,"period_start":"2026-01-01","period_end":"2026-06-30","due_on":"2026-01-01","amount_kobo":"300000000"},
      {"sequence":2,"period_start":"2026-07-01","period_end":"2026-12-31","due_on":"2026-07-01","amount_kobo":"200000000"}
    ]'::jsonb
  ),
  2,
  'RENT-1: unequal staged instalments are accepted when they total the rent'
);

-- ---------------------------------------------------------------------------
-- Append-only (PRD §10.2)
-- ---------------------------------------------------------------------------
select throws_ok(
  format(
    $$update public.charges set amount_kobo = 1 where lease_id = %L::uuid$$,
    :'lease'
  ),
  '42501',
  null,
  'PRD §10.2: a charge amount cannot be rewritten'
);

select throws_ok(
  format(
    $$update public.charges set due_on = date '2026-12-01' where lease_id = %L::uuid$$,
    :'lease'
  ),
  '42501',
  null,
  'PRD §10.2: nor its due date'
);

select throws_ok(
  format($$delete from public.charges where lease_id = %L::uuid$$, :'lease'),
  '42501',
  null,
  'PRD §10.2: and a charge is never deleted'
);

-- Cancelling is the sanctioned correction, and it is final.
update public.charges
set
  status = 'cancelled',
  cancelled_at = now(),
  cancelled_by = :'yb_owner'::uuid,
  cancellation_reason = 'Raised against the wrong unit'
where lease_id = :'lease'::uuid and sequence = 4;

select throws_ok(
  format(
    $$update public.charges set status = 'open', cancelled_at = null,
      cancellation_reason = null, cancelled_by = null
      where lease_id = %L::uuid and sequence = 4$$,
    :'lease'
  ),
  '42501',
  null,
  'PRD §10.2: a cancelled charge cannot be reopened'
);

-- ---------------------------------------------------------------------------
-- Who can see a charge (ORG-8)
-- ---------------------------------------------------------------------------
select tests.authenticate(:'yb_tenant_user'::uuid, 'tenant@yabalets.ng');
select is(
  (select count(*) from public.charges where lease_id = :'lease'::uuid),
  4::bigint,
  'TENANT-2: a tenant can see what they have been charged'
);

select tests.authenticate(:'outsider'::uuid, 'outsider@other.ng');
select is(
  (select count(*) from public.charges),
  0::bigint,
  'ORG-8: someone outside the organisation sees no charges at all'
);

-- ---------------------------------------------------------------------------
-- Audited, because money changing is the first category ORG-5 names
-- ---------------------------------------------------------------------------
select tests.as_owner();
select is(
  (select count(*) from public.audit_events
    where entity_type = 'charge' and action = 'charge.created'),
  6::bigint,
  'ORG-5: every charge raised is audited'
);

select is(
  (select action from public.audit_events
    where entity_type = 'charge' order by occurred_at desc, id desc limit 1),
  'charge.status_changed',
  'ORG-5: cancelling a charge reads as a status change, not a generic update'
);

select * from finish();

rollback;
