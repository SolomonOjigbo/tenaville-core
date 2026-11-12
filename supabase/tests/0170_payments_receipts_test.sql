-- Payments, allocations and receipt numbering (RENT-2, RENT-3, RENT-4, RENT-13,
-- RENT-14; TV-022, TV-023, TV-024, TV-144).
--
-- The rules that cost money or trust when they are wrong: a payment that is
-- not fully allocated, a receipt number that repeats or is skipped, a replay
-- that takes a second number, a reversal that rewrites history, and a tenant
-- who can see another agency's money.

begin;

select plan(45);

select tests.as_owner();

select tests.create_user('owner@moneylets.ng') as owner \gset
select tests.create_user('tenant@moneylets.ng') as tenant_user \gset
select tests.create_user('outsider@other.ng') as outsider \gset

select tests.authenticate(:'owner'::uuid, 'owner@moneylets.ng');
select public.create_organisation_with_owner('Money Lets', 'agency', 'Money Owner') as org \gset

select tests.as_owner();
insert into public.landlords (organisation_id, display_name)
values (:'org'::uuid, 'Mrs Bello')
returning id as landlord \gset

insert into public.properties (
  organisation_id, landlord_id, name, property_type, address_line, state_code
)
values (
  :'org'::uuid, :'landlord'::uuid, 'Bello Court', 'residential',
  '4 Adeola Odeku Street', 'LA'
)
returning id as property \gset

insert into public.units (organisation_id, property_id, label, unit_type)
values (:'org'::uuid, :'property'::uuid, 'Flat A', 'flat')
returning id as unit \gset

insert into public.tenants (organisation_id, display_name, user_id)
values (:'org'::uuid, 'Tunde Ade', :'tenant_user'::uuid)
returning id as tenant \gset

-- A quarterly lease: four charges of ₦300,000.
select tests.authenticate(:'owner'::uuid, 'owner@moneylets.ng');

select public.create_lease_with_tenant(
  :'org'::uuid, :'unit'::uuid, :'tenant'::uuid,
  date '2026-01-01', date '2026-12-31', 30000000::bigint,
  'quarterly', 'ML/2026/01', null, 'agency', true,
  '[
    {"sequence":1,"period_start":"2026-01-01","period_end":"2026-03-31","due_on":"2026-01-01","amount_kobo":"30000000"},
    {"sequence":2,"period_start":"2026-04-01","period_end":"2026-06-30","due_on":"2026-04-01","amount_kobo":"30000000"},
    {"sequence":3,"period_start":"2026-07-01","period_end":"2026-09-30","due_on":"2026-07-01","amount_kobo":"30000000"},
    {"sequence":4,"period_start":"2026-10-01","period_end":"2026-12-31","due_on":"2026-10-01","amount_kobo":"30000000"}
  ]'::jsonb
) as lease \gset

select id as charge_one from public.charges
where lease_id = :'lease'::uuid and sequence = 1 \gset

select extract(year from (now() at time zone 'Africa/Lagos'))::integer as issue_year \gset

-- ---------------------------------------------------------------------------
-- A payment directed at one charge
-- ---------------------------------------------------------------------------
select * from public.record_payment(
  :'org'::uuid, :'lease'::uuid, 30000000::bigint, 'bank_transfer',
  jsonb_build_array(jsonb_build_object(
    'charge_id', :'charge_one'::uuid,
    'amount_kobo', 30000000
  )),
  date '2026-01-05', 'TRF-0001',
  '11111111-1111-1111-1111-111111111111'::uuid,
  null::uuid, :'tenant'::uuid
) \gset p1_

select is(
  :'p1_receipt_number',
  'R-' || :'issue_year' || '-00001',
  'RENT-13: the first receipt is R-<year>-00001'
);

select is(
  (select count(*) from public.payments where lease_id = :'lease'::uuid),
  1::bigint,
  'RENT-2: one payment was recorded'
);

select is(
  (select status from public.payments where id = :'p1_payment_id'::uuid),
  'recorded'::public.payment_status,
  'RENT-2: a payment starts as recorded, not confirmed'
);

