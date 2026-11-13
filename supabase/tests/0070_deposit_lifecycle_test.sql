-- Caution deposit lifecycle (LEASE-13, PRD §10.2, §10.17).
--
-- A deposit is client money. The lifecycle is what lets an agency answer, at
-- move-out, exactly what was held, what was deducted, why, and who approved it
-- — which is the dispute this exists to prevent.

begin;
select plan(27);

select tests.as_owner();

insert into public.plans (id, name, unit_limit, price_kobo, billing_period, trial_days)
values ('trial', 'Trial', 10, 0, 'monthly', 14)
on conflict (id) do nothing;

select tests.create_user('owner@ajah.ng')      as aj_owner  \gset
select tests.create_user('accounts@ajah.ng')   as aj_acct   \gset
select tests.create_user('agent@ajah.ng')      as aj_agent  \gset
select tests.create_user('tenant@ajah.ng')     as aj_tenant \gset

select tests.authenticate(:'aj_owner'::uuid, 'owner@ajah.ng');
select public.create_organisation_with_owner('Ajah Homes', 'agency', 'Ajah Owner') as aj_org \gset

select tests.as_owner();

insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
values
  (:'aj_org'::uuid, :'aj_acct'::uuid,   'accountant',    'active', now()),
  (:'aj_org'::uuid, :'aj_agent'::uuid,  'letting_agent', 'active', now()),
  (:'aj_org'::uuid, :'aj_tenant'::uuid, 'tenant',        'active', now());

insert into public.assignments (organisation_id, user_id, scope_type)
values
  (:'aj_org'::uuid, :'aj_acct'::uuid,  'organisation'),
  (:'aj_org'::uuid, :'aj_agent'::uuid, 'organisation');

insert into public.landlords (organisation_id, display_name)
values (:'aj_org'::uuid, 'Chief Balogun') returning id as landlord \gset
insert into public.properties
  (organisation_id, landlord_id, name, property_type, address_line, state_code)
values (:'aj_org'::uuid, :'landlord'::uuid, 'Balogun Villas', 'residential', '10 Addo Road', 'LA')
returning id as property \gset
insert into public.units (organisation_id, property_id, label, unit_type)
values (:'aj_org'::uuid, :'property'::uuid, 'Unit 1', 'flat') returning id as unit \gset
insert into public.tenants (organisation_id, user_id, display_name)
values (:'aj_org'::uuid, :'aj_tenant'::uuid, 'Grace Udo') returning id as tenant \gset

select tests.authenticate(:'aj_owner'::uuid, 'owner@ajah.ng');
select public.create_lease_with_tenant(
  :'aj_org'::uuid, :'unit'::uuid, :'tenant'::uuid,
  current_date - 365, current_date - 1, 100000000::bigint,
  'annual', 'AJ/001', 20000000::bigint, 'agency', false
) as lease \gset

select tests.as_owner();
select id as deposit from public.lease_deposits where lease_id = :'lease'::uuid \gset

-- --- the lifecycle --------------------------------------------------------
select is(
  (select status::text from public.lease_deposits where id = :'deposit'::uuid),
  'expected',
  'LEASE-13: a deposit starts as expected, before money arrives'
);

select throws_ok(
  format($$update public.lease_deposits set status = 'held' where id = %L$$, :'deposit'::uuid),
  '23514',
  null,
  'LEASE-13: a deposit cannot be held without a date it was received'
);

select lives_ok(
  format($$update public.lease_deposits
             set status = 'held', received_on = current_date - 365
           where id = %L$$, :'deposit'::uuid),
  'LEASE-13: recording receipt moves it to held'
);

-- --- deductions need approval before they count ---------------------------
select tests.authenticate(:'aj_acct'::uuid, 'accounts@ajah.ng');

insert into public.deposit_deductions
  (organisation_id, deposit_id, amount_kobo, reason, evidence_paths)
values (:'aj_org'::uuid, :'deposit'::uuid, 5000000, 'Repainting the living room',
        array['private/ajah/unit1/paint-before.jpg'])
returning id as deduction \gset

select is(
  (select approved_at from public.deposit_deductions where id = :'deduction'::uuid),
  null::timestamptz,
  'LEASE-13: a deduction starts unapproved, because it takes the tenant''s money'
);

