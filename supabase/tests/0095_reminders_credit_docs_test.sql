-- LEASE-6/RENT-6, RENT-14, MAINT-12, DOC-1 and AN-1 completion.

begin;
select plan(18);

select tests.as_owner();

insert into public.plans (id, name, unit_limit, price_kobo, billing_period, trial_days)
values ('trial', 'Trial', 100, 0, 'monthly', 14)
on conflict (id) do nothing;

select tests.create_user('owner@completion.ng') as owner \gset
select tests.create_user('tenant@completion.ng') as tenant_user \gset

select tests.authenticate(:'owner'::uuid, 'owner@completion.ng');
select public.create_organisation_with_owner('Completion Estates', 'agency', 'Completion Owner') as org \gset

select tests.as_owner();
insert into public.landlords (organisation_id, display_name)
values (:'org'::uuid, 'Completion Landlord') returning id as landlord \gset
insert into public.properties
  (organisation_id, landlord_id, name, property_type, address_line, state_code)
values (:'org'::uuid, :'landlord'::uuid, 'Completion Court', 'residential', '1 Test Road', 'LA')
returning id as property \gset
insert into public.units (organisation_id, property_id, label, unit_type)
values
  (:'org'::uuid, :'property'::uuid, 'Flat 1', 'flat'),
  (:'org'::uuid, :'property'::uuid, 'Flat 2', 'flat');
select id as unit from public.units where property_id = :'property'::uuid and label = 'Flat 1' \gset
select id as credit_unit from public.units where property_id = :'property'::uuid and label = 'Flat 2' \gset
insert into public.tenants (organisation_id, user_id, display_name, phone, preferred_channel)
values (:'org'::uuid, :'tenant_user'::uuid, 'Completion Tenant', '+2348012345678', 'whatsapp')
returning id as tenant \gset

select tests.authenticate(:'owner'::uuid, 'owner@completion.ng');
select public.create_lease_with_tenant(
  :'org'::uuid, :'unit'::uuid, :'tenant'::uuid,
  current_date - 30, current_date + 90, 30000000::bigint,
  'annual', 'COMP/001', null, 'agency', true,
  jsonb_build_array(jsonb_build_object(
    'sequence', 1,
    'period_start', current_date - 30,
    'period_end', current_date + 90,
    'due_on', current_date + 2,
    'amount_kobo', '30000000'
  ))
) as lease \gset

-- --- LEASE-6 / RENT-6 ------------------------------------------------------
select is(
  (select lease_alert_days from public.organisations where id = :'org'::uuid),
  array[90, 60, 30],
  'LEASE-6: the default lease alert thresholds are 90, 60 and 30 days'
);

select is(
  public.run_reminder_dispatch(:'org'::uuid, 'manual'),
  2,
  'RENT-6: one rent reminder and the 90-day lease expiry task are generated'
);

select is(
  (select count(*)::int from public.tasks
   where organisation_id = :'org'::uuid
     and dedupe_key in ('rent_reminder:' || (select id::text from public.charges where lease_id = :'lease'::uuid limit 1),
                        'lease_expiry:' || :'lease'::text || ':90')),
  2,
  'RENT-6: generated tasks carry stable dedupe keys'
);

select is(
  (select count(*)::int from public.messages
   where organisation_id = :'org'::uuid and status = 'queued'),
  2,
  'MAINT-12: tenant messages are queued for rent and lease reminders'
);

select is(
  (select count(*)::int from public.reminder_runs where organisation_id = :'org'::uuid),
  1,
  'LEASE-6: a manual dispatch is recorded in the reminder run log'
);

select lives_ok(
  format($$update public.organisations set lease_alert_days = array[45,15], rent_reminder_days = 3 where id = %L$$, :'org'::uuid),
  'LEASE-6: alert thresholds are configurable per organisation'
);

-- --- RENT-14 ---------------------------------------------------------------
select public.create_lease_with_tenant(
  :'org'::uuid, :'credit_unit'::uuid, :'tenant'::uuid,
  current_date + 30, current_date + 365, 20000000::bigint,
  'annual', 'CREDIT/001', null, 'agency', false
) as credit_lease \gset

select * from public.record_payment(
  :'org'::uuid, :'credit_lease'::uuid, 50000000::bigint, 'bank_transfer',
  null::jsonb, current_date, 'COMP-PAY-1',
  '33333333-3333-3333-3333-333333333333'::uuid,
  null::uuid, :'tenant'::uuid
) \gset payment_

