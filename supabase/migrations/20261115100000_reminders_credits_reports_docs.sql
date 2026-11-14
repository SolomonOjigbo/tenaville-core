-- Remaining AN/P0 completion: configurable reminders, tenant credit, report
-- views, screening attachments and document scanning metadata.

-- ---------------------------------------------------------------------------
-- Reminder configuration and dispatch log
-- ---------------------------------------------------------------------------
alter table public.organisations
add column lease_alert_days integer[] not null default '{90,60,30}';

alter table public.organisations
add constraint organisations_lease_alert_days_valid check (
  array_length(lease_alert_days, 1) between 1 and 8
  and array_position(lease_alert_days, null) is null
  and 0 < all (lease_alert_days)
  and 365 >= all (lease_alert_days)
);

alter table public.organisations
add column rent_reminder_days integer not null default 7 check (rent_reminder_days between 0 and 365);

create table public.reminder_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  source text not null check (source in ('manual', 'cron')),
  tasks_created integer not null default 0 check (tasks_created >= 0),
  ran_by uuid references auth.users (id) on delete set null,
  ran_at timestamptz not null default now()
);

create index reminder_runs_org_idx on public.reminder_runs (organisation_id, ran_at desc);

alter table public.reminder_runs enable row level security;

create policy reminder_runs_select_staff on public.reminder_runs for
select
  to authenticated using (
    app.has_role (
      organisation_id,
      array[
        'owner',
        'admin',
        'property_manager',
        'letting_agent',
        'caretaker',
        'maintenance_coordinator',
        'accountant'
      ]::public.app_role[]
    )
  );

grant
select on public.reminder_runs to authenticated;

-- Every generated notice gets a dedupe key, so a retried or overlapping run
-- cannot queue the same reminder twice.
alter table public.messages
add column dedupe_key text check (length(btrim(dedupe_key)) between 1 and 200);

create unique index messages_dedupe_idx on public.messages (organisation_id, dedupe_key)
where
  dedupe_key is not null;

-- ---------------------------------------------------------------------------
-- Queue one operational message to a tenant.
--
-- The provider is still a delivery concern; this records a real queued message
-- with the tenant's preferred channel, or the best reachable fallback. No
-- message is queued without an address.
-- ---------------------------------------------------------------------------
create or replace function app.queue_tenant_message (
  p_organisation_id uuid,
  p_tenant_id uuid,
  p_template_key text,
  p_related_type text,
  p_related_id uuid,
  p_dedupe_key text
) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  tenant_row record;
  template_row record;
  organisation_name text;
  delivery_channel public.message_channel;
  delivery_address text;
  body text;
  subject text;
  message_id uuid;
begin
  select
    t.user_id, t.display_name, t.preferred_channel, t.phone, t.email,
    u.phone as user_phone, u.email as user_email
  into tenant_row
  from public.tenants t
  left join public.users u on u.id = t.user_id
  where t.id = p_tenant_id and t.organisation_id = p_organisation_id;

  if not found then
    return null;
  end if;

  if tenant_row.preferred_channel in ('whatsapp', 'sms', 'phone')
     and coalesce(tenant_row.phone, tenant_row.user_phone) is not null then
    delivery_channel := case when tenant_row.preferred_channel = 'sms'
      then 'sms'::public.message_channel else 'whatsapp'::public.message_channel end;
    delivery_address := coalesce(tenant_row.phone, tenant_row.user_phone);
  elsif coalesce(tenant_row.email, tenant_row.user_email) is not null then
    delivery_channel := 'email';
    delivery_address := coalesce(tenant_row.email, tenant_row.user_email);
  elsif coalesce(tenant_row.phone, tenant_row.user_phone) is not null then
    delivery_channel := 'whatsapp';
    delivery_address := coalesce(tenant_row.phone, tenant_row.user_phone);
  else
    return null;
  end if;

  if delivery_address is null or length(btrim(delivery_address)) < 3 then
    return null;
  end if;

  select mt.id, mt.body as template_body, mt.subject as template_subject
  into template_row
  from public.message_templates mt
  where mt.organisation_id = p_organisation_id
    and mt.key = p_template_key
    and mt.channel = delivery_channel
    and mt.active
  limit 1;

  if not found then
    return null;
  end if;

  select name into organisation_name from public.organisations where id = p_organisation_id;

  body := replace(
    replace(template_row.template_body, '{{recipient_name}}', tenant_row.display_name),
    '{{organisation_name}}', coalesce(organisation_name, 'the agency')
  );
  subject := case when template_row.template_subject is null then null
    else replace(
      replace(template_row.template_subject, '{{recipient_name}}', tenant_row.display_name),
      '{{organisation_name}}', coalesce(organisation_name, 'the agency')
    ) end;

  insert into public.messages (
    organisation_id, channel, purpose, template_id, recipient_type, recipient_id,
    recipient_user_id, recipient_name, recipient_address, subject, body,
    related_type, related_id, dedupe_key, created_by
  )
  values (
    p_organisation_id, delivery_channel, 'operational', template_row.id, 'tenant', p_tenant_id,
    tenant_row.user_id, tenant_row.display_name, delivery_address, subject, body,
    p_related_type, p_related_id, p_dedupe_key, auth.uid()
  )
  on conflict (organisation_id, dedupe_key) where dedupe_key is not null do nothing
  returning id into message_id;

  return message_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reminder generation: rent, and each configured lease threshold.
