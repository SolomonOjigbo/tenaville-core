-- Maintenance foundation (MAINT-1 … MAINT-6, MAINT-10, MAINT-11, MAINT-16)
-- and the approval gate (MAINT-8, OWN-4).
--
-- The test walks one staff request and one tenant request through the
-- workflow, including the two gates that matter: no completion without a cost
-- or an explicit no-cost flag, and no completion while an approval is pending.

begin;

select plan(39);

select tests.as_owner();

select tests.create_user('maint-owner@yabalets.ng') as owner \gset
select tests.create_user('maint-coordinator@yabalets.ng') as coordinator \gset
select tests.create_user('maint-landlord@yabalets.ng') as landlord_user \gset
select tests.create_user('maint-tenant@yabalets.ng') as tenant_user \gset
select tests.create_user('maint-other@yabalets.ng') as other_tenant_user \gset
select tests.create_user('maint-outsider@other.ng') as outsider \gset

select tests.authenticate(:'owner'::uuid, 'maint-owner@yabalets.ng');
select public.create_organisation_with_owner('Maintenance Lets', 'agency', 'Maint Owner') as org \gset

select tests.as_owner();
insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
values
  (:'org'::uuid, :'coordinator'::uuid, 'maintenance_coordinator', 'active', now()),
  (:'org'::uuid, :'landlord_user'::uuid, 'landlord', 'active', now()),
  (:'org'::uuid, :'tenant_user'::uuid, 'tenant', 'active', now()),
  (:'org'::uuid, :'other_tenant_user'::uuid, 'tenant', 'active', now());

insert into public.assignments (organisation_id, user_id, scope_type, created_by)
values (:'org'::uuid, :'coordinator'::uuid, 'organisation', :'owner'::uuid);

insert into public.landlords (organisation_id, display_name, user_id)
values (:'org'::uuid, 'Maint Landlord', :'landlord_user'::uuid)
returning id as landlord \gset

insert into public.properties (
  organisation_id, landlord_id, name, property_type, address_line, state_code
)
values (:'org'::uuid, :'landlord'::uuid, 'Maint Court', 'residential', '1 Fix Road', 'LA')
returning id as property \gset

insert into public.units (organisation_id, property_id, label, unit_type)
values (:'org'::uuid, :'property'::uuid, 'Flat A', 'flat')
returning id as unit_one \gset

insert into public.units (organisation_id, property_id, label, unit_type)
values (:'org'::uuid, :'property'::uuid, 'Flat B', 'flat')
returning id as unit_two \gset

insert into public.tenants (organisation_id, display_name, user_id)
values
  (:'org'::uuid, 'Maint Tenant', :'tenant_user'::uuid),
  (:'org'::uuid, 'Other Tenant', :'other_tenant_user'::uuid);

select id as tenant_one from public.tenants where user_id = :'tenant_user'::uuid \gset
select id as tenant_two from public.tenants where user_id = :'other_tenant_user'::uuid \gset

select tests.authenticate(:'owner'::uuid, 'maint-owner@yabalets.ng');
select public.create_lease_with_tenant(
  :'org'::uuid, :'unit_one'::uuid, :'tenant_one'::uuid,
  date '2026-01-01', date '2026-12-31', 30000000::bigint,
  'annual', 'MT/2026/A', null, 'agency', true,
  '[{"sequence":1,"period_start":"2026-01-01","period_end":"2026-12-31","due_on":"2026-01-01","amount_kobo":"30000000"}]'::jsonb
) as lease_one \gset

select public.create_lease_with_tenant(
  :'org'::uuid, :'unit_two'::uuid, :'tenant_two'::uuid,
  date '2026-01-01', date '2026-12-31', 30000000::bigint,
  'annual', 'MT/2026/B', null, 'agency', true,
  '[{"sequence":1,"period_start":"2026-01-01","period_end":"2026-12-31","due_on":"2026-01-01","amount_kobo":"30000000"}]'::jsonb
) as lease_two \gset

