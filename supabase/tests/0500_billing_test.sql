-- Billing lifecycle (BILL-1, BILL-2, BILL-3).

begin;

select plan(22);

select tests.as_owner();



select tests.create_user('bill-owner@yabalets.ng') as owner \gset
select tests.create_user('bill-admin@yabalets.ng') as admin \gset
select tests.create_user('bill-accountant@yabalets.ng') as accountant \gset
select tests.create_user('bill-outsider@other.ng') as outsider \gset

select tests.authenticate(:'owner'::uuid, 'bill-owner@yabalets.ng');
select public.create_organisation_with_owner('Billing Lets', 'agency', 'Bill Owner') as org \gset

select tests.as_owner();
insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
values
  (:'org'::uuid, :'admin'::uuid, 'admin', 'active', now()),
  (:'org'::uuid, :'accountant'::uuid, 'accountant', 'active', now());

-- ---------------------------------------------------------------------------
-- Upgrade and invoice
-- ---------------------------------------------------------------------------
select tests.authenticate(:'owner'::uuid, 'bill-owner@yabalets.ng');

select public.change_subscription_plan(
  :'org'::uuid, 'landlord_monthly', 'Moving off the trial'
) as invoice_one \gset

select is(
  (select plan_id from public.subscriptions where organisation_id = :'org'::uuid),
  'landlord_monthly',
  'BILL-1: an owner can upgrade the plan'
);

select is(
  (select status from public.subscriptions where organisation_id = :'org'::uuid),
  'active'::public.subscription_status,
  'an upgrade from trial starts the paid subscription'
);

select is(
  (select status from public.billing_invoices where id = :'invoice_one'::uuid),
  'open'::public.billing_invoice_status,
  'BILL-2: the upgrade issues an open invoice'
);

select is(
  (select total_kobo from public.billing_invoices where id = :'invoice_one'::uuid),
  999900::bigint,
  'the invoice carries the new plan price'
);

select matches(
  (select invoice_number from public.billing_invoices where id = :'invoice_one'::uuid),
  '^INV-[0-9]{4}-[0-9]{4}$',
  'the invoice has a yearly numbered reference'
);

select is(
  (select kind from public.billing_invoice_lines where invoice_id = :'invoice_one'::uuid),
  'subscription'::public.billing_invoice_line_kind,
  'the invoice has a subscription line'
);

select is(
  (select kind from public.subscription_changes where organisation_id = :'org'::uuid),
  'upgrade'::public.subscription_change_kind,
  'the plan change is recorded as an upgrade'
);

select tests.authenticate(:'admin'::uuid, 'bill-admin@yabalets.ng');

select throws_ok(
  format(
    $$select public.change_subscription_plan(%L::uuid, 'agent_monthly', 'Admin trying')$$,
    :'org'
  ),
  '42501',
  null,
  'an admin cannot change the plan'
);

-- ---------------------------------------------------------------------------
-- Downgrade guard
-- ---------------------------------------------------------------------------
select tests.as_owner();
insert into public.landlords (organisation_id, display_name)
values (:'org'::uuid, 'Bill Landlord')
returning id as landlord \gset

insert into public.properties (
  organisation_id, landlord_id, name, property_type, address_line, state_code
)
values (:'org'::uuid, :'landlord'::uuid, 'Bill Court', 'residential', '1 Invoice Road', 'LA')
returning id as property \gset

insert into public.units (organisation_id, property_id, label, unit_type)
select :'org'::uuid, :'property'::uuid, g::text, 'flat'
from generate_series(1, 11) g;

select tests.authenticate(:'owner'::uuid, 'bill-owner@yabalets.ng');

select throws_ok(
  format(
    $$select public.change_subscription_plan(%L::uuid, 'free', 'Trying to shrink too far')$$,
    :'org'
  ),
  '23514',
  null,
  'BILL-3: a downgrade is refused when the organisation has more units than the plan allows'
);

select public.change_subscription_plan(
  :'org'::uuid, 'agent_monthly', 'Growing the portfolio'
) as invoice_two \gset

select is(
  (select plan_id from public.subscriptions where organisation_id = :'org'::uuid),
  'agent_monthly',
  'an upgrade within the limits is applied'
);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
select lives_ok(
  format(
    $$select public.record_invoice_payment(%L::uuid, 300000::bigint, 'bank_transfer', 'TRX-1', current_date)$$,
    :'invoice_one'
  ),
  'BILL-2: a partial bank transfer can be recorded'
);

select is(
  (select amount_paid_kobo from public.billing_invoices where id = :'invoice_one'::uuid),
  300000::bigint,
  'the partial payment is added to the invoice'
);

select is(
  (select status from public.billing_invoices where id = :'invoice_one'::uuid),
  'open'::public.billing_invoice_status,
  'a partial payment leaves the invoice open'
);

select lives_ok(
  format(
    $$select public.record_invoice_payment(%L::uuid, 699900::bigint, 'bank_transfer', 'TRX-2', current_date)$$,
    :'invoice_one'
  ),
  'the remaining balance can be paid'
);

select is(
  (select status from public.billing_invoices where id = :'invoice_one'::uuid),
  'paid'::public.billing_invoice_status,
  'a fully paid invoice closes'
);

select is(
  (select count(*) from public.billing_invoice_payments where invoice_id = :'invoice_one'::uuid),
  2::bigint,
  'both payments are kept in the log'
);

select throws_ok(
  format(
    $$select public.record_invoice_payment(%L::uuid, 3399901::bigint, 'cash', null, current_date)$$,
    :'invoice_two'
  ),
  '23514',
  null,
  'a payment above the unpaid balance is refused'
);

-- ---------------------------------------------------------------------------
-- Overage invoice (BILL-2)
-- ---------------------------------------------------------------------------
select tests.as_owner();
insert into public.usage_readings (
  organisation_id, period_start, period_end, status, plan_id,
  unit_limit, unit_overage_kobo, units, properties, users, finalised_at
)
values (
  :'org'::uuid, date '2026-01-01', date '2026-01-31', 'final', 'agent_monthly',
  100, 27500, 102, 1, 3, now()
);

select tests.authenticate(:'owner'::uuid, 'bill-owner@yabalets.ng');

select public.generate_subscription_invoice(
  :'org'::uuid, date '2026-01-01', date '2026-01-31'
) as invoice_three \gset

select is(
  (select total_kobo from public.billing_invoices where id = :'invoice_three'::uuid),
  3454900::bigint,
  'a final reading with two units over the allowance adds overage to the invoice'
);

select is(
  (select quantity from public.billing_invoice_lines where invoice_id = :'invoice_three'::uuid and kind = 'unit_overage'),
  2,
  'the overage line records the number of units above the plan allowance'
);

select throws_ok(
  format(
    $$select public.generate_subscription_invoice(%L::uuid, date '2026-01-01', date '2026-01-31')$$,
    :'org'
  ),
  '23514',
  null,
  'a second invoice for the same period is refused'
);

-- ---------------------------------------------------------------------------
-- Who can see invoices
-- ---------------------------------------------------------------------------
select tests.authenticate(:'accountant'::uuid, 'bill-accountant@yabalets.ng');

select is(
  (select count(*) from public.billing_invoices),
  3::bigint,
  'an accountant sees the invoice history'
);

select tests.authenticate(:'outsider'::uuid, 'bill-outsider@other.ng');

select is(
  (select count(*) from public.billing_invoices),
  0::bigint,
  'someone outside the organisation sees no invoices'
);

select * from finish();

rollback;