-- ---------------------------------------------------------------------------
create or replace function public.generate_reminder_tasks (
  p_organisation_id uuid,
  p_rent_days_ahead integer default null,
  p_lease_days_ahead integer default null
) returns integer language plpgsql security definer
set
  search_path = '' as $$
declare
  v_created integer := 0;
  v_rows integer := 0;
  v_rent_days integer;
  v_lease_days integer[];
  v_days integer;
  v_org_name text;
  v_charge record;
  v_lease record;
begin
  if auth.uid () is not null and not app.has_role (
    p_organisation_id,
    array[
      'owner', 'admin', 'property_manager', 'letting_agent', 'caretaker',
      'maintenance_coordinator', 'accountant'
    ]::public.app_role[]
  ) then
    raise exception 'your role cannot generate reminders' using errcode = '42501';
  end if;

  select rent_reminder_days, lease_alert_days, name
  into v_rent_days, v_lease_days, v_org_name
  from public.organisations
  where id = p_organisation_id;

  if not found then
    raise exception 'organisation % not found', p_organisation_id using errcode = 'P0002';
  end if;

  v_rent_days := coalesce(p_rent_days_ahead, v_rent_days, 7);
  v_lease_days := case when p_lease_days_ahead is null
    then v_lease_days else array[p_lease_days_ahead] end;

  insert into public.tasks (
    organisation_id, title, notes, owner_user_id, due_on, priority,
    related_type, related_id, dedupe_key, created_by
  )
  select
    p_organisation_id,
    'Rent reminder · ' || tenant.display_name || ' · ' || unit.label,
    'Rent of ₦' || to_char(charge.amount_kobo / 100.0, 'FM999,999,999,999.00') ||
      ' for ' || to_char(charge.period_start, 'DD Mon YYYY') || ' to ' ||
      to_char(charge.period_end, 'DD Mon YYYY') || ' is due on ' ||
      to_char(charge.due_on, 'DD Mon YYYY') || '.',
    auth.uid (), charge.due_on,
    case when charge.due_on < current_date
      then 'high'::public.task_priority else 'normal'::public.task_priority end,
    'charge', charge.id, 'rent_reminder:' || charge.id::text, auth.uid ()
  from public.charges charge
  join public.leases lease on lease.id = charge.lease_id
  join public.units unit on unit.id = lease.unit_id
  join public.properties property on property.id = unit.property_id
  join public.lease_parties party on party.lease_id = lease.id and party.role = 'tenant'
  join public.tenants tenant on tenant.id = party.tenant_id
  where charge.organisation_id = p_organisation_id
    and charge.status = 'open'
    and charge.due_on <= current_date + greatest(v_rent_days, 0)
    and (
      select coalesce(sum(allocation.amount_kobo), 0)
      from public.payment_allocations allocation
      where allocation.charge_id = charge.id
    ) < charge.amount_kobo
  on conflict (organisation_id, dedupe_key) where dedupe_key is not null do nothing;

  get diagnostics v_rows = row_count;
  v_created := v_created + v_rows;

  for v_charge in
    select charge.id, party.tenant_id
    from public.charges charge
    join public.leases lease on lease.id = charge.lease_id
    join public.lease_parties party on party.lease_id = lease.id and party.role = 'tenant'
    where charge.organisation_id = p_organisation_id
      and charge.status = 'open'
      and charge.due_on <= current_date + greatest(v_rent_days, 0)
      and (
        select coalesce(sum(allocation.amount_kobo), 0)
        from public.payment_allocations allocation
        where allocation.charge_id = charge.id
      ) < charge.amount_kobo
  loop
    perform app.queue_tenant_message(
      p_organisation_id, v_charge.tenant_id, 'rent_reminder', 'charge',
      v_charge.id, 'rent_reminder:' || v_charge.id::text
    );
  end loop;

  foreach v_days in array v_lease_days
  loop
    insert into public.tasks (
      organisation_id, title, notes, owner_user_id, due_on, priority,
      related_type, related_id, dedupe_key, created_by
    )
    select
      p_organisation_id,
      'Lease expiry (' || v_days || ' days) · ' || tenant.display_name || ' · ' || unit.label,
      'The tenancy ' || coalesce(lease.reference, lease.id::text) ||
        ' at ' || property.name || ' ends on ' || to_char(lease.ends_on, 'DD Mon YYYY') ||
        '. Start the renewal conversation.',
      auth.uid (), current_date,
      case when v_days <= 30
        then 'high'::public.task_priority else 'normal'::public.task_priority end,
      'lease', lease.id,
      'lease_expiry:' || lease.id::text || ':' || v_days,
      auth.uid ()
    from public.leases lease
    join public.units unit on unit.id = lease.unit_id
    join public.properties property on property.id = unit.property_id
    join public.lease_parties party on party.lease_id = lease.id and party.role = 'tenant'
    join public.tenants tenant on tenant.id = party.tenant_id
    where lease.organisation_id = p_organisation_id
      and lease.status = 'active'
      and lease.ends_on = current_date + v_days
    on conflict (organisation_id, dedupe_key) where dedupe_key is not null do nothing;

    get diagnostics v_rows = row_count;
    v_created := v_created + v_rows;

    for v_lease in
      select lease.id, party.tenant_id
      from public.leases lease
      join public.lease_parties party on party.lease_id = lease.id and party.role = 'tenant'
      where lease.organisation_id = p_organisation_id
        and lease.status = 'active'
        and lease.ends_on = current_date + v_days
    loop
      perform app.queue_tenant_message(
        p_organisation_id, v_lease.tenant_id, 'lease_expiry', 'lease',
        v_lease.id, 'lease_expiry:' || v_lease.id::text || ':' || v_days
      );
    end loop;
  end loop;

  return v_created;