select tests.as_owner();
insert into public.vendors (organisation_id, name, trade, phone, service_areas)
values (:'org'::uuid, 'FixIt Plumbing', 'plumbing', '+2348030000001', array['Lagos'])
returning id as vendor \gset

-- ---------------------------------------------------------------------------
-- Staff request and assignment
-- ---------------------------------------------------------------------------
select tests.authenticate(:'coordinator'::uuid, 'maint-coordinator@yabalets.ng');

select public.create_maintenance_request(
  :'property'::uuid, :'unit_one'::uuid, null, 'plumbing',
  'Kitchen tap is leaking badly and the cabinet is getting wet',
  'high', 'Tenant works from home', 'Weekday mornings', false
) as staff_request \gset

select is(
  (select status from public.maintenance_requests where id = :'staff_request'::uuid),
  'submitted'::public.maintenance_status,
  'MAINT-1: staff can raise a request against a unit'
);

select is(
  (select count(*) from public.maintenance_events where request_id = :'staff_request'::uuid),
  1::bigint,
  'MAINT-5: submission is the first timeline event'
);

select lives_ok(
  format(
    $$select public.assign_maintenance_request(%L, %L, %L, %L, 'high', date '2026-11-15', 'Please attend Thursday')$$,
    :'staff_request'::uuid, :'coordinator'::uuid, :'coordinator'::uuid, :'vendor'::uuid
  ),
  'MAINT-4: a coordinator can assign staff, a vendor, priority and due date'
);

select is(
  (select status from public.maintenance_requests where id = :'staff_request'::uuid),
  'assigned'::public.maintenance_status,
  'MAINT-3: assignment moves a submitted request to assigned'
);

select is(
  (select assignee_user_id from public.maintenance_requests where id = :'staff_request'::uuid),
  :'coordinator'::uuid,
  'MAINT-4: the responsible staff member is recorded'
);

-- ---------------------------------------------------------------------------
-- Tenant submission and isolation
-- ---------------------------------------------------------------------------
select tests.authenticate(:'tenant_user'::uuid, 'maint-tenant@yabalets.ng');

select public.create_maintenance_request(
  :'property'::uuid, :'unit_one'::uuid, :'lease_one'::uuid, 'plumbing',
  'The bathroom drain is blocked and water is backing up',
  'emergency', null, 'Anytime after 5pm', true
) as tenant_request \gset

select is(
  (select submitted_by from public.maintenance_requests where id = :'tenant_request'::uuid),
  'tenant'::public.maintenance_submitted_by,
  'TENANT-4: a tenant can submit a repair against their active lease'
);

select is(
  (select tenant_id from public.maintenance_requests where id = :'tenant_request'::uuid),
  :'tenant_one'::uuid,
  'the tenant record is derived from the lease, not supplied by the caller'
);

select throws_ok(
  format(
    $$select public.create_maintenance_request(%L, %L, %L, 'other', 'Trying another tenancy', 'low')$$,
    :'property'::uuid, :'unit_two'::uuid, :'lease_two'::uuid
  ),
  '42501',
  null,
  'a tenant cannot raise a request against somebody else''s tenancy'
);

select is(
  (select count(*) from public.maintenance_requests),
  1::bigint,
  'a tenant sees their own request, not the staff request with no tenant'
);

select tests.authenticate(:'other_tenant_user'::uuid, 'maint-other@yabalets.ng');

select is(
  (select count(*) from public.maintenance_requests),
  0::bigint,
  'another tenant sees no requests at all'
);

select tests.authenticate(:'landlord_user'::uuid, 'maint-landlord@yabalets.ng');

select is(
  (select count(*) from public.maintenance_requests),
  2::bigint,
  'OWN-4: the landlord sees both repairs on their property'
);

select is(
  (select count(*) from public.vendors),
  0::bigint,
  'the vendor directory stays internal to staff'
);

select tests.authenticate(:'outsider'::uuid, 'maint-outsider@other.ng');

select is(
  (select count(*) from public.maintenance_requests),
  0::bigint,
  'someone outside the organisation sees no repairs'
);

