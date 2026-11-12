-- Landlord ledger (LEDGER-1, LEDGER-4, LEDGER-9).
--
-- The rules that matter: rent credits the landlord, commission debits it as
-- agency income, a remittance debits it, and a reversal mirrors both entries
-- without editing either. Client funds and agency income stay separate.

begin;

select plan(26);

select tests.as_owner();

select tests.create_user('ledger-owner@yabalets.ng') as owner \gset
select tests.create_user('ledger-tenant@yabalets.ng') as tenant_user \gset
select tests.create_user('ledger-outsider@other.ng') as outsider \gset

select tests.authenticate(:'owner'::uuid, 'ledger-owner@yabalets.ng');
select public.create_organisation_with_owner('Ledger Lets', 'agency', 'Ledger Owner') as org \gset

select tests.as_owner();
insert into public.landlords (organisation_id, display_name)
values (:'org'::uuid, 'Mrs Ledger')
returning id as landlord \gset

insert into public.properties (
  organisation_id, landlord_id, name, property_type, address_line, state_code
)
values (:'org'::uuid, :'landlord'::uuid, 'Ledger Court', 'residential', '1 Ledger Road', 'LA')
returning id as property \gset

insert into public.units (organisation_id, property_id, label, unit_type)
values (:'org'::uuid, :'property'::uuid, 'Flat L', 'flat')
returning id as unit \gset

insert into public.tenants (organisation_id, display_name, user_id)
values (:'org'::uuid, 'Ledger Tenant', :'tenant_user'::uuid)
returning id as tenant \gset

select tests.authenticate(:'owner'::uuid, 'ledger-owner@yabalets.ng');
select public.create_lease_with_tenant(
  :'org'::uuid, :'unit'::uuid, :'tenant'::uuid,
  date '2026-01-01', date '2026-12-31', 30000000::bigint,
  'quarterly', 'LL/2026/01', null, 'agency', true,
  '[
    {"sequence":1,"period_start":"2026-01-01","period_end":"2026-03-31","due_on":"2026-01-01","amount_kobo":"30000000"},
    {"sequence":2,"period_start":"2026-04-01","period_end":"2026-06-30","due_on":"2026-04-01","amount_kobo":"30000000"},
    {"sequence":3,"period_start":"2026-07-01","period_end":"2026-09-30","due_on":"2026-07-01","amount_kobo":"30000000"},
    {"sequence":4,"period_start":"2026-10-01","period_end":"2026-12-31","due_on":"2026-10-01","amount_kobo":"30000000"}
  ]'::jsonb
) as lease \gset

select id as charge_one from public.charges
where lease_id = :'lease'::uuid and sequence = 1 \gset

select tests.as_owner();
insert into public.management_mandates (
  organisation_id, landlord_id, commission_type, commission_rate_bps,
  commission_basis, starts_on
)
values (:'org'::uuid, :'landlord'::uuid, 'percentage', 1000, 'on_receipt', date '2026-01-01')
returning id as mandate \gset

-- ---------------------------------------------------------------------------
-- A receipt posts rent and commission once
-- ---------------------------------------------------------------------------
select tests.authenticate(:'owner'::uuid, 'ledger-owner@yabalets.ng');

select * from public.record_payment(
  :'org'::uuid, :'lease'::uuid, 30000000::bigint, 'bank_transfer',
  jsonb_build_array(jsonb_build_object('charge_id', :'charge_one'::uuid, 'amount_kobo', 30000000)),
  date '2026-01-05', 'LEDGER-001',
  '22222222-2222-2222-2222-222222222222'::uuid,
  null::uuid, :'tenant'::uuid
) \gset payment_

select is(
  (select count(*) from public.landlord_ledger_entries where landlord_id = :'landlord'::uuid),
  2::bigint,
  'LEDGER-1: one receipt posts rent and commission'
);

select is(
  (select sum(amount_kobo)::bigint from public.landlord_ledger_entries
    where entry_kind = 'rent_collected'),
  30000000::bigint,
  'LEDGER-1: the rent allocation credits the landlord in full'
);

select is(
  (select funds_class::text from public.landlord_ledger_entries
    where entry_kind = 'rent_collected'),
  'client_funds',
  'LEDGER-4: collected rent is client money'
);

select is(
  (select amount_kobo from public.landlord_ledger_entries where entry_kind = 'commission'),
  (-3000000)::bigint,
  'LEDGER-9: 10% commission on ₦300,000 is ₦30,000, debited'
);

select is(
  (select funds_class::text from public.landlord_ledger_entries where entry_kind = 'commission'),
  'agency_income',
  'LEDGER-4: commission is agency income, not client funds'
);

select is(
  (select commission_rate_bps || ':' || commission_base_kobo
    from public.landlord_ledger_entries where entry_kind = 'commission'),
  '1000:30000000',
  'LEDGER-9: the rate and base are frozen on the entry'
);

select is(
  (select sum(amount_kobo)::bigint from public.landlord_ledger_entries where landlord_id = :'landlord'::uuid),
  27000000::bigint,
  'the balance is rent less commission'
);