end;
$$;

create or replace function public.run_reminder_dispatch (
  p_organisation_id uuid default null,
  p_source text default 'manual'
) returns integer language plpgsql security definer
set
  search_path = '' as $$
declare
  v_org record;
  v_count integer := 0;
  v_created integer;
begin
  if p_source not in ('manual', 'cron') then
    raise exception 'reminder source must be manual or cron' using errcode = '22023';
  end if;

  if p_organisation_id is null and auth.uid () is not null then
    raise exception 'only the scheduler can run reminders for every organisation'
      using errcode = '42501';
  end if;

  for v_org in
    select id from public.organisations
    where p_organisation_id is null or id = p_organisation_id
  loop
    if p_organisation_id is not null and not app.has_role (
      v_org.id,
      array[
        'owner', 'admin', 'property_manager', 'letting_agent', 'caretaker',
        'maintenance_coordinator', 'accountant'
      ]::public.app_role[]
    ) then
      raise exception 'your role cannot run reminders' using errcode = '42501';
    end if;

    v_created := public.generate_reminder_tasks(v_org.id);

    insert into public.reminder_runs (
      organisation_id, source, tasks_created, ran_by
    )
    values (v_org.id, p_source, v_created, auth.uid ());

    v_count := v_count + v_created;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.generate_reminder_tasks (uuid, integer, integer)
from
  public;

revoke all on function public.run_reminder_dispatch (uuid, text)
from
  public;

grant execute on function public.generate_reminder_tasks (uuid, integer, integer) to authenticated;

grant execute on function public.run_reminder_dispatch (uuid, text) to authenticated;

-- Daily dispatch at 06:00 Africa/Lagos (05:00 UTC). pg_cron must be enabled on
-- the hosted project; CREATE EXTENSION can be refused inside a migration
-- transaction, so the guards keep fresh environments migratable and the job is
-- created when the extension is available. Hosted production has this job active.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('tenaville-reminder-dispatch');
exception
  when others then null;
end
$$;

do $$
begin
  perform cron.schedule(
    'tenaville-reminder-dispatch',
    '0 5 * * *',
    $cron$select public.run_reminder_dispatch(null, 'cron')$cron$
  );
exception
  when others then null;
end
$$;

-- Maintenance notices: in-app notice plus a queued outbound message.
create or replace function app.notify_maintenance_tenant () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  tenant_user uuid;
  title text;
  body text;
