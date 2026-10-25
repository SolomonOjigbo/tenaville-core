-- Tenancy: leases, parties, renewal, occupancy, expiry
-- (LEASE-2, LEASE-3, LEASE-4, LEASE-6, LEASE-11, LEASE-12, PROP-3, TENANT-1).

begin;
select plan(24);

select tests.as_owner();

insert into public.plans (id, name, unit_limit, price_kobo, billing_period, trial_days)
values ('trial', 'Trial', 10, 0, 'monthly', 14)
on conflict (id) do nothing;

select tests.create_user('owner@surulere.ng')  as su_owner  \gset
select tests.create_user('tenant@surulere.ng') as su_tenant \gset
select tests.create_user('other@surulere.ng')  as su_other  \gset

select tests.authenticate(:'su_owner'::uuid, 'owner@surulere.ng');
select public.create_organisation_with_owner('Surulere Lets', 'agency', 'Surulere Owner') as su_org \gset

select tests.as_owner();

insert into public.landlords (organisation_id, display_name)
values (:'su_org'::uuid, 'Mrs Okoro') returning id as landlord \gset

insert into public.properties
  (organisation_id, landlord_id, name, property_type, address_line, state_code)
values (:'su_org'::uuid, :'landlord'::uuid, 'Okoro Terrace', 'residential', '3 Bode Thomas', 'LA')
returning id as property \gset

insert into public.units (organisation_id, property_id, label, unit_type, asking_rent_kobo)
values (:'su_org'::uuid, :'property'::uuid, 'Flat A', 'flat', 150000000)
returning id as unit \gset

insert into public.tenants (organisation_id, user_id, display_name, phone)
values (:'su_org'::uuid, :'su_tenant'::uuid, 'Emeka Nwosu', '+2348031111111')
returning id as tenant \gset

insert into public.tenants (organisation_id, user_id, display_name)
values (:'su_org'::uuid, :'su_other'::uuid, 'Someone Else')
returning id as other_tenant \gset

insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
values
  (:'su_org'::uuid, :'su_tenant'::uuid, 'tenant', 'active', now()),
  (:'su_org'::uuid, :'su_other'::uuid,  'tenant', 'active', now());

-- --- LEASE-12: direct creation from a tenant and a unit --------------------
select tests.authenticate(:'su_owner'::uuid, 'owner@surulere.ng');

select public.create_lease_with_tenant(
  :'su_org'::uuid, :'unit'::uuid, :'tenant'::uuid,
  date '2026-01-01', date '2026-12-31', 150000000::bigint,
  'annual', 'SL/2026/001', 30000000::bigint, 'agency', false
) as lease \gset

select tests.as_owner();

select is(
  (select status::text from public.leases where id = :'lease'::uuid),
  'draft',
  'LEASE-12: a lease is created as a draft, not activated behind the user''s back'
);
select is(
  (select count(*)::int from public.lease_parties where lease_id = :'lease'::uuid and role = 'tenant'),
  1,
  'LEASE-2: the tenant is attached in the same transaction'
);
select is(
  (select amount_kobo from public.lease_deposits where lease_id = :'lease'::uuid),
  30000000::bigint,
  'LEASE-13: the deposit is recorded with the lease'
);
select is(
  (select custodian::text from public.lease_deposits where lease_id = :'lease'::uuid),
  'agency',
  'LEASE-13: deposit custody is recorded as data, not assumed (open decision 15)'
);
select is(
  (select status::text from public.units where id = :'unit'::uuid),
  'vacant',
  'PROP-3: a draft lease does not occupy the unit'
);

-- --- an active lease cannot exist without a tenant -------------------------
insert into public.leases (organisation_id, unit_id, starts_on, ends_on, rent_kobo)
values (:'su_org'::uuid, :'unit'::uuid, date '2030-01-01', date '2030-12-31', 1000)
returning id as empty_lease \gset

select throws_ok(
  format('update public.leases set status = %L where id = %L', 'active', :'empty_lease'::uuid),
  '23514',
  null,
  'LEASE-2: a lease cannot be activated without a tenant'
);

-- --- PROP-3: activation occupies the unit ---------------------------------
update public.leases set status = 'active' where id = :'lease'::uuid;

select is(
  (select status::text from public.units where id = :'unit'::uuid),
  'occupied',
  'PROP-3: activating a lease marks the unit occupied'
);

-- Staff decisions about a unit are not overwritten by lease changes.
update public.units set status = 'under_maintenance' where id = :'unit'::uuid;
update public.leases set status = 'active' where id = :'lease'::uuid;
select is(
  (select status::text from public.units where id = :'unit'::uuid),
  'under_maintenance',
  'PROP-3: a deliberate maintenance status is not clobbered by the lease trigger'
);
update public.units set status = 'occupied' where id = :'unit'::uuid;

-- --- double-letting is impossible -----------------------------------------
-- A complete lease, so activation reaches the exclusion constraint rather than
-- stopping at the "an active lease needs a tenant" check.
insert into public.leases
  (organisation_id, unit_id, status, starts_on, ends_on, rent_kobo)
values (:'su_org'::uuid, :'unit'::uuid, 'draft', date '2026-06-01', date '2027-05-31', 1000)
returning id as overlapping_lease \gset

insert into public.lease_parties (organisation_id, lease_id, tenant_id, role)
values (:'su_org'::uuid, :'overlapping_lease'::uuid, :'other_tenant'::uuid, 'tenant');

select throws_ok(
  format('update public.leases set status = %L where id = %L',
         'active', :'overlapping_lease'::uuid),
  '23P01',
  null,
  'two active leases cannot overlap on one unit: that is double-letting'
);

