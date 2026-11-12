-- Communications, reminders and tasks, R1 foundation (COMMS-1 … COMMS-4, COMMS-6,
-- COMMS-8).
--
-- The provider is deliberately outside the database. A message is recorded
-- before an attempt and a delivery row is recorded for every channel tried, so
-- a failed WhatsApp send that falls back to SMS is one message with two
-- attempts — not two messages with no link between them.
--
-- Tasks are the human fallback for everything that cannot be automated, and the
-- reminder generator turns the rent schedule and lease end dates into an
-- idempotent daily queue.
-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type public.message_channel as enum('whatsapp', 'sms', 'email');

create type public.message_status as enum(
  'queued',
  'sent',
  'delivered',
  'failed',
  'skipped'
);

create type public.message_purpose as enum('operational', 'marketing');

create type public.message_template_status as enum(
  'draft',
  'pending_approval',
  'approved',
  'rejected'
);

create type public.task_priority as enum('low', 'normal', 'high', 'urgent');

create type public.task_status as enum('open', 'done', 'cancelled');

-- ---------------------------------------------------------------------------
-- Templates (COMMS-1, COMMS-8)
-- ---------------------------------------------------------------------------
create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  -- A stable key lets code request "rent_reminder" without knowing the wording
  -- an agency chose.
  key text not null check (key ~ '^[a-z0-9_]{2,60}$'),
  name text not null check (length(btrim(name)) between 2 and 120),
  channel public.message_channel not null,
  subject text check (length(btrim(subject)) between 1 and 200),
  body text not null check (length(btrim(body)) between 5 and 4000),
  -- WhatsApp business-initiated messages need a provider-approved template
  -- name. Email and SMS do not.
  whatsapp_template_name text check (
    length(btrim(whatsapp_template_name)) between 1 and 120
  ),
  approval_status public.message_template_status not null default 'draft',
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (organisation_id, key, channel),
  constraint message_templates_whatsapp_named check (
    channel <> 'whatsapp'
    or whatsapp_template_name is not null
  )
);

create index message_templates_org_idx on public.message_templates (organisation_id, active);

create trigger message_templates_touch_updated_at
before update on public.message_templates for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Messages and delivery attempts (COMMS-3)
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  channel public.message_channel not null,
  purpose public.message_purpose not null default 'operational',
  template_id uuid references public.message_templates (id) on delete set null,
  recipient_type text not null check (recipient_type in ('tenant', 'landlord', 'other')),
  recipient_id uuid,
  recipient_user_id uuid references auth.users (id) on delete set null,
  recipient_name text not null check (length(btrim(recipient_name)) between 1 and 200),
  recipient_address text not null check (
    length(btrim(recipient_address)) between 3 and 300
  ),
  subject text check (length(btrim(subject)) between 1 and 200),
  body text not null check (length(btrim(body)) between 1 and 4000),
  related_type text check (length(btrim(related_type)) between 1 and 60),
  related_id uuid,
  status public.message_status not null default 'queued',
  sent_channel public.message_channel,
  provider text,
  provider_message_id text,
  cost_kobo bigint not null default 0 check (cost_kobo >= 0),
  error text,
  created_by uuid references auth.users (id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index messages_org_idx on public.messages (organisation_id, created_at desc);

create index messages_recipient_idx on public.messages (recipient_user_id, created_at desc)
where
  recipient_user_id is not null;

create index messages_related_idx on public.messages (related_type, related_id)
where
  related_id is not null;

create trigger messages_touch_updated_at
before update on public.messages for each row
execute function app.touch_updated_at ();

create table public.message_deliveries (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete restrict,
  channel public.message_channel not null,
  status public.message_status not null,
  provider text,
  provider_message_id text,
  error text,
  attempted_at timestamptz not null default now()
);

create index message_deliveries_message_idx on public.message_deliveries (message_id, attempted_at);

create or replace function app.deny_message_delivery_rewrite () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  raise exception 'a message delivery attempt is never changed or removed'
    using errcode = '42501';
end;
$$;

create trigger message_deliveries_append_only
before update or delete on public.message_deliveries for each row
execute function app.deny_message_delivery_rewrite ();

-- ---------------------------------------------------------------------------
-- Notification preferences (COMMS-6)
-- ---------------------------------------------------------------------------
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose public.message_purpose not null default 'operational',
  channel public.message_channel not null,
  opted_in boolean not null default true,
  updated_at timestamptz,
  unique (organisation_id, user_id, purpose, channel)
);

