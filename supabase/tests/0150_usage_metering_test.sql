-- Usage metering (BILL-3, TV-148).
--
-- The figures here become invoices, so the tests are about the two things that
-- cost money when they are wrong: the grace that stops a short-lived import
-- inflating a bill, and the immutability of a reading once it is final.

begin;

select plan(29);

select tests.as_owner();

select tests.create_user('owner@surulerelets.ng') as owner \gset
select tests.create_user('manager@surulerelets.ng') as manager \gset
select tests.create_user('outsider@elsewhere.ng') as outsider \gset

select tests.authenticate(:'owner'::uuid, 'owner@surulerelets.ng');
select public.create_organisation_with_owner('Surulere Lets', 'agency', 'Surulere Owner') as org \gset

select tests.as_owner();

update public.subscriptions
set
  plan_id = 'landlord_monthly',
  status = 'active',
  current_period_start = (current_date - 35),
  current_period_end = (current_date - 5)
where organisation_id = :'org'::uuid;

insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
values (:'org'::uuid, :'manager'::uuid, 'property_manager', 'active', now());

insert into public.landlords (organisation_id, display_name)
values (:'org'::uuid, 'Alhaji Sule')
returning id as landlord \gset

insert into public.properties (
  organisation_id, landlord_id, name, property_type, address_line, state_code
)
values (
  :'org'::uuid, :'landlord'::uuid, 'Sule Court', 'residential', '7 Bode Thomas', 'LA'
)
returning id as property \gset

insert into public.units (organisation_id, property_id, label, unit_type)
select :'org'::uuid, :'property'::uuid, 'Flat ' || n, 'flat'
from generate_series(1, 24) as n;

-- ---------------------------------------------------------------------------
-- The two numbers the product promised
-- ---------------------------------------------------------------------------
select is(
  app.usage_warning_percentage(),
  80,
  'BILL-3 §3.7: the warning threshold is 80%, as published'
);

select is(
  app.usage_grace_days(),
  3,
  'BILL-3 §3.4: the grace after a period ends is 3 days, as published'
);

-- ---------------------------------------------------------------------------
-- Bands
-- ---------------------------------------------------------------------------
select is(app.usage_band(7, 10), 'ok', 'BILL-3: under 80% needs no prompt');
select is(
  app.usage_band(8, 10),
  'approaching',
  'BILL-3: exactly 80% is the prompt, not one unit later'
);
select is(app.usage_band(10, 10), 'reached', 'BILL-3: a full band is reached');
select is(
  app.usage_band(101, 10),
  'reached',
  'BILL-3: over the band is still reached, not a new state'
);
select is(app.usage_band(7, null), 'unlimited', 'BILL-3: there is no percentage of unlimited');

-- 24 of 30 units on Landlord is exactly 80%.
select is(
  (select band from public.usage_warnings() where metric = 'units'),
  'approaching',
  'BILL-3: 24 of 30 units warns, which is the point the upgrade beats the overage'
);

select is(
  (select percentage from public.usage_warnings() where metric = 'units'),
  80,
  'BILL-3: and reports how full the band is'
);

select is(
  (select band from public.usage_warnings() where metric = 'properties'),
  'ok',
  'BILL-3: one property of five is not worth a prompt'
);

-- ---------------------------------------------------------------------------
-- Taking a reading
-- ---------------------------------------------------------------------------
select public.take_usage_reading(:'org'::uuid, (current_date - 35), (current_date - 5)) as reading \gset

select is(
  (select status from public.usage_readings where id = :'reading'::uuid),
  'provisional'::public.usage_reading_status,
  'TV-148: a reading starts provisional, because the grace has not run'
);

select is(
  (select units from public.usage_readings where id = :'reading'::uuid),
  24,
  'TV-148: and records the active units'
);

select is(
  (select unit_limit from public.usage_readings where id = :'reading'::uuid),
  30,
  'TV-148: with the plan band as it was, so a later plan change cannot rewrite the invoice'
);

select is(
  (select storage_mb from public.usage_readings where id = :'reading'::uuid),
  null,
  'TV-148: storage is null, not zero — nothing measures it yet and zero is a figure an invoice would believe'
);

select is(
  public.take_usage_reading(:'org'::uuid, (current_date - 35), (current_date - 5)),
  :'reading'::uuid,
  'TV-148: a retried job refreshes the same reading rather than creating a second basis for one invoice'
);