-- An unapproved proposal is not yet a claim, so it may exceed the deposit
-- while it is still being discussed; approving it is what is checked.
select throws_ok(
  format($$insert into public.deposit_deductions
            (organisation_id, deposit_id, amount_kobo, reason, approved_by, approved_at)
           values (%L, %L, 30000000, 'Replacing the entire kitchen', %L, now())$$,
         :'aj_org'::uuid, :'deposit'::uuid, :'aj_acct'::uuid),
  '23514',
  null,
  'LEASE-13: approved deductions cannot exceed the deposit held'
);

select lives_ok(
  format($$update public.deposit_deductions
             set approved_by = %L, approved_at = now()
           where id = %L$$, :'aj_acct'::uuid, :'deduction'::uuid),
  'LEASE-13: a deduction within the deposit can be approved'
);

-- --- append-only (PRD §10.2) ----------------------------------------------
select throws_ok(
  format($$update public.deposit_deductions set amount_kobo = 1000 where id = %L$$,
         :'deduction'::uuid),
  '42501',
  null,
  'PRD §10.2: a deduction amount cannot be rewritten'
);

select throws_ok(
  format($$update public.deposit_deductions set reason = 'Something else' where id = %L$$,
         :'deduction'::uuid),
  '42501',
  null,
  'PRD §10.2: a deduction reason cannot be rewritten'
);

select throws_ok(
  format($$delete from public.deposit_deductions where id = %L$$, :'deduction'::uuid),
  '42501',
  null,
  'PRD §10.2: a deduction cannot be deleted; a reversal is recorded instead'
);

-- A disputed deduction is reversed, and both rows remain visible.
insert into public.deposit_deductions
  (organisation_id, deposit_id, amount_kobo, reason, reverses_deduction_id, approved_by, approved_at)
values (:'aj_org'::uuid, :'deposit'::uuid, 5000000,
        'Reversed: tenant produced the landlord''s written agreement to repaint',
        :'deduction'::uuid, :'aj_acct'::uuid, now());

select is(
  (select count(*)::int from public.deposit_deductions where deposit_id = :'deposit'::uuid),
  2,
  'PRD §10.2: the reversal is a second row, so the history of the dispute survives'
);

-- With the original reversed, the deposit is unclaimed again, so a larger
-- deduction now fits.
select lives_ok(
  format($$insert into public.deposit_deductions
            (organisation_id, deposit_id, amount_kobo, reason, approved_by, approved_at)
           values (%L, %L, 15000000, 'Outstanding service charge', %L, now())$$,
         :'aj_org'::uuid, :'deposit'::uuid, :'aj_acct'::uuid),
  'LEASE-13: a reversed deduction no longer counts against the deposit'
);

-- --- who can see and do what ---------------------------------------------
select tests.authenticate(:'aj_agent'::uuid, 'agent@ajah.ng');
select is(
  (select count(*)::int from public.lease_deposits),
  1,
  'a letting agent can see that a deposit exists'
);

with attempted as (
  update public.lease_deposits set amount_kobo = 1 where id = :'deposit'::uuid
  returning 1
)
select count(*)::int as agent_writes from attempted \gset
select is(
  :agent_writes,
  0,
  'LEASE-13: a letting agent cannot change the deposit amount'
);

-- The tenant must be able to inspect what is held and what was deducted: a
-- deposit dispute the tenant cannot see is the dispute this prevents.
select tests.authenticate(:'aj_tenant'::uuid, 'tenant@ajah.ng');
select is(
  (select count(*)::int from public.deposit_deductions),
  3,
  'LEASE-13: the tenant can see every deduction and reversal against their deposit'
);

-- --- settlement ------------------------------------------------------------
-- The original 5,000,000 deduction was reversed; the 15,000,000 service
-- charge remains approved. The refund is therefore 5,000,000, not 5,000,000
-- plus the reversed claim.
select tests.authenticate(:'aj_acct'::uuid, 'accounts@ajah.ng');

select lives_ok(
  format($$select public.settle_deposit(%L, 'refund', current_date, null, 'Move-out settled')$$,
         :'deposit'::uuid),
  'LEASE-13: a held deposit can be settled'
);

