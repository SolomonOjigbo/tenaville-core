-- PROP-1/PROP-2 lifecycle and MIG-1/MIG-2/MIG-3 import/rollback.

begin;
select plan(32);

select tests.as_owner();

insert into public.plans (id, name, unit_limit, price_kobo, billing_period, trial_days)
values ('trial', 'Trial', 100, 0, 'monthly', 14)
on conflict (id) do nothing;

select tests.create_user('owner@lifecycle.ng') as owner \gset
select tests.create_user('tenant@lifecycle.ng') as tenant_user \gset

select tests.authenticate(:'owner'::uuid, 'owner@lifecycle.ng');
select public.create_organisation_with_owner('Lifecycle Estates', 'agency', 'Lifecycle Owner') as org \gset

select tests.as_owner();
insert into public.landlords (organisation_id, display_name)
values (:'org'::uuid, 'Chief Lifecycle') returning id as landlord \gset
insert into public.properties
  (organisation_id, landlord_id, name, property_type, address_line, state_code)
values (:'org'::uuid, :'landlord'::uuid, 'Lifecycle Court', 'residential', '1 Test Road', 'LA')
returning id as property \gset
insert into public.units (organisation_id, property_id, label, unit_type)
values
  (:'org'::uuid, :'property'::uuid, 'Active Flat', 'flat'),
  (:'org'::uuid, :'property'::uuid, 'Vacant Flat', 'flat'),
  (:'org'::uuid, :'property'::uuid, 'Import Flat', 'flat');
select id as unit_active from public.units where label = 'Active Flat' \gset
select id as unit_vacant from public.units where label = 'Vacant Flat' \gset
select id as unit_import from public.units where label = 'Import Flat' \gset
with inserted as (
  insert into public.tenants (organisation_id, display_name)
  values (:'org'::uuid, 'Active Tenant') returning id
)
select id as tenant_one from inserted \gset

select tests.authenticate(:'owner'::uuid, 'owner@lifecycle.ng');
select public.create_lease_with_tenant(
  :'org'::uuid, :'unit_active'::uuid, :'tenant_one'::uuid,
  date '2026-01-01', date '2026-12-31', 120000000::bigint,
  'annual', 'ACTIVE/001', null, 'agency', true,
  '[{"sequence":1,"period_start":"2026-01-01","period_end":"2026-12-31","due_on":"2026-01-01","amount_kobo":"120000000"}]'::jsonb
) as active_lease \gset

-- --- LEASE-5: handover evidence -------------------------------------------
select lives_ok(
  format($$insert into public.lease_handovers
             (organisation_id, lease_id, kind, happened_on, notes, meter_readings,
              outstanding_balance_kobo, keys_returned, evidence_paths, recorded_by)
           values (%L, %L, 'move_in', current_date, 'Clean and painted',
                   '{"electricity":"1200","water":"42"}'::jsonb, 0, true,
                   array['private/handover/move-in.jpg'], %L)$$,
         :'org'::uuid, :'active_lease'::uuid, :'owner'::uuid),
  'LEASE-5: a move-in handover can be recorded with meters, keys and evidence'
);

select is(
  (select meter_readings->>'electricity' from public.lease_handovers
    where lease_id = :'active_lease'::uuid and kind = 'move_in'),
  '1200',
  'LEASE-5: meter readings are stored'
);

select is(
  (select keys_returned from public.lease_handovers
    where lease_id = :'active_lease'::uuid and kind = 'move_in'),
  true,
  'LEASE-5: key handover is recorded'
);

-- --- PROP-2: archive guard ------------------------------------------------
select throws_ok(
  format('update public.units set archived_at = now() where id = %L', :'unit_active'::uuid),
  '23514',
  null,
  'PROP-2: an occupied unit cannot be archived'
);

select lives_ok(
  format('select public.terminate_lease(%L, current_date, %L)', :'active_lease'::uuid, 'Move-out'),
  'LEASE-5: the active lease can be ended before archiving'
);

select lives_ok(
  format('update public.units set archived_at = now() where id = %L', :'unit_active'::uuid),
  'PROP-2: a vacant unit can be archived'
);