begin
  if new.tenant_id is null then
    return new;
  end if;

  select t.user_id into tenant_user
  from public.tenants t
  where t.id = new.tenant_id;

  if not found then
    return new;
  end if;

  if tg_op = 'INSERT' then
    title := 'Repair request received';
    body := 'The agency has received your ' || replace(new.category::text, '_', ' ') || ' request.';
  elsif new.status is distinct from old.status then
    title := 'Repair status updated';
    body := 'Your repair is now ' || replace(new.status::text, '_', ' ') || '.';
  elsif new.assignee_user_id is distinct from old.assignee_user_id
        or new.vendor_id is distinct from old.vendor_id
        or new.due_on is distinct from old.due_on then
    title := 'Repair assignment updated';
    body := 'The agency has updated who is handling your repair or when it is due.';
  else
    return new;
  end if;

  if tenant_user is not null then
    insert into public.notifications (
      organisation_id, user_id, kind, title, body, related_type, related_id
    )
    values (
      new.organisation_id, tenant_user, 'maintenance', title, body,
      'maintenance_request', new.id
    );
  end if;

  perform app.queue_tenant_message(
    new.organisation_id,
    new.tenant_id,
    'maintenance_update',
    'maintenance_request',
    new.id,
    'maintenance:' || new.id::text || ':' || new.status::text
  );

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RENT-14: apply tenant credit to a future charge
-- ---------------------------------------------------------------------------
create or replace function app.deny_allocation_rewrite () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  -- The only permitted rewrite is the credit-application RPC reducing or
  -- removing a credit row. The total across the payment is unchanged because
  -- the same amount is inserted against the target charge in the same txn.
  if current_setting('app.credit_application', true) = 'on'
     and old.charge_id is null
     and (tg_op = 'DELETE' or (
       new.charge_id is null
       and new.amount_kobo < old.amount_kobo
       and new.payment_id = old.payment_id
       and new.lease_id = old.lease_id
     )) then
    return coalesce(new, old);
  end if;

  raise exception 'an allocation is never changed or removed'
    using errcode = '42501',
          hint = 'Reverse the payment and record a corrected one.';
end;
$$;

create or replace function public.apply_tenant_credit (
  p_credit_allocation_id uuid,
  p_charge_id uuid,
  p_amount_kobo bigint
) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  credit_row public.payment_allocations;
  target_charge public.charges;
  paid bigint;
  applied_id uuid;
  payment_status public.payment_status;
begin
  if auth.uid () is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into credit_row from public.payment_allocations where id = p_credit_allocation_id for update;
  if credit_row.id is null or credit_row.charge_id is not null then
    raise exception 'that is not an available tenant credit' using errcode = '22023';
  end if;

  if not app.has_role (
    credit_row.organisation_id,
    array['owner', 'admin', 'property_manager', 'accountant']::public.app_role[]
  ) or not app.can_reach_lease (credit_row.lease_id) then
    raise exception 'your role cannot apply this credit' using errcode = '42501';
  end if;

  select status into payment_status from public.payments where id = credit_row.payment_id;
  if payment_status = 'reversed' then
    raise exception 'that payment has been reversed' using errcode = '23514';
  end if;

  select * into target_charge from public.charges where id = p_charge_id for update;
  if target_charge.id is null
     or target_charge.lease_id <> credit_row.lease_id
     or target_charge.status <> 'open' then
    raise exception 'choose an open charge on the same tenancy' using errcode = '22023';
  end if;

  if target_charge.due_on < current_date then
    raise exception 'credit can only be applied to a future charge' using errcode = '22023';
  end if;

  if p_amount_kobo <= 0 or p_amount_kobo > credit_row.amount_kobo then
    raise exception 'choose an amount within the available credit' using errcode = '22023';
  end if;

  select coalesce(sum(a.amount_kobo), 0) into paid
  from public.payment_allocations a
  where a.charge_id = target_charge.id;

  if p_amount_kobo > target_charge.amount_kobo - paid then
    raise exception 'the charge does not owe that much' using errcode = '23514';
  end if;

  insert into public.payment_allocations (
    organisation_id, payment_id, lease_id, charge_id, amount_kobo, note, created_by
  )
  values (
    credit_row.organisation_id, credit_row.payment_id, credit_row.lease_id,
    target_charge.id, p_amount_kobo, 'Applied from tenant credit', auth.uid ()
  )
  returning id into applied_id;

  perform set_config('app.credit_application', 'on', true);
  if p_amount_kobo = credit_row.amount_kobo then
    delete from public.payment_allocations where id = credit_row.id;
  else
    update public.payment_allocations
    set amount_kobo = amount_kobo - p_amount_kobo
    where id = credit_row.id;
  end if;
  perform set_config('app.credit_application', 'off', true);

  insert into public.audit_events (
    organisation_id, actor_user_id, actor_label, action, entity_type, entity_id, after
  )
  values (
    credit_row.organisation_id, auth.uid (), auth.email (),
    'payment.credit_applied', 'payment_allocation', applied_id::text,
    jsonb_build_object(
      'credit_allocation_id', credit_row.id,
      'charge_id', target_charge.id,
      'amount_kobo', p_amount_kobo
    )
  );

  return applied_id;