create trigger notification_preferences_touch_updated_at
before update on public.notification_preferences for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Tasks (COMMS-4)
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  title text not null check (length(btrim(title)) between 2 and 240),
  notes text check (length(btrim(notes)) between 1 and 4000),
  owner_user_id uuid references auth.users (id) on delete set null,
  due_on date,
  priority public.task_priority not null default 'normal',
  status public.task_status not null default 'open',
  related_type text check (length(btrim(related_type)) between 1 and 60),
  related_id uuid,
  -- Set by the reminder generator so running it twice cannot duplicate a
  -- reminder for the same charge or lease.
  dedupe_key text check (length(btrim(dedupe_key)) between 1 and 200),
  created_by uuid references auth.users (id) on delete set null,
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint tasks_done_recorded check (
    status <> 'done'
    or (
      completed_at is not null
      and completed_by is not null
    )
  )
);

create index tasks_queue_idx on public.tasks (organisation_id, status, due_on, priority);

create index tasks_owner_idx on public.tasks (owner_user_id, status, due_on)
where
  owner_user_id is not null;

create unique index tasks_dedupe_idx on public.tasks (organisation_id, dedupe_key)
where
  dedupe_key is not null;

create trigger tasks_touch_updated_at
before update on public.tasks for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Default templates
-- ---------------------------------------------------------------------------
create or replace function app.seed_message_templates (target_organisation_id uuid) returns void language plpgsql security definer
set
  search_path = '' as $$
begin
  insert into public.message_templates (
    organisation_id, key, name, channel, subject, body,
    whatsapp_template_name, approval_status
  )
  select
    target_organisation_id,
    template.key,
    template.name,
    channel.channel,
    case when channel.channel = 'email' then template.subject else null end,
    template.body,
    case when channel.channel = 'whatsapp' then template.key else null end,
    case when channel.channel = 'whatsapp'
      then 'draft'::public.message_template_status
      else 'approved'::public.message_template_status
    end
  from (
    values
      (
        'rent_reminder',
        'Rent reminder',
        'Rent reminder',
        'Hello {{recipient_name}}, this is a reminder from {{organisation_name}} about rent on your tenancy. Please contact us if you have already paid.'
      ),
      (
        'receipt',
        'Payment receipt',
        'Your receipt is ready',
        'Hello {{recipient_name}}, your receipt from {{organisation_name}} is ready. Thank you for your payment.'
      ),
      (
        'lease_expiry',
        'Lease expiry',
        'Your tenancy is approaching its end date',
        'Hello {{recipient_name}}, your tenancy with {{organisation_name}} is approaching its end date. We will contact you about renewal.'
      ),
      (
        'maintenance_update',
        'Maintenance update',
        'Repair update',
        'Hello {{recipient_name}}, there is an update on your repair from {{organisation_name}}. Open your tenant portal to see the latest status.'
      ),
      (
        'statement',
        'Landlord statement',
        'Your statement is ready',
        'Hello {{recipient_name}}, your latest statement from {{organisation_name}} is ready.'
      )
  ) as template(key, name, subject, body)
  cross join unnest(enum_range(null::public.message_channel)) as channel(channel)
  on conflict (organisation_id, key, channel) do nothing;
end;
$$;

create or replace function app.seed_templates_for_organisation () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  perform app.seed_message_templates (new.id);
  return new;
end;
$$;

create trigger organisations_seed_message_templates
after insert on public.organisations for each row
execute function app.seed_templates_for_organisation ();

select
  app.seed_message_templates (id)
from
  public.organisations;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.message_templates enable row level security;

alter table public.messages enable row level security;

alter table public.message_deliveries enable row level security;

alter table public.notification_preferences enable row level security;

alter table public.tasks enable row level security;

create policy message_templates_select_staff on public.message_templates for
select
  to authenticated using (
    organisation_id in (
      select
        app.current_organisation_ids ()
    )
    and app.is_staff (organisation_id)
  );