select is(
  (select sum(amount_kobo)::bigint from public.payment_allocations
    where payment_id = :'p1_payment_id'::uuid),
  30000000::bigint,
  'RENT-3: the allocations sum to the payment exactly'
);

select is(
  (select count(*) from public.receipts where lease_id = :'lease'::uuid),
  1::bigint,
  'RENT-13: and exactly one receipt was issued'
);

-- ---------------------------------------------------------------------------
-- Oldest charge first, and an overpayment becomes credit
-- ---------------------------------------------------------------------------
select * from public.record_payment(
  :'org'::uuid, :'lease'::uuid, 100000000::bigint, 'cash',
  null::jsonb, date '2026-02-01', null, null::uuid, null::uuid, :'tenant'::uuid
) \gset p2_

select is(
  :'p2_receipt_number',
  'R-' || :'issue_year' || '-00002',
  'RENT-13: the next receipt is 00002'
);

select is(
  (select count(*) from public.payment_allocations where payment_id = :'p2_payment_id'::uuid),
  4::bigint,
  'RENT-3: an unallocated payment fills the outstanding charges and leaves one credit row'
);

select is(
  (select sum(amount_kobo)::bigint from public.payment_allocations
    where payment_id = :'p2_payment_id'::uuid and charge_id is null),
  10000000::bigint,
  'PRD §10.4: the ₦100,000 overpayment is credit, not a negative charge'
);

select is(
  (select sum(amount_kobo)::bigint from public.payment_allocations
    where payment_id = :'p2_payment_id'::uuid),
  100000000::bigint,
  'RENT-3: and the whole payment is accounted for'
);

select is(
  (
    select c.sequence
    from public.payment_allocations a
    join public.charges c on c.id = a.charge_id
    where a.payment_id = :'p2_payment_id'::uuid
    order by c.due_on
    limit 1
  ),
  2,
  'RENT-14: allocation starts at the oldest unpaid charge, because quarter 1 was paid'
);

-- ---------------------------------------------------------------------------
-- A replayed sync takes no second number (PRD §10.5, MOB-3)
-- ---------------------------------------------------------------------------
select * from public.record_payment(
  :'org'::uuid, :'lease'::uuid, 30000000::bigint, 'bank_transfer',
  jsonb_build_array(jsonb_build_object(
    'charge_id', :'charge_one'::uuid,
    'amount_kobo', 30000000
  )),
  date '2026-01-05', 'TRF-0001',
  '11111111-1111-1111-1111-111111111111'::uuid,
  null::uuid, :'tenant'::uuid
) \gset replay_

select is(
  :'replay_receipt_number'::text,
  :'p1_receipt_number',
  'PRD §10.5: replaying a sync returns the receipt already issued'
);

select is(
  (select count(*) from public.payments where lease_id = :'lease'::uuid),
  2::bigint,
  'PRD §10.5: and creates no second payment'
);

select is(
  (select count(*) from public.receipts where lease_id = :'lease'::uuid),
  2::bigint,
  'PRD §10.5: nor a second receipt'
);

-- ---------------------------------------------------------------------------
-- A rejected payment consumes no number
-- ---------------------------------------------------------------------------
select throws_ok(
  format(
    $$select public.record_payment(%L::uuid, %L::uuid, 5000000::bigint, 'cash',
      jsonb_build_array(jsonb_build_object('charge_id', %L::uuid, 'amount_kobo', 5000000)),
      date '2026-03-01', null, null, null, null)$$,
    :'org', :'lease', :'charge_one'
  ),
  '23514',
  null,
  'RENT-14: an allocation above what a charge still owes is refused'
);

select is(
  (select count(*) from public.payments where lease_id = :'lease'::uuid),
  2::bigint,
  'RENT-13: the refused payment left nothing behind'
);

select * from public.record_payment(
  :'org'::uuid, :'lease'::uuid, 5000000::bigint, 'cash',
  null::jsonb, date '2026-03-01', null, null::uuid, null::uuid, null::uuid
) \gset p3_

select is(
  :'p3_receipt_number',
  'R-' || :'issue_year' || '-00003',
  'RENT-13: the next successful payment takes the next number, with no gap'
);