select is(
  (select amount_kobo from public.payment_allocations where lease_id = :'credit_lease'::uuid and charge_id is null),
  50000000::bigint,
  'RENT-14: an overpayment becomes available tenant credit'
);

insert into public.charges (
  organisation_id, lease_id, kind, sequence, period_start, period_end,
  due_on, amount_kobo, created_by
)
values (
  :'org'::uuid, :'credit_lease'::uuid, 'rent', 1,
  current_date + 30, current_date + 60, current_date + 30, 20000000, :'owner'::uuid
)
returning id as future_charge \gset

select id as credit_allocation from public.payment_allocations
where lease_id = :'credit_lease'::uuid and charge_id is null \gset

select lives_ok(
  format('select public.apply_tenant_credit(%L, %L, 12000000)', :'credit_allocation'::uuid, :'future_charge'::uuid),
  'RENT-14: available credit can be applied to a future charge'
);

select is(
  (select coalesce(sum(a.amount_kobo), 0)::bigint
   from public.payment_allocations a join public.charges c on c.id = a.charge_id
   where c.id = :'future_charge'::uuid),
  12000000::bigint,
  'RENT-14: the target charge receives the credit allocation'
);

select is(
  (select amount_kobo from public.payment_allocations where id = :'credit_allocation'::uuid),
  38000000::bigint,
  'RENT-14: the remaining credit is reduced, not duplicated'
);

select is(
  (select coalesce(sum(amount_kobo), 0)::bigint from public.payment_allocations where payment_id = :'payment_payment_id'::uuid),
  50000000::bigint,
  'RENT-14: total allocations still equal the original payment'
);

-- --- MAINT-12 outbound queue ----------------------------------------------
select tests.as_owner();

insert into public.maintenance_requests (
  organisation_id, property_id, unit_id, lease_id, tenant_id,
  submitted_by, reported_on, category, description
)
values (
  :'org'::uuid, :'property'::uuid, :'unit'::uuid, :'lease'::uuid, :'tenant'::uuid,
  'tenant', current_date, 'plumbing', 'Kitchen tap is leaking'
)
returning id as request \gset

select is(
  (select count(*)::int from public.messages
   where organisation_id = :'org'::uuid
     and dedupe_key = 'maintenance:' || :'request'::text || ':submitted'),
  1,
  'MAINT-12: a maintenance update is queued for outbound delivery'
);

-- --- AN-1 views ------------------------------------------------------------
select is(
  (select count(*)::int from public.report_occupancy where organisation_id = :'org'::uuid),
  2,
  'AN-1: the occupancy report view returns both units'
);

select is(
  (select days_to_expiry from public.report_lease_expiry where lease_id = :'lease'::uuid),
  90,
  'AN-1: the lease expiry view calculates days to expiry'
);

select is(
  (select count(*)::int from public.report_maintenance_queue where request_id = :'request'::uuid),
  1,
  'AN-1: the maintenance queue view includes open repairs'
);

-- --- DOC-1 screening attachment -------------------------------------------
select tests.as_owner();

insert into public.screening_applications (
  organisation_id, unit_id, applicant_name, applicant_email, status, created_by
)
values (
  :'org'::uuid, :'unit'::uuid, 'Screening Applicant', 'applicant@example.com', 'submitted', :'owner'::uuid
)
returning id as screening \gset

select lives_ok(
  format($$insert into public.documents
             (organisation_id, entity_type, entity_id, bucket, storage_path,
              file_name, mime_type, size_bytes, document_type, title, uploaded_by)
           values (%L, 'screening_application', %L, 'documents',
                   'screening/' || %L || '/id.pdf', 'id.pdf', 'application/pdf',
                   1200, 'identification', 'Applicant ID', %L)$$,
         :'org'::uuid, :'screening'::uuid, :'screening'::uuid, :'owner'::uuid),
  'DOC-1: a document can be attached to a screening application'
);

select is(
  (select scan_status::text from public.documents
   where entity_type = 'screening_application' and entity_id = :'screening'::uuid),
  'unscanned',
  'DOC-6: uploaded documents carry an explicit scan status'
);

select ok(
  exists (
    select 1 from public.audit_events
    where entity_type = 'screening_application' and entity_id = :'screening'::text
  ),
  'ORG-5: screening application changes are audited'
);

select * from finish();
rollback;