end;
$$;

revoke all on function public.apply_tenant_credit (uuid, uuid, bigint)
from
  public;

grant execute on function public.apply_tenant_credit (uuid, uuid, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Screening applications (DOC-1)
-- ---------------------------------------------------------------------------
create table public.screening_applications (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  unit_id uuid references public.units (id) on delete set null,
  applicant_name text not null check (length(btrim(applicant_name)) between 1 and 200),
  applicant_email text check (position('@' in applicant_email) > 1),
  applicant_phone text check (applicant_phone ~ '^\+[1-9][0-9]{7,14}$'),
  status text not null default 'submitted' check (
    status in ('draft', 'submitted', 'approved', 'declined')
  ),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create trigger screening_applications_touch_updated_at
before update on public.screening_applications for each row
execute function app.touch_updated_at ();

create trigger screening_applications_audit
after insert or update or delete on public.screening_applications for each row
execute function app.audit_row_change ('screening_application');

alter table public.screening_applications enable row level security;

create policy screening_applications_staff on public.screening_applications for all to authenticated using (
  app.has_role (
    organisation_id,
    array['owner', 'admin', 'property_manager', 'letting_agent']::public.app_role[]
  )
)
with
  check (
    app.has_role (
      organisation_id,
      array['owner', 'admin', 'property_manager', 'letting_agent']::public.app_role[]
    )
  );

grant
select,
insert,
update on public.screening_applications to authenticated;

alter table public.documents
drop constraint documents_entity_type_check;

alter table public.documents
add constraint documents_entity_type_check check (
  entity_type in (
    'property',
    'unit',
    'landlord',
    'tenant',
    'lease',
    'deposit_deduction',
    'handover',
    'maintenance_request',
    'payment',
    'ledger_entry',
    'screening_application'
  )
);

-- ---------------------------------------------------------------------------
-- DOC-6: malware scan state on documents
-- ---------------------------------------------------------------------------
create type public.document_scan_status as enum('unscanned', 'clean', 'infected', 'error');

alter table public.documents
add column scan_status public.document_scan_status not null default 'unscanned';

alter table public.documents
add column scan_engine text;

alter table public.documents
add column scan_detail text;

alter table public.documents
add column scanned_at timestamptz;

-- ---------------------------------------------------------------------------
-- AN-1 report views
-- ---------------------------------------------------------------------------
create view public.report_occupancy
with
  (security_invoker = true) as
select
  u.organisation_id,
  p.id as property_id,
  p.name as property,
  u.id as unit_id,
  u.label as unit,
  u.status,
  l.id as lease_id,
  l.ends_on
from public.units u
join public.properties p on p.id = u.property_id
left join public.leases l on l.unit_id = u.id and l.status = 'active'
where u.archived_at is null
  and p.archived_at is null;

create view public.report_lease_expiry
with
  (security_invoker = true) as
select
  l.organisation_id,
  l.id as lease_id,
  l.reference,
  l.ends_on,
  (l.ends_on - current_date) as days_to_expiry,
  l.rent_kobo,
  u.label as unit,
  p.name as property,
  party.tenant_id,
  t.display_name as tenant
from public.leases l
join public.units u on u.id = l.unit_id
join public.properties p on p.id = u.property_id
join public.lease_parties party on party.lease_id = l.id and party.role = 'tenant'
join public.tenants t on t.id = party.tenant_id
where l.status = 'active';

create view public.report_maintenance_queue
with
  (security_invoker = true) as
select
  r.organisation_id,
  r.id as request_id,
  r.status,
  r.priority,
  r.urgency,
  r.category,
  r.reported_on,
  r.due_on,
  p.name as property,
  u.label as unit,
  (current_date - r.due_on) as days_overdue
from public.maintenance_requests r
join public.properties p on p.id = r.property_id
left join public.units u on u.id = r.unit_id
where r.status not in ('closed', 'rejected');

grant
select on public.report_occupancy,
public.report_lease_expiry,
public.report_maintenance_queue to authenticated;