select is(
  (select sum(amount_kobo)::bigint from public.payment_allocations
    where payment_id = :'p3_payment_id'::uuid and charge_id is null),
  5000000::bigint,
  'PRD §10.4: a payment with no unpaid charge is entirely credit'
);

-- ---------------------------------------------------------------------------
-- Reversal keeps the receipt and its number (RENT-4, RENT-13)
-- ---------------------------------------------------------------------------
select public.reverse_payment(
  :'p1_payment_id'::uuid, 'Recorded against the wrong quarter'
) as reversal_payment \gset

select ok(
  :'reversal_payment'::uuid is not null,
  'RENT-4: a reversal is recorded as its own payment'
);

select is(
  (select status from public.payments where id = :'p1_payment_id'::uuid),
  'reversed'::public.payment_status,
  'RENT-4: the original payment is marked reversed'
);

select is(
  (select status from public.receipts where payment_id = :'p1_payment_id'::uuid),
  'reversed'::public.receipt_status,
  'RENT-13: its receipt is marked reversed rather than deleted'
);

select is(
  (select amount_kobo from public.payments where id = :'reversal_payment'::uuid),
  (-30000000)::bigint,
  'RENT-4: the reversal carries a negated amount'
);

select is(
  (select sum(amount_kobo)::bigint from public.payment_allocations
    where payment_id = :'reversal_payment'::uuid),
  (-30000000)::bigint,
  'RENT-4: and negated allocations, so the charge balance returns'
);

select is(
  (select receipt_number from public.receipts where payment_id = :'p1_payment_id'::uuid),
  :'p1_receipt_number',
  'RENT-13: the voided receipt keeps its original number'
);

select is(
  (
    select (c.amount_kobo - coalesce(sum(a.amount_kobo), 0))::bigint
    from public.charges c
    left join public.payment_allocations a on a.charge_id = c.id
    where c.id = :'charge_one'::uuid
    group by c.amount_kobo
  ),
  30000000::bigint,
  'PRD §10.4: quarter 1 is owed again in full after the reversal'
);

select throws_ok(
  format($$select public.reverse_payment(%L::uuid, 'again')$$, :'p1_payment_id'),
  '23514',
  null,
  'RENT-4: a payment cannot be reversed twice'
);

select throws_ok(
  format($$select public.reverse_payment(%L::uuid, 'undo the undo')$$, :'reversal_payment'),
  '23514',
  null,
  'RENT-4: and a reversal cannot itself be reversed'
);

-- ---------------------------------------------------------------------------
-- Branch numbering is its own sequence (RENT-13)
-- ---------------------------------------------------------------------------
select tests.as_owner();
insert into public.branches (organisation_id, name, receipt_prefix)
values (:'org'::uuid, 'Ikoyi Office', 'IKJ')
returning id as branch \gset

select tests.authenticate(:'owner'::uuid, 'owner@moneylets.ng');

select * from public.record_payment(
  :'org'::uuid, :'lease'::uuid, 5000000::bigint, 'cash',
  null::jsonb, date '2026-03-02', null, null::uuid, :'branch'::uuid, null::uuid
) \gset p4_

select is(
  :'p4_receipt_number',
  'R-IKJ-' || :'issue_year' || '-00001',
  'RENT-13: a branch has its own sequence and code segment'
);

select is(
  (select count(*) from public.receipts where branch_id = :'branch'::uuid),
  1::bigint,
  'RENT-13: and the branch counter has issued one number'
);

-- ---------------------------------------------------------------------------
-- The year is part of the scope, and the sequence restarts in January
-- ---------------------------------------------------------------------------
select tests.as_owner();

select * from app.next_receipt_number(:'org'::uuid, null::uuid, 2027) \gset y27_

select is(
  :'y27_receipt_number'::text,
  'R-2027-00001',
  'RENT-13: a new year restarts the sequence at 1'
);

select * from app.next_receipt_number(:'org'::uuid, null::uuid, 2027) \gset y27b_

select is(
  :'y27b_receipt_number'::text,
  'R-2027-00002',
  'RENT-13: and increments within that year'
);