select is(
  (select count(*) from public.vendors),
  0::bigint,
  'and no vendors'
);

-- ---------------------------------------------------------------------------
-- Costs and the completion gate
-- ---------------------------------------------------------------------------
select tests.authenticate(:'coordinator'::uuid, 'maint-coordinator@yabalets.ng');

select public.transition_maintenance_request(
  :'staff_request'::uuid, 'in_progress', 'Plumber attending'
);

select throws_ok(
  format(
    $$select public.transition_maintenance_request(%L, 'completed', 'Tap replaced')$$,
    :'staff_request'::uuid
  ),
  '23514',
  null,
  'MAINT-10: a job cannot be completed without a cost or an explicit no-cost flag'
);

select public.record_maintenance_cost(
  :'staff_request'::uuid, 'Washer and labour', 1000000::bigint,
  'landlord', 'Wear and tear, landlord responsibility', null, false
);

select is(
  (select count(*) from public.maintenance_approvals where request_id = :'staff_request'::uuid),
  0::bigint,
  'MAINT-8: a cost below the threshold needs no approval'
);

select tests.as_owner();

select is(
  (
    select count(*) from public.landlord_ledger_entries
    where maintenance_cost_id in (
      select id from public.maintenance_costs where request_id = :'staff_request'::uuid
    )
  ),
  1::bigint,
  'MAINT-11: a landlord-borne cost below the threshold is posted to the ledger immediately'
);

select is(
  (
    select amount_kobo from public.landlord_ledger_entries
    where maintenance_cost_id in (
      select id from public.maintenance_costs where request_id = :'staff_request'::uuid
    )
  ),
  -1000000::bigint,
  'MAINT-11: and it is a deduction from client funds'
);

select tests.authenticate(:'coordinator'::uuid, 'maint-coordinator@yabalets.ng');

select lives_ok(
  format(
    $$select public.transition_maintenance_request(%L, 'completed', 'Tap washer replaced and cabinet dried')$$,
    :'staff_request'::uuid
  ),
  'MAINT-3: a costed job can be completed'
);

select is(
  (select status from public.maintenance_requests where id = :'staff_request'::uuid),
  'completed'::public.maintenance_status,
  'the staff request is complete'
);

-- ---------------------------------------------------------------------------
-- Approval threshold
-- ---------------------------------------------------------------------------
select tests.authenticate(:'coordinator'::uuid, 'maint-coordinator@yabalets.ng');

select public.assign_maintenance_request(
  :'tenant_request'::uuid, :'coordinator'::uuid, :'coordinator'::uuid,
  :'vendor'::uuid, 'urgent', date '2026-11-12', 'Emergency visit'
);

select public.transition_maintenance_request(
  :'tenant_request'::uuid, 'in_progress', 'Drain being cleared'
);

select public.record_maintenance_cost(
  :'tenant_request'::uuid, 'Emergency drain excavation', 10000000::bigint,
  'landlord', 'Below-ground pipe repair is a landlord cost', null, false
);

select is(
  (select status from public.maintenance_requests where id = :'tenant_request'::uuid),
  'awaiting_approval'::public.maintenance_status,
  'MAINT-8: a cost above the threshold moves the request to awaiting approval'
);

select is(
  (select count(*) from public.maintenance_approvals where request_id = :'tenant_request'::uuid),
  1::bigint,
  'one pending approval is recorded for the cost'
);

select id as approval_id from public.maintenance_approvals
where request_id = :'tenant_request'::uuid \gset

select is(
  (
    select count(*) from public.landlord_ledger_entries
    where maintenance_cost_id in (
      select id from public.maintenance_costs where request_id = :'tenant_request'::uuid
    )
  ),
  0::bigint,
  'a cost awaiting approval has not reached the ledger yet'
);

select throws_ok(
  format(
    $$select public.transition_maintenance_request(%L, 'completed', 'Drain cleared')$$,
    :'tenant_request'::uuid
  ),
  '23514',
  null,
  'a job above the threshold cannot be completed before approval'
);