-- A non-overlapping active lease on the same unit is fine.
select lives_ok(
  format($$insert into public.leases
            (organisation_id, unit_id, status, starts_on, ends_on, rent_kobo)
           values (%L, %L, 'draft', date '2027-01-01', date '2027-12-31', 1000)$$,
         :'su_org'::uuid, :'unit'::uuid),
  'a future lease may be drafted while the current one runs'
);

-- --- LEASE-3 and LEASE-6: the derived expiry state ------------------------
-- Separate units, because the exclusion constraint rightly refuses a second
-- active lease on a unit that already has one. Dates are relative to
-- current_date: a fixture pinned to a literal date silently changes meaning as
-- the real date moves past it, which is exactly what happened the first time
-- this test was written.
insert into public.units (organisation_id, property_id, label, unit_type)
values (:'su_org'::uuid, :'property'::uuid, 'Flat B', 'flat')
returning id as unit_b \gset
insert into public.units (organisation_id, property_id, label, unit_type)
values (:'su_org'::uuid, :'property'::uuid, 'Flat C', 'flat')
returning id as unit_c \gset

insert into public.leases (organisation_id, unit_id, status, starts_on, ends_on, rent_kobo)
values (:'su_org'::uuid, :'unit_b'::uuid, 'draft', current_date - 400, current_date - 10, 1000)
returning id as past_lease \gset
insert into public.lease_parties (organisation_id, lease_id, tenant_id, role)
values (:'su_org'::uuid, :'past_lease'::uuid, :'other_tenant'::uuid, 'tenant');
update public.leases set status = 'active' where id = :'past_lease'::uuid;

select is(
  (select display_status from public.lease_overview where id = :'past_lease'::uuid),
  'expired',
  'LEASE-3: a lease past its end date reads as expired without a job having run'
);

-- A lease ending inside the 90-day window reads as expiring soon.
insert into public.leases (organisation_id, unit_id, status, starts_on, ends_on, rent_kobo)
values (:'su_org'::uuid, :'unit_c'::uuid, 'draft',
        current_date - 300, current_date + 45, 1000)
returning id as soon_lease \gset

insert into public.lease_parties (organisation_id, lease_id, tenant_id, role)
values (:'su_org'::uuid, :'soon_lease'::uuid, :'other_tenant'::uuid, 'tenant');
update public.leases set status = 'active' where id = :'soon_lease'::uuid;

select is(
  (select display_status from public.lease_overview where id = :'soon_lease'::uuid),
  'expiring_soon',
  'LEASE-3: a lease inside the alert window reads as expiring soon'
);
select is(
  (select alert_threshold_days from public.lease_overview where id = :'soon_lease'::uuid),
  90::smallint,
  'LEASE-6: the crossed alert threshold is reported, so one notice is sent per threshold'
);

-- The window follows the organisation's own configuration.
update public.organisations set lease_expiry_alert_days = '{30}'::smallint[]
where id = :'su_org'::uuid;
select is(
  (select display_status from public.lease_overview where id = :'soon_lease'::uuid),
  'active',
  'LEASE-6: the alert window is configurable per organisation'
);
update public.organisations set lease_expiry_alert_days = '{90,60,30}'::smallint[]
where id = :'su_org'::uuid;

-- --- LEASE-4 and LEASE-11: renewal preserves history ----------------------
select tests.as_owner();
update public.lease_deposits set status = 'held', received_on = current_date
where lease_id = :'lease'::uuid;

select tests.authenticate(:'su_owner'::uuid, 'owner@surulere.ng');
update public.leases set status = 'active' where id = :'lease'::uuid;
select public.renew_lease(:'lease'::uuid, date '2027-12-31', 165000000::bigint, true) as renewal \gset

select tests.as_owner();

select is(
  (select status::text from public.leases where id = :'lease'::uuid),
  'renewed',
  'LEASE-4: the renewed lease is marked renewed, not deleted'
);
select is(
  (select rent_kobo from public.leases where id = :'lease'::uuid),
  150000000::bigint,
  'LEASE-11: the original terms survive the renewal untouched'
);
select is(
  (select rent_kobo from public.leases where id = :'renewal'::uuid),
  165000000::bigint,
  'LEASE-4: the renewal carries the new rent'
);
select is(
  (select renewed_from_lease_id from public.leases where id = :'renewal'::uuid),
  :'lease'::uuid,
  'LEASE-4: the renewal points at what it replaced'
);
select is(
  (select count(*)::int from public.lease_parties where lease_id = :'renewal'::uuid),
  1,
  'LEASE-4: parties carry over, so the tenant is not re-entered'
);
select is(
  (select status::text from public.lease_deposits where lease_id = :'lease'::uuid),
  'transferred',
  'LEASE-13: the deposit is transferred to the renewal, not refunded and recollected'
);
select is(
  (select amount_kobo from public.lease_deposits where lease_id = :'renewal'::uuid),
  30000000::bigint,
  'LEASE-13: the renewal holds the same deposit amount'
);

-- --- TENANT-1: a tenant reaches only their own tenancy --------------------
select tests.authenticate(:'su_tenant'::uuid, 'tenant@surulere.ng');

select is(
  (select count(*)::int from public.leases),
  2,
  'TENANT-1: a tenant sees their own lease and its renewal, and nothing else'
);

select tests.authenticate(:'su_other'::uuid, 'other@surulere.ng');
select is(
  (select count(*)::int from public.leases where unit_id = :'unit_b'::uuid),
  1,
  'TENANT-1: the other tenant sees their own lease and not the first tenant''s'
);
select is_empty(
  format('select id from public.leases where id = %L', :'renewal'::uuid),
  'TENANT-1: and cannot see a lease they are not a party to'
);

select * from finish();
rollback;