select * from public.record_payment(
  :'org'::uuid, :'lease'::uuid, 30000000::bigint, 'bank_transfer',
  jsonb_build_array(jsonb_build_object('charge_id', :'charge_one'::uuid, 'amount_kobo', 30000000)),
  date '2026-01-05', 'LEDGER-001',
  '22222222-2222-2222-2222-222222222222'::uuid,
  null::uuid, :'tenant'::uuid
) \gset replay_

select is(
  (select count(*) from public.landlord_ledger_entries where landlord_id = :'landlord'::uuid),
  2::bigint,
  'a replayed sync does not post twice'
);

select is(
  (select count(*) from public.receipts where lease_id = :'lease'::uuid),
  1::bigint,
  'and does not issue a second receipt'
);

-- ---------------------------------------------------------------------------
-- A remittance debits the balance
-- ---------------------------------------------------------------------------
select tests.as_owner();

select public.record_remittance(
  :'org'::uuid, :'landlord'::uuid, 20000000::bigint, date '2026-02-01',
  'bank_transfer', 'REM-001'
) as remittance \gset

select is(
  (select amount_kobo from public.remittances where id = :'remittance'::uuid),
  20000000::bigint,
  'LEDGER-1: the remittance is recorded'
);

select is(
  (select amount_kobo from public.landlord_ledger_entries where entry_kind = 'remittance'),
  (-20000000)::bigint,
  'LEDGER-1: paying the landlord debits the ledger'
);

select is(
  (select sum(amount_kobo)::bigint from public.landlord_ledger_entries where landlord_id = :'landlord'::uuid),
  7000000::bigint,
  'the balance is rent less commission and remittance'
);

-- ---------------------------------------------------------------------------
-- Reversal mirrors the entries
-- ---------------------------------------------------------------------------
select tests.authenticate(:'owner'::uuid, 'ledger-owner@yabalets.ng');

select public.reverse_payment(:'payment_payment_id'::uuid, 'Wrong quarter') as reversal_id \gset

select is(
  (select count(*) from public.landlord_ledger_entries where entry_kind = 'adjustment'),
  2::bigint,
  'a reversal appends one adjustment per original entry'
);

select is(
  (select sum(amount_kobo)::bigint from public.landlord_ledger_entries where entry_kind = 'adjustment'),
  (-27000000)::bigint,
  'the adjustments net out rent and commission'
);

select is(
  (select sum(amount_kobo)::bigint from public.landlord_ledger_entries where landlord_id = :'landlord'::uuid),
  (-20000000)::bigint,
  'after a reversal and a remittance the landlord is owed a negative balance'
);

select is(
  (select amount_kobo from public.landlord_ledger_entries
    where reverses_entry_id = (
      select id from public.landlord_ledger_entries where entry_kind = 'rent_collected'
    )),
  (-30000000)::bigint,
  'the rent adjustment is the negative of its original entry'
);

select is(
  (select amount_kobo from public.landlord_ledger_entries
    where reverses_entry_id = (
      select id from public.landlord_ledger_entries where entry_kind = 'commission'
    )),
  3000000::bigint,
  'and the commission adjustment gives the commission back'
);

-- ---------------------------------------------------------------------------
-- Who can see the ledger (LEDGER-5)
-- ---------------------------------------------------------------------------
select tests.authenticate(:'tenant_user'::uuid, 'ledger-tenant@yabalets.ng');

select is(
  (select count(*) from public.landlord_ledger_entries),
  0::bigint,
  'LEDGER-5: a tenant sees no landlord ledger'
);

select tests.authenticate(:'outsider'::uuid, 'ledger-outsider@other.ng');

select is(
  (select count(*) from public.landlord_ledger_entries),
  0::bigint,
  'LEDGER-5: someone outside the organisation sees nothing'
);

select is(
  (select count(*) from public.remittances),
  0::bigint,
  'LEDGER-5: and no remittances'
);

-- ---------------------------------------------------------------------------
-- Append-only
-- ---------------------------------------------------------------------------
select tests.as_owner();

select throws_ok(
  format($$update public.landlord_ledger_entries set amount_kobo = 1 where landlord_id = %L::uuid$$, :'landlord'),
  '42501',
  null,
  'a ledger entry cannot be rewritten'
);

select throws_ok(
  format($$delete from public.landlord_ledger_entries where landlord_id = %L::uuid$$, :'landlord'),
  '42501',
  null,
  'nor deleted'
);

select throws_ok(
  format($$update public.remittances set amount_kobo = 1 where id = %L::uuid$$, :'remittance'),
  '42501',
  null,
  'a remittance cannot be rewritten'
);

select throws_ok(
  format($$delete from public.remittances where id = %L::uuid$$, :'remittance'),
  '42501',
  null,
  'nor deleted'
);

select ok(
  exists (
    select 1 from public.audit_events where entity_type = 'landlord_ledger_entry'
  ),
  'ORG-5: ledger postings are audited'
);

select ok(
  exists (select 1 from public.audit_events where entity_type = 'remittance'),
  'ORG-5: remittances are audited'
);

select * from finish();

rollback;