select is(
  (select status::text from public.lease_deposits where id = :'deposit'::uuid),
  'partially_refunded',
  'LEASE-13: approved deductions make the outcome partially refunded'
);

select is(
  (select refunded_amount_kobo from public.lease_deposits where id = :'deposit'::uuid),
  5000000::bigint,
  'LEASE-13: the refund excludes reversed deductions'
);

select tests.authenticate(:'aj_tenant'::uuid, 'tenant@ajah.ng');

select is(
  (select count(*)::int from public.notifications
   where user_id = :'aj_tenant'::uuid and kind = 'deposit'),
  1,
  'LEASE-13: settlement notifies the tenant'
);

select tests.authenticate(:'aj_acct'::uuid, 'accounts@ajah.ng');

select throws_ok(
  format($$select public.settle_deposit(%L, 'refund', current_date, null, null)$$,
         :'deposit'::uuid),
  '23514',
  null,
  'LEASE-13: a settled deposit cannot be settled twice'
);

-- --- termination -----------------------------------------------------------
select tests.authenticate(:'aj_owner'::uuid, 'owner@ajah.ng');

select lives_ok(
  format($$select public.terminate_lease(%L, current_date, 'Tenant ended the tenancy')$$,
         :'lease'::uuid),
  'LEASE-5: an active tenancy can be terminated with a reason'
);

select is(
  (select terminated_on from public.leases where id = :'lease'::uuid),
  current_date,
  'LEASE-5: termination records the date on the lease'
);

select is(
  (select termination_reason from public.leases where id = :'lease'::uuid),
  'Tenant ended the tenancy',
  'LEASE-5: termination records why it ended'
);

select tests.authenticate(:'aj_tenant'::uuid, 'tenant@ajah.ng');

select is(
  (select count(*)::int from public.notifications
   where user_id = :'aj_tenant'::uuid and kind = 'tenancy'),
  1,
  'LEASE-5: termination notifies the tenant'
);

-- --- maintenance notices (MAINT-12) ----------------------------------------
-- Fixture creation bypasses the staff property-assignment policy; the subject
-- under test is the notification trigger, not who may file a repair.
select tests.as_owner();

insert into public.maintenance_requests
  (organisation_id, property_id, unit_id, lease_id, tenant_id,
   submitted_by, reported_on, category, description)
values
  (:'aj_org'::uuid, :'property'::uuid, :'unit'::uuid, :'lease'::uuid,
   :'tenant'::uuid, 'staff', current_date, 'plumbing', 'Kitchen tap is leaking')
returning id as request \gset

select tests.authenticate(:'aj_tenant'::uuid, 'tenant@ajah.ng');

select is(
  (select count(*)::int from public.notifications
   where user_id = :'aj_tenant'::uuid and kind = 'maintenance'),
  1,
  'MAINT-12: a tenant is notified when a repair is received'
);

select tests.as_owner();

update public.maintenance_requests set status = 'acknowledged' where id = :'request'::uuid;

select tests.authenticate(:'aj_tenant'::uuid, 'tenant@ajah.ng');

select is(
  (select count(*)::int from public.notifications
   where user_id = :'aj_tenant'::uuid and kind = 'maintenance'),
  2,
  'MAINT-12: a status change notifies the tenant'
);

select lives_ok(
  format($$insert into public.documents
            (organisation_id, entity_type, entity_id, bucket, storage_path,
             file_name, mime_type, size_bytes, document_type, title, uploaded_by)
           values (%L, 'maintenance_request', %L, 'documents',
                   'ajah/maintenance/' || %L || '/tap.jpg', 'tap.jpg',
                   'image/jpeg', 1200, 'photo', 'Leaking tap', %L)$$,
         :'aj_org'::uuid, :'request'::uuid, :'request'::uuid, :'aj_tenant'::uuid),
  'MAINT-12: a tenant can attach a photo to their own repair'
);

select is(
  (select count(*)::int from public.documents
   where entity_type = 'maintenance_request' and entity_id = :'request'::uuid),
  1,
  'MAINT-12: the tenant photo is visible on their repair'
);

select * from finish();
rollback;
