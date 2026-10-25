-- Applying a validated spreadsheet import (PROP-4, PROP-5, MIG-3 foundation).

begin;
select plan(12);

select tests.as_owner();

insert into public.plans (id, name, unit_limit, price_kobo, billing_period, trial_days)
values ('trial', 'Trial', 10, 0, 'monthly', 14)
on conflict (id) do nothing;

select tests.create_user('owner@yabaproperties.ng') as yb_owner \gset

select tests.authenticate(:'yb_owner'::uuid, 'owner@yabaproperties.ng');
select public.create_organisation_with_owner('Yaba Properties', 'agency', 'Yaba Owner') as yb_org \gset

insert into public.import_batches (organisation_id, kind, status, file_name, row_count, valid_count)
values (:'yb_org'::uuid, 'properties_units', 'draft', 'portfolio.xlsx', 3, 3)
returning id as batch \gset

-- Two units in one building plus one in another, with the landlord repeated —
-- the shape an agency spreadsheet actually takes.
insert into public.import_rows (organisation_id, batch_id, row_number, raw, status)
values
  (:'yb_org'::uuid, :'batch'::uuid, 2, jsonb_build_object(
     'propertyName','Herbert Macaulay Court','propertyType','residential',
     'addressLine','44 Herbert Macaulay Way','stateCode','LA','lga','Yaba',
     'landlordName','Tunde Bakare','unitLabel','Flat 1','unitType','flat',
     'unitStatus','occupied','bedrooms','3','askingRentKobo','120000000'), 'valid'),
  (:'yb_org'::uuid, :'batch'::uuid, 3, jsonb_build_object(
     'propertyName','Herbert Macaulay Court','propertyType','residential',
     'addressLine','44 Herbert Macaulay Way','stateCode','LA','lga','Yaba',
     'landlordName','Tunde Bakare','unitLabel','Flat 2','unitType','flat',
     'unitStatus','vacant','bedrooms','2','askingRentKobo','95000000'), 'valid'),
  (:'yb_org'::uuid, :'batch'::uuid, 4, jsonb_build_object(
     'propertyName','Montgomery Shops','propertyType','commercial',
     'addressLine','7 Montgomery Road','stateCode','LA','lga','Yaba',
     'landlordName','Tunde Bakare','unitLabel','Shop A','unitType','shop',
     'unitStatus','vacant','askingRentKobo','45000000'), 'valid');

-- --- MIG-3: only a validated batch may be applied -------------------------
select throws_ok(
  format('select * from public.apply_property_import(%L)', :'batch'::uuid),
  '22023',
  null,
  'MIG-3: a draft batch cannot be applied; a dry run must validate it first'
);

select tests.as_owner();
update public.import_batches set status = 'validated', validated_at = now()
where id = :'batch'::uuid;

select tests.authenticate(:'yb_owner'::uuid, 'owner@yabaproperties.ng');

select results_eq(
  format('select * from public.apply_property_import(%L)', :'batch'::uuid),
  $$values (2, 3, 1)$$,
  'PROP-4: applying creates 2 properties, 3 units and 1 landlord'
);

select tests.as_owner();

select is(
  (select count(*)::int from public.properties where organisation_id = :'yb_org'::uuid),
  2,
  'PROP-4: the repeated property is created once, not once per row'
);
select is(
  (select count(*)::int from public.landlords where organisation_id = :'yb_org'::uuid),
  1,
  'PROP-4: the repeated landlord is created once'
);
select is(
  (select count(*)::int from public.units where organisation_id = :'yb_org'::uuid),
  3,
  'PROP-4: every row produces a unit'
);
select is(
  (select asking_rent_kobo from public.units where label = 'Flat 1'),
  120000000::bigint,
  'PROP-4: rent is stored as integer kobo (PRD §10.1)'
);
select is(
  (select status::text from public.units where label = 'Flat 1'),
  'occupied',
  'PROP-3: the imported occupancy status is kept'
);

-- Every row records what it created, which is what rollback will need.
select is(
  (select count(*)::int from public.import_rows
    where batch_id = :'batch'::uuid and status = 'applied' and created_entity_id is not null),
  3,
  'MIG-3: each row records the entity it created, so the batch can be rolled back'
);
select is(
  (select status::text from public.import_batches where id = :'batch'::uuid),
  'applied',
  'PROP-4: the batch is marked applied'
);
select is(
  (select (after->>'units_created') from public.audit_events
    where action = 'import.applied' order by occurred_at desc limit 1),
  '3',
  'ORG-5: applying an import is audited with what it created'
);
select is(
  (select (before->>'status') from public.audit_events
    where action = 'import.applied' order by occurred_at desc limit 1),
  'validated',
  'ORG-5: the audit entry records the status it moved from'
);

-- --- applying twice -------------------------------------------------------
select tests.authenticate(:'yb_owner'::uuid, 'owner@yabaproperties.ng');
select throws_ok(
  format('select * from public.apply_property_import(%L)', :'batch'::uuid),
  '22023',
  null,
  'PROP-4: an applied batch cannot be applied again, so a retry cannot duplicate the portfolio'
);

select * from finish();
rollback;