select tests.authenticate(:'tenant_user'::uuid, 'maint-tenant@yabalets.ng');

select is(
  (select count(*) from public.maintenance_approvals),
  0::bigint,
  'a tenant does not see the approval or its amount'
);

select throws_ok(
  format($$select public.decide_maintenance_approval(%L, true, null)$$, :'approval_id'::uuid),
  '42501',
  null,
  'a tenant cannot decide an approval'
);

select tests.authenticate(:'landlord_user'::uuid, 'maint-landlord@yabalets.ng');

select is(
  (select count(*) from public.maintenance_approvals),
  1::bigint,
  'OWN-4: the landlord sees the pending approval for their property'
);

select lives_ok(
  format(
    $$select public.decide_maintenance_approval(%L, true, 'Approved, please fix urgently')$$,
    :'approval_id'::uuid
  ),
  'OWN-4: the landlord can approve the cost'
);

select is(
  (select status from public.maintenance_requests where id = :'tenant_request'::uuid),
  'in_progress'::public.maintenance_status,
  'an approved repair returns to in progress'
);

select is(
  (
    select amount_kobo from public.landlord_ledger_entries
    where maintenance_cost_id in (
      select id from public.maintenance_costs where request_id = :'tenant_request'::uuid
    )
  ),
  -10000000::bigint,
  'an approved landlord cost posts once, as a ledger deduction'
);

-- ---------------------------------------------------------------------------
-- Completion and tenant response
-- ---------------------------------------------------------------------------
select tests.authenticate(:'coordinator'::uuid, 'maint-coordinator@yabalets.ng');

select lives_ok(
  format(
    $$select public.transition_maintenance_request(%L, 'completed', 'Drain cleared and tested')$$,
    :'tenant_request'::uuid
  ),
  'the approved job can now be completed'
);

select tests.authenticate(:'tenant_user'::uuid, 'maint-tenant@yabalets.ng');

select lives_ok(
  format($$select public.confirm_maintenance_resolution(%L)$$, :'tenant_request'::uuid),
  'MAINT-13: the tenant can confirm the repair is resolved'
);

select isnt(
  (select tenant_confirmed_at from public.maintenance_requests where id = :'tenant_request'::uuid),
  null,
  'the confirmation is timestamped'
);

select lives_ok(
  format(
    $$select public.reopen_maintenance_request(%L, 'The drain still gurgles when the sink runs')$$,
    :'tenant_request'::uuid
  ),
  'MAINT-13: the tenant can reopen with a reason'
);

select is(
  (select status from public.maintenance_requests where id = :'tenant_request'::uuid),
  'in_progress'::public.maintenance_status,
  'a reopened request goes back to in progress'
);

select is(
  (select reopen_count from public.maintenance_requests where id = :'tenant_request'::uuid),
  1,
  'the reopen is counted'
);

select tests.authenticate(:'coordinator'::uuid, 'maint-coordinator@yabalets.ng');

select public.record_maintenance_cost(
  :'tenant_request'::uuid, 'Replace damaged trap', 500000::bigint,
  'tenant', 'Tenant damaged the fitting', null, false
);

select is(
  (
    select count(*) from public.charges
    where maintenance_cost_id in (
      select id from public.maintenance_costs
      where request_id = :'tenant_request'::uuid and payer = 'tenant'
    )
  ),
  1::bigint,
  'MAINT-11: a tenant-borne cost creates one charge on the tenancy'
);

select is(
  (
    select kind from public.charges
    where maintenance_cost_id in (
      select id from public.maintenance_costs
      where request_id = :'tenant_request'::uuid and payer = 'tenant'
    )
  ),
  'repair'::public.charge_kind,
  'the tenant charge is a repair, not rent'
);

select is(
  (
    select amount_kobo from public.charges
    where maintenance_cost_id in (
      select id from public.maintenance_costs
      where request_id = :'tenant_request'::uuid and payer = 'tenant'
    )
  ),
  500000::bigint,
  'the charge carries the cost amount'
);

select * from finish();

rollback;