select lives_ok(
  format(
    'update public.units set facilities = array[%L, %L] where id = %L',
    'borehole', 'prepaid meter', :'unit_vacant'::uuid
  ),
  'PROP-2: unit facilities can be edited'
);

select is(
  (select facilities from public.units where id = :'unit_vacant'::uuid),
  array['borehole', 'prepaid meter'],
  'PROP-2: the edited facilities are stored'
);

select lives_ok(
  format(
    'update public.properties set notes = %L, area = %L where id = %L',
    'Updated access note', 'Lekki', :'property'::uuid
  ),
  'PROP-1: property details can be edited'
);

-- --- MIG-1: tenant and lease import ---------------------------------------
insert into public.import_batches (organisation_id, kind, status, file_name, row_count, valid_count)
values (:'org'::uuid, 'tenants_leases', 'validated', 'tenants.csv', 1, 1)
returning id as tenant_batch \gset
insert into public.import_rows (organisation_id, batch_id, row_number, raw, status)
values (
  :'org'::uuid, :'tenant_batch'::uuid, 2,
  jsonb_build_object(
    'tenantName', 'Imported Tenant',
    'tenantEmail', 'imported@lifecycle.ng',
    'tenantPhone', '+2348012345678',
    'leaseReference', 'IMPORT/001',
    'propertyName', 'Lifecycle Court',
    'unitLabel', 'Import Flat',
    'startsOn', '2026-02-01',
    'endsOn', '2027-01-31',
    'rentKobo', '240000000',
    'rentFrequency', 'annual',
    'depositKobo', '20000000',
    'depositCustodian', 'agency'
  ), 'valid'
);

select lives_ok(
  format('select * from public.apply_tenant_lease_import(%L)', :'tenant_batch'::uuid),
  'MIG-1: a validated tenant/lease batch can be applied'
);

select is(
  (select status::text from public.leases where reference = 'IMPORT/001'),
  'active',
  'MIG-1: an imported current tenancy is active'
);

select is(
  (select count(*)::int from public.tenants where email = 'imported@lifecycle.ng'),
  1,
  'MIG-1: the tenant is created once'
);

select is(
  (select amount_kobo from public.lease_deposits d join public.leases l on l.id = d.lease_id
    where l.reference = 'IMPORT/001'),
  20000000::bigint,
  'LEASE-13: the imported deposit is held'
);

select lives_ok(
  format('select public.rollback_import_batch(%L)', :'tenant_batch'::uuid),
  'MIG-3: an applied tenant/lease import can be rolled back before financial history'
);

select is(
  (select count(*)::int from public.leases where reference = 'IMPORT/001'),
  0,
  'MIG-3: rollback removes the imported lease'
);

select is(
  (select count(*)::int from public.tenants where email = 'imported@lifecycle.ng'),
  0,
  'MIG-3: rollback removes the imported tenant'
);

-- --- MIG-2: opening balances ---------------------------------------------
select tests.as_owner();
with inserted as (
  insert into public.tenants (organisation_id, display_name)
  values (:'org'::uuid, 'Opening Tenant') returning id
)
select id as opening_tenant from inserted \gset

select tests.authenticate(:'owner'::uuid, 'owner@lifecycle.ng');
select public.create_lease_with_tenant(
  :'org'::uuid, :'unit_import'::uuid, :'opening_tenant'::uuid,
  date '2026-01-01', date '2026-12-31', 180000000::bigint,
  'annual', 'OPEN/001', null, 'agency', true,
  '[{"sequence":1,"period_start":"2026-01-01","period_end":"2026-12-31","due_on":"2026-01-01","amount_kobo":"180000000"}]'::jsonb
) as opening_lease \gset

select throws_ok(
  format('update public.properties set archived_at = now() where id = %L', :'property'::uuid),
  '23514',
  null,
  'PROP-1: a property with an active lease cannot be archived'
);

insert into public.import_batches
  (organisation_id, kind, status, file_name, row_count, valid_count, cutover_on)
