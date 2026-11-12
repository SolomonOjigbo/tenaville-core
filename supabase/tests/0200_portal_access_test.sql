-- Portal access (OWN-3, TENANT-1…TENANT-4).
--
-- A landlord should see who lives in their buildings and only issued
-- statements. A tenant should see the property and unit of their own lease,
-- and nothing belonging to another tenancy.

begin;

select plan(10);

select tests.as_owner();

select tests.create_user('portal-owner@yabalets.ng') as owner \gset
select tests.create_user('portal-landlord@yabalets.ng') as landlord_user \gset
select tests.create_user('portal-tenant@yabalets.ng') as tenant_user \gset
select tests.create_user('portal-outsider@other.ng') as outsider \gset

select tests.authenticate(:'owner'::uuid, 'portal-owner@yabalets.ng');
select public.create_organisation_with_owner('Portal Lets', 'agency', 'Portal Owner') as org \gset

select tests.as_owner();
insert into public.landlords (organisation_id, display_name, user_id)
values (:'org'::uuid, 'Portal Landlord', :'landlord_user'::uuid)
returning id as landlord \gset

insert into public.properties (
  organisation_id, landlord_id, name, property_type, address_line, state_code
)
values (:'org'::uuid, :'landlord'::uuid, 'Portal Court', 'residential', '1 Portal Road', 'LA')
returning id as property \gset

insert into public.units (organisation_id, property_id, label, unit_type)
values (:'org'::uuid, :'property'::uuid, 'Flat P1', 'flat')
returning id as unit_one \gset

insert into public.units (organisation_id, property_id, label, unit_type)
values (:'org'::uuid, :'property'::uuid, 'Flat P2', 'flat')
returning id as unit_two \gset

insert into public.tenants (organisation_id, display_name, user_id)
values (:'org'::uuid, 'Portal Tenant', :'tenant_user'::uuid)
returning id as tenant \gset

insert into public.tenants (organisation_id, display_name)
values (:'org'::uuid, 'Someone Else')
returning id as other_tenant \gset

select tests.authenticate(:'owner'::uuid, 'portal-owner@yabalets.ng');
select public.create_lease_with_tenant(
  :'org'::uuid, :'unit_one'::uuid, :'tenant'::uuid,
  date '2026-01-01', date '2026-12-31', 30000000::bigint,
  'annual', 'PL/2026/01', null, 'agency', true,
  '[{"sequence":1,"period_start":"2026-01-01","period_end":"2026-12-31","due_on":"2026-01-01","amount_kobo":"30000000"}]'::jsonb
) as lease \gset

-- An issued statement and a draft, both for the same landlord.
select tests.as_owner();

insert into public.statements (
  organisation_id, landlord_id, period_start, period_end, status,
  opening_balance_kobo, closing_balance_kobo, lines,
  reviewed_at, reviewed_by, issued_at, issued_by, created_by
)
values
  (
    :'org'::uuid, :'landlord'::uuid, date '2026-01-01', date '2026-01-31',
    'issued', 0, 0, '[]'::jsonb, now(), :'owner'::uuid, now(), :'owner'::uuid,
    :'owner'::uuid
  ),
  (
    :'org'::uuid, :'landlord'::uuid, date '2026-02-01', date '2026-02-28',
    'draft', 0, 0, '[]'::jsonb, null, null, null, null, :'owner'::uuid
  );

-- ---------------------------------------------------------------------------
-- Landlord
-- ---------------------------------------------------------------------------
select tests.authenticate(:'landlord_user'::uuid, 'portal-landlord@yabalets.ng');

select is(
  (select count(*) from public.tenants),
  1::bigint,
  'OWN-3: a landlord sees the tenant on their property, not every tenant in the agency'
);

select is(
  (select count(*) from public.statements),
  1::bigint,
  'OWN-6: a landlord sees issued statements only'
);

select is(
  (select status::text from public.statements limit 1),
  'issued',
  'OWN-6: and the one they see is the issued statement'
);

select is(
  (select count(*) from public.units),
  2::bigint,
  'OWN-3: a landlord sees every unit in their property'
);

-- ---------------------------------------------------------------------------
-- Tenant
-- ---------------------------------------------------------------------------
select tests.authenticate(:'tenant_user'::uuid, 'portal-tenant@yabalets.ng');

select is(
  (select count(*) from public.properties),
  1::bigint,
  'TENANT-2: a tenant sees the property of their tenancy'
);

select is(
  (select count(*) from public.units),
  1::bigint,
  'TENANT-2: and only the unit they rent, not the vacant one next door'
);

select is(
  (select count(*) from public.statements),
  0::bigint,
  'TENANT-4: a tenant sees no landlord statements'
);

select is(
  (select count(*) from public.tenants),
  1::bigint,
  'TENANT-1: a tenant sees their own record'
);

-- ---------------------------------------------------------------------------
-- Outsider
-- ---------------------------------------------------------------------------
select tests.authenticate(:'outsider'::uuid, 'portal-outsider@other.ng');

select is(
  (select count(*) from public.properties),
  0::bigint,
  'someone outside the organisation sees no portfolio'
);

select is(
  (select count(*) from public.tenants),
  0::bigint,
  'and no tenants'
);

select * from finish();

rollback;