create policy message_templates_write_admin on public.message_templates for all to authenticated using (
  app.has_role (
    organisation_id,
    array['owner', 'admin']::public.app_role[]
  )
)
with
  check (
    app.has_role (
      organisation_id,
      array['owner', 'admin']::public.app_role[]
    )
  );

create policy messages_select_staff_or_recipient on public.messages for
select
  to authenticated using (
    recipient_user_id = auth.uid ()
    or (
      organisation_id in (
        select
          app.current_organisation_ids ()
      )
      and app.is_staff (organisation_id)
    )
  );

create policy messages_insert_staff on public.messages for insert to authenticated
with
  check (
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

create policy message_deliveries_select_staff_or_recipient on public.message_deliveries for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.messages m
      where
        m.id = message_deliveries.message_id
        and (
          m.recipient_user_id = auth.uid ()
          or (
            m.organisation_id in (
              select
                app.current_organisation_ids ()
            )
            and app.is_staff (m.organisation_id)
          )
        )
    )
  );

create policy notification_preferences_select_self_or_staff on public.notification_preferences for
select
  to authenticated using (
    user_id = auth.uid ()
    or (
      organisation_id in (
        select
          app.current_organisation_ids ()
      )
      and app.is_staff (organisation_id)
    )
  );

create policy notification_preferences_write_self on public.notification_preferences for all to authenticated using (user_id = auth.uid ())
with
  check (
    user_id = auth.uid ()
    and organisation_id in (
      select
        app.current_organisation_ids ()
    )
  );

create policy tasks_select_staff on public.tasks for
select
  to authenticated using (
    organisation_id in (
      select
        app.current_organisation_ids ()
    )
    and app.is_staff (organisation_id)
  );

create policy tasks_write_staff on public.tasks for all to authenticated using (
  organisation_id in (
    select
      app.current_organisation_ids ()
  )
  and app.is_staff (organisation_id)
)
with
  check (
    organisation_id in (
      select
        app.current_organisation_ids ()
    )
    and app.is_staff (organisation_id)
  );

-- ---------------------------------------------------------------------------
-- Recording what the provider said
-- ---------------------------------------------------------------------------
create or replace function public.record_message_result (
  p_message_id uuid,
  p_channel public.message_channel,
  p_status public.message_status,
  p_provider text default null,
  p_provider_message_id text default null,
  p_error text default null,
  p_cost_kobo bigint default 0
) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  v_message public.messages;
begin
  select * into v_message
  from public.messages
  where id = p_message_id;

  if v_message.id is null then
    raise exception 'the message was not found' using errcode = '22023';
  end if;

  if not app.has_role (
    v_message.organisation_id,
    array[
      'owner',
      'admin',
      'property_manager',
      'letting_agent',
      'caretaker',
      'maintenance_coordinator',
      'accountant'
    ]::public.app_role[]
  ) then
    raise exception 'your role cannot record message delivery' using errcode = '42501';
  end if;

  insert into public.message_deliveries (
    organisation_id, message_id, channel, status, provider, provider_message_id, error
  )
  values (
    v_message.organisation_id, p_message_id, p_channel, p_status,
    p_provider, p_provider_message_id, p_error
  );

  update public.messages
  set
    status = p_status,
    sent_channel = case when p_status in ('sent', 'delivered') then p_channel else sent_channel end,
    provider = coalesce(p_provider, provider),
    provider_message_id = coalesce(p_provider_message_id, provider_message_id),
    error = p_error,
    cost_kobo = cost_kobo + greatest(p_cost_kobo, 0),
    sent_at = case when p_status in ('sent', 'delivered')
      then coalesce(sent_at, now ()) else sent_at end
  where id = p_message_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reminder tasks from rent and lease dates (COMMS-4, RENT-6)
-- ---------------------------------------------------------------------------
create or replace function public.generate_reminder_tasks (
  p_organisation_id uuid,
  p_rent_days_ahead integer default 7,
  p_lease_days_ahead integer default 30
) returns integer language plpgsql security definer
set
  search_path = '' as $$
declare
  v_created integer := 0;
  v_rows integer := 0;