values
  (:'org'::uuid, 'opening_balances', 'validated', 'opening.csv', 4, 4, current_date)
returning id as opening_batch \gset

insert into public.import_rows (organisation_id, batch_id, row_number, raw, status)
values
  (:'org'::uuid, :'opening_batch'::uuid, 2,
   jsonb_build_object('accountType','tenant_arrears','leaseReference','OPEN/001','amountKobo','10000000','notes','Arrears'), 'valid'),
  (:'org'::uuid, :'opening_batch'::uuid, 3,
   jsonb_build_object('accountType','tenant_credit','leaseReference','OPEN/001','amountKobo','5000000','notes','Credit'), 'valid'),
  (:'org'::uuid, :'opening_batch'::uuid, 4,
   jsonb_build_object('accountType','landlord_credit','landlordName','Chief Lifecycle','amountKobo','20000000','notes','Held'), 'valid'),
  (:'org'::uuid, :'opening_batch'::uuid, 5,
   jsonb_build_object('accountType','landlord_debit','landlordName','Chief Lifecycle','amountKobo','2000000','notes','Owed'), 'valid');

select lives_ok(
  format('select * from public.apply_opening_balance_import(%L)', :'opening_batch'::uuid),
  'MIG-2: an opening balance batch can be applied'
);

select is(
  (select amount_kobo from public.charges where lease_id = :'opening_lease'::uuid and kind = 'opening_balance'),
  10000000::bigint,
  'MIG-2: tenant arrears are a labelled opening charge'
);

select is(
  (select method::text from public.payments where lease_id = :'opening_lease'::uuid and method = 'opening_balance'),
  'opening_balance',
  'MIG-2: tenant credit is labelled as an opening balance'
);

select is(
  (select count(*)::int from public.landlord_ledger_entries
    where entry_kind = 'opening_balance' and landlord_id = :'landlord'::uuid),
  2,
  'MIG-2: both landlord directions post as opening ledger entries'
);

select isnt(
  (select opening_balances_confirmed_at from public.organisations where id = :'org'::uuid),
  null::timestamptz,
  'MIG-2: applying confirms the cutover'
);

select lives_ok(
  format('select public.rollback_import_batch(%L)', :'opening_batch'::uuid),
  'MIG-3: an opening balance batch can be rolled back'
);

select is(
  (select status::text from public.charges where lease_id = :'opening_lease'::uuid and kind = 'opening_balance'),
  'cancelled',
  'MIG-3: rollback cancels the opening arrears charge'
);

select is(
  (select status::text from public.payments where lease_id = :'opening_lease'::uuid and method = 'opening_balance' and reversal_of_id is null),
  'reversed',
  'MIG-3: rollback reverses the opening credit payment'
);

select is(
  (select count(*)::int from public.landlord_ledger_entries
    where entry_kind = 'adjustment' and reverses_entry_id is not null),
  2,
  'MIG-3: rollback reverses both opening ledger entries without deleting them'
);

select is(
  (select opening_balances_confirmed_at from public.organisations where id = :'org'::uuid),
  null::timestamptz,
  'MIG-3: rollback clears the cutover confirmation'
);

select is(
  (select status::text from public.import_batches where id = :'opening_batch'::uuid),
  'rolled_back',
  'MIG-3: the opening balance batch records its rollback'
);

-- --- archive after the opening lease ends ---------------------------------
select lives_ok(
  format('select public.terminate_lease(%L, current_date, %L)', :'opening_lease'::uuid, 'Ended'),
  'LEASE-5: the opening lease can be terminated'
);

select lives_ok(
  format('update public.properties set archived_at = now() where id = %L', :'property'::uuid),
  'PROP-1: a property with no active lease can be archived'
);

select isnt(
  (select archived_at from public.properties where id = :'property'::uuid),
  null::timestamptz,
  'PROP-1: the archive timestamp is recorded'
);

select isnt(
  (select archived_at from public.units where id = :'unit_active'::uuid),
  null::timestamptz,
  'PROP-2: the archive timestamp on a unit is recorded'
);

select * from finish();
rollback;