select is(
  (select count(*) from public.usage_readings where organisation_id = :'org'::uuid),
  1::bigint,
  'TV-148: so there is still one reading for the period'
);

-- ---------------------------------------------------------------------------
-- The grace
-- ---------------------------------------------------------------------------
select public.take_usage_reading(:'org'::uuid, (current_date - 20), (current_date - 1)) as fresh_reading \gset

select throws_ok(
  format($$select public.finalise_usage_reading(%L::uuid)$$, :'fresh_reading'),
  '22023',
  null,
  'TV-148 §3.4: a reading cannot be made final before its 3 days are up'
);

-- A short-lived import: 24 units at period end, 4 of them archived two days
-- later. The bill follows the lower figure.
update public.units
set
  status = 'inactive'
where organisation_id = :'org'::uuid
  and label in ('Flat 21', 'Flat 22', 'Flat 23', 'Flat 24');

select is(
  (
    select units
    from public.finalise_usage_reading(:'reading'::uuid)
  ),
  20,
  'TV-148 §3.4: a short-lived import does not inflate the bill — the lower figure wins'
);

select is(
  (select status from public.usage_readings where id = :'reading'::uuid),
  'final'::public.usage_reading_status,
  'TV-148: and the reading is now final'
);

-- Growth inside the grace window does not raise the figure either. The grace
-- cuts one way on purpose.
select public.take_usage_reading(:'org'::uuid, (current_date - 60), (current_date - 40)) as old_reading \gset

insert into public.units (organisation_id, property_id, label, unit_type)
select :'org'::uuid, :'property'::uuid, 'Flat ' || n, 'flat'
from generate_series(25, 28) as n;

select is(
  (
    select units
    from public.finalise_usage_reading(:'old_reading'::uuid)
  ),
  20,
  'TV-148: growth during the grace does not raise the figure, only a fall lowers it'
);

-- ---------------------------------------------------------------------------
-- A final reading is a record (PRD §10.2)
-- ---------------------------------------------------------------------------
select throws_ok(
  format($$update public.usage_readings set units = 1 where id = %L::uuid$$, :'reading'),
  '42501',
  null,
  'PRD §10.2: a final reading cannot be rewritten'
);

select throws_ok(
  format($$delete from public.usage_readings where id = %L::uuid$$, :'reading'),
  '42501',
  null,
  'PRD §10.2: nor deleted'
);

-- ---------------------------------------------------------------------------
-- What a scheduler calls
-- ---------------------------------------------------------------------------
select lives_ok(
  $$select * from public.record_due_usage_readings()$$,
  'TV-148: the scheduled entry point runs over everything due'
);

select is(
  (
    select count(*)
    from public.usage_readings
    where organisation_id = :'org'::uuid and status = 'provisional'
  ),
  1::bigint,
  'TV-148: it finalised what was past its grace and left the one that is not'
);

-- ---------------------------------------------------------------------------
-- Who can see, and who can meter (ORG-8)
-- ---------------------------------------------------------------------------
select tests.authenticate(:'manager'::uuid, 'manager@surulerelets.ng');

select is(
  (select count(*) from public.usage_readings),
  0::bigint,
  'ORG-8: a property manager does not see the billing basis; that is owner, admin and accountant'
);

select throws_ok(
  format(
    $$select public.take_usage_reading(%L::uuid, current_date - 35, current_date - 5)$$,
    :'org'
  ),
  '42501',
  null,
  'TV-148: a member cannot meter their own organisation, or they would pick the moment usage was lowest'
);

-- The other two metering functions are pinned by privilege rather than by
-- calling them, because calling them would succeed as the owner and prove
-- nothing. The first version of this migration revoked from PUBLIC only, and
-- the image's default privileges had already granted `authenticated` — so this
-- is a guard against that exact regression returning in a later migration.
select ok(
  not has_function_privilege('authenticated', 'public.finalise_usage_reading(uuid)', 'execute'),
  'TV-148: finalising a reading is a job''s privilege, not a member''s'
);

select ok(
  not has_function_privilege('authenticated', 'public.record_due_usage_readings()', 'execute'),
  'TV-148: and so is the scheduled sweep'
);

select tests.authenticate(:'outsider'::uuid, 'outsider@elsewhere.ng');
select is(
  (select count(*) from public.usage_warnings()),
  0::bigint,
  'ORG-8: someone outside the organisation is warned about nothing'
);

select * from finish();

rollback;