begin
  if not app.has_role (
    p_organisation_id,
    array[
      'owner',
      'admin',
      'property_manager',
      'letting_agent',
      'caretaker',
      'maintenance_coordinator',
      'accountant'
    ]::public.app_role[]
  ) then
    raise exception 'your role cannot generate reminders' using errcode = '42501';
  end if;

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
    auth.uid (),
    charge.due_on,
    case when charge.due_on < current_date
      then 'high'::public.task_priority
      else 'normal'::public.task_priority end,
    'charge',
    charge.id,
    'rent_reminder:' || charge.id::text,
    auth.uid ()
  from public.charges charge
  join public.leases lease on lease.id = charge.lease_id
  join public.units unit on unit.id = lease.unit_id
  join public.properties property on property.id = unit.property_id
  join public.lease_parties party on party.lease_id = lease.id and party.role = 'tenant'
  join public.tenants tenant on tenant.id = party.tenant_id
  where charge.organisation_id = p_organisation_id
    and charge.status = 'open'
    and charge.due_on <= current_date + greatest(p_rent_days_ahead, 0)
    and (
      select coalesce(sum(allocation.amount_kobo), 0)
      from public.payment_allocations allocation
      where allocation.charge_id = charge.id
    ) < charge.amount_kobo
  on conflict (organisation_id, dedupe_key) where dedupe_key is not null do nothing;

  get diagnostics v_rows = row_count;
  v_created := v_created + v_rows;

  insert into public.tasks (
    organisation_id, title, notes, owner_user_id, due_on, priority,
    related_type, related_id, dedupe_key, created_by
  )
  select
    p_organisation_id,
    'Lease expiry · ' || tenant.display_name || ' · ' || unit.label,
    'The tenancy ' || coalesce(lease.reference, lease.id::text) ||
      ' at ' || property.name || ' ends on ' || to_char(lease.ends_on, 'DD Mon YYYY') ||
      '. Start the renewal conversation.',
    auth.uid (),
    lease.ends_on,
    case when lease.ends_on <= current_date + 7
      then 'high'::public.task_priority
      else 'normal'::public.task_priority end,
    'lease',
    lease.id,
    'lease_expiry:' || lease.id::text,
    auth.uid ()
  from public.leases lease
  join public.units unit on unit.id = lease.unit_id
  join public.properties property on property.id = unit.property_id
  join public.lease_parties party on party.lease_id = lease.id and party.role = 'tenant'
  join public.tenants tenant on tenant.id = party.tenant_id
  where lease.organisation_id = p_organisation_id
    and lease.status = 'active'
    and lease.ends_on between current_date and current_date + greatest(p_lease_days_ahead, 0)
  on conflict (organisation_id, dedupe_key) where dedupe_key is not null do nothing;

  get diagnostics v_rows = row_count;
  v_created := v_created + v_rows;

  return v_created;
end;
$$;

-- ---------------------------------------------------------------------------
-- Audit (ORG-5) and append-only log exemptions
-- ---------------------------------------------------------------------------
create trigger message_templates_audit
after insert or update or delete on public.message_templates for each row
execute function app.audit_row_change ('message_template');

create trigger tasks_audit
after insert or update or delete on public.tasks for each row
execute function app.audit_row_change ('task');

create trigger notification_preferences_audit
after insert or update or delete on public.notification_preferences for each row
execute function app.audit_row_change ('notification_preference');

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant
select
,
  insert,
update on public.message_templates to authenticated;

grant
select
,
  insert on public.messages to authenticated;

grant
select
  on public.message_deliveries to authenticated;

grant
select
,
  insert,
update on public.notification_preferences to authenticated;

grant
select
,
  insert,
update on public.tasks to authenticated;

revoke all on public.message_templates,
public.messages,
public.message_deliveries,
public.notification_preferences,
public.tasks
from
  anon;

revoke all on function app.seed_message_templates (uuid)
from
  public;

revoke all on function app.seed_templates_for_organisation ()
from
  public;

revoke all on function public.record_message_result (
  uuid,
  public.message_channel,
  public.message_status,
  text,
  text,
  text,
  bigint
)
from
  public;

revoke all on function public.generate_reminder_tasks (uuid, integer, integer)
from
  public;

grant
execute on function public.record_message_result (
  uuid,
  public.message_channel,
  public.message_status,
  text,
  text,
  text,
  bigint
) to authenticated;

grant
execute on function public.generate_reminder_tasks (uuid, integer, integer) to authenticated;