-- ---------------------------------------------------------------------------
-- Append-only (PRD §10.2, RENT-4)
-- ---------------------------------------------------------------------------
select throws_ok(
  format($$update public.payments set amount_kobo = 1 where id = %L::uuid$$, :'p2_payment_id'),
  '42501',
  null,
  'PRD §10.2: a payment amount cannot be rewritten'
);

select throws_ok(
  format($$delete from public.payments where id = %L::uuid$$, :'p2_payment_id'),
  '42501',
  null,
  'PRD §10.2: and a payment is never deleted'
);

select throws_ok(
  format($$update public.payment_allocations set amount_kobo = 1 where payment_id = %L::uuid$$, :'p2_payment_id'),
  '42501',
  null,
  'RENT-3: an allocation is never changed'
);

select throws_ok(
  format($$update public.receipts set receipt_number = 'R-2026-99999' where id = %L::uuid$$, :'p2_receipt_id'),
  '42501',
  null,
  'RENT-13: a receipt number cannot be renumbered'
);

select throws_ok(
  format($$delete from public.receipts where id = %L::uuid$$, :'p2_receipt_id'),
  '42501',
  null,
  'RENT-13: and a receipt is never deleted'
);

-- ---------------------------------------------------------------------------
-- The allocation sum is enforced at commit, including outside the RPC
-- ---------------------------------------------------------------------------
set constraints all immediate;

select throws_ok(
  format(
    $$insert into public.payments (
        organisation_id, lease_id, amount_kobo, method, paid_on
      ) values (%L::uuid, %L::uuid, 1000, 'cash', date '2026-04-01')$$,
    :'org', :'lease'
  ),
  '23514',
  null,
  'RENT-3: a payment inserted without allocations fails the deferred check'
);

set constraints all deferred;

-- ---------------------------------------------------------------------------
-- Who can see the money (ORG-8)
-- ---------------------------------------------------------------------------
select tests.authenticate(:'tenant_user'::uuid, 'tenant@moneylets.ng');

select is(
  (select count(*) from public.payments where lease_id = :'lease'::uuid),
  5::bigint,
  'TENANT-2: a tenant sees every payment on their tenancy, including reversals'
);

select is(
  (select count(*) from public.receipts where lease_id = :'lease'::uuid),
  4::bigint,
  'TENANT-3: and every receipt for it'
);

select tests.authenticate(:'outsider'::uuid, 'outsider@other.ng');

select is(
  (select count(*) from public.payments),
  0::bigint,
  'ORG-8: someone outside the organisation sees no payments'
);

select is(
  (select count(*) from public.receipts),
  0::bigint,
  'ORG-8: and no receipts'
);

select throws_ok(
  format(
    $$select public.record_payment(%L::uuid, %L::uuid, 1000::bigint, 'cash')$$,
    :'org', :'lease'
  ),
  '42501',
  null,
  'ORG-8: an outsider cannot record a payment against the organisation'
);

-- ---------------------------------------------------------------------------
-- Audited, because money changing is what ORG-5 names first
-- ---------------------------------------------------------------------------
select tests.as_owner();

select ok(
  exists (select 1 from public.audit_events where entity_type = 'payment'),
  'ORG-5: payments are audited'
);

select ok(
  exists (select 1 from public.audit_events where entity_type = 'receipt'),
  'ORG-5: receipts are audited'
);

-- ---------------------------------------------------------------------------
-- The receipt prefix is locked once numbering has started (RENT-13)
-- ---------------------------------------------------------------------------
select tests.authenticate(:'owner'::uuid, 'owner@moneylets.ng');

select throws_ok(
  format($$update public.organisations set receipt_prefix = 'X' where id = %L::uuid$$, :'org'),
  '42501',
  null,
  'RENT-13: the prefix is locked after the first receipt'
);

select tests.as_owner();

select is(
  (select count(distinct receipt_number) from public.receipts where organisation_id = :'org'::uuid),
  (select count(*) from public.receipts where organisation_id = :'org'::uuid),
  'RENT-13: no receipt number appears twice'
);

select * from finish();

rollback;
