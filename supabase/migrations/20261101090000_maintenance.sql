-- Maintenance and repairs, R1 foundation (MAINT-1 … MAINT-6, MAINT-10, MAINT-11,
-- MAINT-16) plus the approval gate the portal needs (MAINT-8).
--
-- The workflow is deliberately one request with many timeline events and cost
-- lines. A request survives its tenancy: it is attached to the property/unit,
-- and the lease/tenant are context that may later end. Repair history is
-- therefore still there for the next tenant (MAINT-16).
--
-- Status changes, assignment, comments, costs and approvals all go through
-- security-definer functions. The tables are read-only to clients so a status
-- cannot jump the transition map and a completion cannot skip its cost or its
-- approval gate.
-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type public.maintenance_category as enum(
  'plumbing',
  'electrical',
  'structural',
  'appliance',
  'hvac',
  'pest',
  'cleaning',
  'security',
  'other'
);

create type public.maintenance_urgency as enum('low', 'normal', 'high', 'emergency');

create type public.maintenance_priority as enum('low', 'normal', 'high', 'urgent');

-- submitted → acknowledged → assigned → in_progress → completed → closed.
-- awaiting_approval sits beside in_progress: work above the threshold cannot be
-- completed until the approval is recorded (MAINT-8). on_hold and rejected are
-- exits, not detours, and closed is terminal.
create type public.maintenance_status as enum(
  'submitted',
  'acknowledged',
  'assigned',
  'in_progress',
  'on_hold',
  'awaiting_approval',
  'completed',
  'rejected',
  'closed'
);

create type public.maintenance_submitted_by as enum('staff', 'tenant');

create type public.maintenance_payer as enum(
  'landlord',
  'tenant',
  'agency',
  'service_charge',
  'other'
);

create type public.maintenance_approval_status as enum('pending', 'approved', 'rejected');

create type public.vendor_status as enum('active', 'inactive');

-- The organisation-level threshold is the R1 implementation of MAINT-8. A
-- landlord/property/category matrix can narrow or widen it later; one number
-- per agency is enough until agencies ask for the matrix.
alter table public.organisations
add column maintenance_approval_threshold_kobo bigint not null default 5000000 check (maintenance_approval_threshold_kobo >= 0);

comment on column public.organisations.maintenance_approval_threshold_kobo is 'MAINT-8: a cost above this amount, borne by the landlord, agency or service charge, needs a recorded approval before the job can be completed.';

-- ---------------------------------------------------------------------------
-- Vendors (MAINT-6)
-- ---------------------------------------------------------------------------
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 200),
  trade text not null check (length(btrim(trade)) between 2 and 120),
  contact_name text check (length(btrim(contact_name)) between 2 and 200),
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (email = lower(email)),
  service_areas text[] not null default '{}',
  availability_notes text check (
    length(btrim(availability_notes)) between 1 and 2000
  ),
  performance_notes text check (
    length(btrim(performance_notes)) between 1 and 2000
  ),
  status public.vendor_status not null default 'active',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (organisation_id, name)
);

create index vendors_organisation_idx on public.vendors (organisation_id, status, trade);

create trigger vendors_touch_updated_at
before update on public.vendors for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Maintenance requests
-- ---------------------------------------------------------------------------
create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  -- The unit is nullable because a repair can belong to the building itself.
  property_id uuid not null references public.properties (id) on delete restrict,
  unit_id uuid references public.units (id) on delete restrict,
  -- Context, not ownership: the repair stays against the unit after this lease
  -- ends (MAINT-16).
  lease_id uuid references public.leases (id) on delete restrict,
  tenant_id uuid references public.tenants (id) on delete restrict,
  submitted_by public.maintenance_submitted_by not null,
  reported_by_user_id uuid references auth.users (id) on delete set null,
  reported_on date not null default current_date,
  category public.maintenance_category not null,
  description text not null check (length(btrim(description)) between 5 and 4000),
  urgency public.maintenance_urgency not null default 'normal',
  is_safety_issue boolean not null default false,
  access_constraints text check (
    length(btrim(access_constraints)) between 1 and 2000
  ),
  preferred_access_times text check (
    length(btrim(preferred_access_times)) between 1 and 2000
  ),
  status public.maintenance_status not null default 'submitted',
  priority public.maintenance_priority not null default 'normal',
  coordinator_user_id uuid references auth.users (id) on delete set null,
  assignee_user_id uuid references auth.users (id) on delete set null,
  vendor_id uuid references public.vendors (id) on delete set null,
  due_on date,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users (id) on delete set null,
  assigned_at timestamptz,
  assigned_by uuid references auth.users (id) on delete set null,
  started_at timestamptz,
  on_hold_reason text check (length(btrim(on_hold_reason)) between 1 and 1000),
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete set null,
  completion_notes text check (
    length(btrim(completion_notes)) between 1 and 4000
  ),
  no_cost boolean not null default false,
  rejected_at timestamptz,
  rejected_by uuid references auth.users (id) on delete set null,
  rejection_reason text check (
    length(btrim(rejection_reason)) between 1 and 1000
  ),
  closed_at timestamptz,
  tenant_confirmed_at timestamptz,
  tenant_reopened_at timestamptz,
  reopen_count integer not null default 0 check (reopen_count >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint maintenance_due_not_before_report check (
    due_on is null
    or due_on >= reported_on
  ),
  constraint maintenance_rejected_recorded check (
    status <> 'rejected'
    or (
      rejected_at is not null
      and rejection_reason is not null
    )
  ),
  constraint maintenance_completed_recorded check (
    status <> 'completed'
    or (
      completed_at is not null
      and completion_notes is not null
    )
  )
);

create index maintenance_requests_queue_idx on public.maintenance_requests (organisation_id, status, priority, due_on);

create index maintenance_requests_property_idx on public.maintenance_requests (property_id, unit_id, created_at);

create index maintenance_requests_assignee_idx on public.maintenance_requests (assignee_user_id)
where
  assignee_user_id is not null;

create index maintenance_requests_vendor_idx on public.maintenance_requests (vendor_id)
where
  vendor_id is not null;

create trigger maintenance_requests_touch_updated_at
before update on public.maintenance_requests for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Timeline (MAINT-5)
-- ---------------------------------------------------------------------------
create table public.maintenance_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  request_id uuid not null references public.maintenance_requests (id) on delete restrict,
  kind text not null check (
    kind in (
      'submitted',
      'status_change',
      'assignment',
      'comment',
      'cost',
      'approval',
      'tenant_response',
      'attachment'
    )
  ),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_label text,
  body text check (length(btrim(body)) between 1 and 4000),
  visible_to_tenant boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index maintenance_events_request_idx on public.maintenance_events (request_id, created_at);

create or replace function app.deny_maintenance_event_rewrite () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  raise exception 'a maintenance timeline event is never changed or removed'
    using errcode = '42501';
end;
$$;

create trigger maintenance_events_append_only
before update or delete on public.maintenance_events for each row
execute function app.deny_maintenance_event_rewrite ();

-- ---------------------------------------------------------------------------
-- Costs (MAINT-10, MAINT-11)
-- ---------------------------------------------------------------------------
create table public.maintenance_costs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  request_id uuid not null references public.maintenance_requests (id) on delete restrict,
  description text not null check (length(btrim(description)) between 2 and 300),
  amount_kobo bigint not null check (amount_kobo > 0),
  payer public.maintenance_payer not null,
  reason text not null check (length(btrim(reason)) between 3 and 1000),
  invoice_path text check (length(btrim(invoice_path)) between 1 and 500),
  receipt_path text check (length(btrim(receipt_path)) between 1 and 500),
  -- Snapshot of the rule as it stood when the cost was recorded. The approval
  -- trigger uses it so a later threshold change cannot retroactively authorise
  -- a job, or demand approval for one that was already below the line.
  requires_approval boolean not null default false,
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index maintenance_costs_request_idx on public.maintenance_costs (request_id, created_at);

-- ---------------------------------------------------------------------------
-- Approvals (MAINT-8, OWN-4)
-- ---------------------------------------------------------------------------
create table public.maintenance_approvals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  request_id uuid not null references public.maintenance_requests (id) on delete restrict,
  cost_id uuid not null references public.maintenance_costs (id) on delete restrict,
  amount_kobo bigint not null check (amount_kobo > 0),
  threshold_kobo bigint not null check (threshold_kobo >= 0),
  status public.maintenance_approval_status not null default 'pending',
  requested_by uuid references auth.users (id) on delete set null,
  requested_at timestamptz not null default now(),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  comment text check (length(btrim(comment)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint maintenance_approval_decided_recorded check (
    status = 'pending'
    or (
      decided_by is not null
      and decided_at is not null
    )
  ),
  constraint maintenance_approval_rejection_has_reason check (
    status <> 'rejected'
    or comment is not null
  )
);

create index maintenance_approvals_request_idx on public.maintenance_approvals (request_id, status);

create index maintenance_approvals_pending_idx on public.maintenance_approvals (organisation_id)
where
  status = 'pending';

create trigger maintenance_approvals_touch_updated_at
before update on public.maintenance_approvals for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Link validation
--
-- A request's unit must belong to its property, its lease must be for that
-- unit, and the tenant must be a party to that lease. Checked in the database
-- because the form can be stale and a function can be called directly.
-- ---------------------------------------------------------------------------
create or replace function app.validate_maintenance_request () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  property_org uuid;
  unit_property uuid;
  unit_org uuid;
  lease_unit uuid;
  lease_org uuid;
  party_tenant uuid;
begin
  select p.organisation_id into property_org
  from public.properties p
  where p.id = new.property_id;

  if property_org is distinct from new.organisation_id then
    raise exception 'the property does not belong to this organisation'
      using errcode = '23514';
  end if;

  if new.unit_id is not null then
    select u.property_id, u.organisation_id into unit_property, unit_org
    from public.units u
    where u.id = new.unit_id;

    if unit_property is distinct from new.property_id
       or unit_org is distinct from new.organisation_id then
      raise exception 'the unit does not belong to the request property'
        using errcode = '23514';
    end if;
  end if;

  if new.lease_id is not null then
    select l.unit_id, l.organisation_id into lease_unit, lease_org
    from public.leases l
    where l.id = new.lease_id;

    if lease_org is distinct from new.organisation_id
       or (new.unit_id is not null and lease_unit is distinct from new.unit_id) then
      raise exception 'the lease does not match the request unit'
        using errcode = '23514';
    end if;

    select lp.tenant_id into party_tenant
    from public.lease_parties lp
    where lp.lease_id = new.lease_id and lp.role = 'tenant'
    limit 1;

    if new.tenant_id is not null and party_tenant is distinct from new.tenant_id then
      raise exception 'the tenant is not a party to the lease'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger maintenance_requests_validate
before insert or update on public.maintenance_requests for each row
execute function app.validate_maintenance_request ();

-- ---------------------------------------------------------------------------
-- Reach helpers
-- ---------------------------------------------------------------------------
create or replace function app.can_reach_maintenance_request (target_request_id uuid) returns boolean language sql stable security definer
set
  search_path = '' as $$
  select exists (
    select 1
    from public.maintenance_requests mr
    join public.properties p on p.id = mr.property_id
    where mr.id = target_request_id
      and (
        (
          app.is_staff (mr.organisation_id)
          and app.can_reach_property (mr.organisation_id, p.id, p.landlord_id)
        )
        or p.landlord_id in (select app.current_landlord_ids ())
        or mr.tenant_id in (select app.current_tenant_ids ())
      )
  )
$$;

create or replace function app.is_maintenance_landlord (target_request_id uuid) returns boolean language sql stable security definer
set
  search_path = '' as $$
  select exists (
    select 1
    from public.maintenance_requests mr
    join public.properties p on p.id = mr.property_id
    where mr.id = target_request_id
      and p.landlord_id in (select app.current_landlord_ids ())
  )
$$;

grant
execute on function app.can_reach_maintenance_request (uuid) to authenticated;

grant
execute on function app.is_maintenance_landlord (uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.vendors enable row level security;

alter table public.maintenance_requests enable row level security;

alter table public.maintenance_events enable row level security;

alter table public.maintenance_costs enable row level security;

alter table public.maintenance_approvals enable row level security;

create policy vendors_select_staff on public.vendors for
select
  to authenticated using (
    organisation_id in (
      select
        app.current_organisation_ids ()
    )
    and app.is_staff (organisation_id)
  );

create policy vendors_write_staff on public.vendors for all to authenticated using (
  app.has_role (
    organisation_id,
    array[
      'owner',
      'admin',
      'property_manager',
      'caretaker',
      'maintenance_coordinator'
    ]::public.app_role[]
  )
)
with
  check (
    app.has_role (
      organisation_id,
      array[
        'owner',
        'admin',
        'property_manager',
        'caretaker',
        'maintenance_coordinator'
      ]::public.app_role[]
    )
  );

create policy maintenance_requests_select_reachable on public.maintenance_requests for
select
  to authenticated using (app.can_reach_maintenance_request (id));

create policy maintenance_requests_insert_staff on public.maintenance_requests for insert to authenticated
with
  check (
    app.has_role (
      organisation_id,
      array[
        'owner',
        'admin',
        'property_manager',
        'caretaker',
        'maintenance_coordinator'
      ]::public.app_role[]
    )
    and exists (
      select
        1
      from
        public.properties p
      where
        p.id = property_id
        and p.organisation_id = maintenance_requests.organisation_id
        and app.can_reach_property (p.organisation_id, p.id, p.landlord_id)
    )
  );

create policy maintenance_requests_update_staff on public.maintenance_requests
for update
  to authenticated using (
    app.has_role (
      organisation_id,
      array[
        'owner',
        'admin',
        'property_manager',
        'caretaker',
        'maintenance_coordinator'
      ]::public.app_role[]
    )
    and app.can_reach_maintenance_request (id)
  )
with
  check (
    app.has_role (
      organisation_id,
      array[
        'owner',
        'admin',
        'property_manager',
        'caretaker',
        'maintenance_coordinator'
      ]::public.app_role[]
    )
    and app.can_reach_maintenance_request (id)
  );

create policy maintenance_events_select_reachable on public.maintenance_events for
select
  to authenticated using (
    app.can_reach_maintenance_request (request_id)
    and (
      visible_to_tenant
      or app.is_staff (organisation_id)
      or app.is_maintenance_landlord (request_id)
    )
  );

create policy maintenance_costs_select_staff_landlord on public.maintenance_costs for
select
  to authenticated using (
    app.can_reach_maintenance_request (request_id)
    and (
      app.is_staff (organisation_id)
      or app.is_maintenance_landlord (request_id)
    )
  );

create policy maintenance_approvals_select_staff_landlord on public.maintenance_approvals for
select
  to authenticated using (
    app.can_reach_maintenance_request (request_id)
    and (
      app.is_staff (organisation_id)
      or app.is_maintenance_landlord (request_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Create a request (MAINT-1, MAINT-2, TENANT-4)
-- ---------------------------------------------------------------------------
create or replace function public.create_maintenance_request (
  p_property_id uuid,
  p_unit_id uuid default null,
  p_lease_id uuid default null,
  p_category public.maintenance_category default 'other',
  p_description text default '',
  p_urgency public.maintenance_urgency default 'normal',
  p_access_constraints text default null,
  p_preferred_access_times text default null,
  p_is_safety_issue boolean default false
) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  v_org uuid;
  v_landlord uuid;
  v_property uuid;
  v_unit uuid;
  v_lease_property uuid;
  v_lease_unit uuid;
  v_lease_status public.lease_status;
  v_tenant uuid;
  v_current_tenant uuid;
  v_is_staff boolean;
  v_submitted_by public.maintenance_submitted_by;
  v_request uuid;
begin
  if auth.uid () is null then
    raise exception 'sign in to report a repair' using errcode = '42501';
  end if;

  select p.organisation_id, p.landlord_id into v_org, v_landlord
  from public.properties p
  where p.id = p_property_id;

  if v_org is null then
    raise exception 'the property was not found' using errcode = '22023';
  end if;

  v_property := p_property_id;

  v_is_staff := app.is_staff (v_org)
    and app.can_reach_property (v_org, p_property_id, v_landlord);

  if v_is_staff then
    if not app.has_role (
      v_org,
      array[
        'owner',
        'admin',
        'property_manager',
        'caretaker',
        'maintenance_coordinator'
      ]::public.app_role[]
    ) then
      raise exception 'your role cannot create maintenance requests'
        using errcode = '42501';
    end if;
    v_submitted_by := 'staff';
    v_unit := p_unit_id;
    v_tenant := null;
  else
    -- A tenant's request is derived from the lease, not from parameters: the
    -- caller cannot point a repair at somebody else's unit.
    if p_lease_id is null then
      raise exception 'a tenancy is required to report a repair'
        using errcode = '22023';
    end if;

    select l.organisation_id, u.property_id, l.unit_id, l.status
    into v_org, v_lease_property, v_lease_unit, v_lease_status
    from public.leases l
    join public.units u on u.id = l.unit_id
    where l.id = p_lease_id;

    if v_org is null then
      raise exception 'the tenancy was not found' using errcode = '22023';
    end if;

    select t.id into v_current_tenant
    from public.tenants t
    where t.user_id = auth.uid () and t.organisation_id = v_org
    limit 1;

    if v_current_tenant is null then
      raise exception 'your account is not linked to a tenant record'
        using errcode = '42501';
    end if;

    select lp.tenant_id into v_tenant
    from public.lease_parties lp
    where lp.lease_id = p_lease_id and lp.role = 'tenant'
    limit 1;

    if v_tenant is distinct from v_current_tenant then
      raise exception 'that tenancy is not yours' using errcode = '42501';
    end if;

    if v_lease_status <> 'active' then
      raise exception 'only an active tenancy can report a repair'
        using errcode = '23514';
    end if;

    v_property := v_lease_property;
    v_unit := v_lease_unit;
    v_submitted_by := 'tenant';
  end if;

  if p_description is null or length(btrim(p_description)) < 5 then
    raise exception 'describe the repair in a few words' using errcode = '22023';
  end if;

  if v_unit is not null then
    if not exists (
      select 1 from public.units u
      where u.id = v_unit and u.property_id = v_property
    ) then
      raise exception 'the unit does not belong to the property'
        using errcode = '23514';
    end if;
  end if;

  insert into public.maintenance_requests (
    organisation_id, property_id, unit_id, lease_id, tenant_id,
    submitted_by, reported_by_user_id, category, description, urgency,
    is_safety_issue, access_constraints, preferred_access_times, created_by
  )
  values (
    v_org, v_property, v_unit, p_lease_id, v_tenant,
    v_submitted_by, auth.uid (), p_category, btrim(p_description), p_urgency,
    coalesce(p_is_safety_issue, false), nullif(btrim(p_access_constraints), ''),
    nullif(btrim(p_preferred_access_times), ''), auth.uid ()
  )
  returning id into v_request;

  insert into public.maintenance_events (
    organisation_id, request_id, kind, actor_user_id, actor_label, body, metadata
  )
  values (
    v_org,
    v_request,
    'submitted',
    auth.uid (),
    auth.email (),
    case when v_submitted_by = 'tenant' then 'Tenant submitted a repair request.'
         else 'Repair request logged by staff.' end,
    jsonb_build_object(
      'category', p_category,
      'urgency', p_urgency,
      'is_safety_issue', coalesce(p_is_safety_issue, false)
    )
  );

  return v_request;
end;
$$;

-- ---------------------------------------------------------------------------
-- Assignment (MAINT-4)
-- ---------------------------------------------------------------------------
create or replace function public.assign_maintenance_request (
  p_request_id uuid,
  p_assignee_user_id uuid default null,
  p_coordinator_user_id uuid default null,
  p_vendor_id uuid default null,
  p_priority public.maintenance_priority default 'normal',
  p_due_on date default null,
  p_note text default null
) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  v_request public.maintenance_requests;
  v_vendor_name text;
  v_assignee_label text;
begin
  select * into v_request
  from public.maintenance_requests
  where id = p_request_id;

  if v_request.id is null then
    raise exception 'the request was not found' using errcode = '22023';
  end if;

  if not app.has_role (
    v_request.organisation_id,
    array[
      'owner',
      'admin',
      'property_manager',
      'caretaker',
      'maintenance_coordinator'
    ]::public.app_role[]
  ) or not app.can_reach_maintenance_request (p_request_id) then
    raise exception 'your role cannot assign this request' using errcode = '42501';
  end if;

  if v_request.status in ('completed', 'rejected', 'closed') then
    raise exception 'a finished request cannot be reassigned'
      using errcode = '23514';
  end if;

  if p_assignee_user_id is not null and not exists (
    select 1 from public.memberships m
    where m.user_id = p_assignee_user_id
      and m.organisation_id = v_request.organisation_id
      and m.status = 'active'
      and m.role = any (
        array[
          'owner', 'admin', 'property_manager', 'letting_agent',
          'caretaker', 'maintenance_coordinator', 'accountant', 'screening_reviewer'
        ]::public.app_role[]
      )
  ) then
    raise exception 'the assignee is not active staff in this organisation'
      using errcode = '23514';
  end if;

  if p_coordinator_user_id is not null and not exists (
    select 1 from public.memberships m
    where m.user_id = p_coordinator_user_id
      and m.organisation_id = v_request.organisation_id
      and m.status = 'active'
      and m.role = any (
        array[
          'owner', 'admin', 'property_manager', 'letting_agent',
          'caretaker', 'maintenance_coordinator', 'accountant', 'screening_reviewer'
        ]::public.app_role[]
      )
  ) then
    raise exception 'the coordinator is not active staff in this organisation'
      using errcode = '23514';
  end if;

  if p_vendor_id is not null then
    select v.name into v_vendor_name
    from public.vendors v
    where v.id = p_vendor_id
      and v.organisation_id = v_request.organisation_id;

    if v_vendor_name is null then
      raise exception 'the vendor was not found in this organisation'
        using errcode = '23514';
    end if;
  end if;

  select coalesce(u.full_name, u.email, p_assignee_user_id::text) into v_assignee_label
  from public.users u
  where u.id = p_assignee_user_id;

  update public.maintenance_requests
  set
    assignee_user_id = p_assignee_user_id,
    coordinator_user_id = coalesce(p_coordinator_user_id, coordinator_user_id),
    vendor_id = p_vendor_id,
    priority = p_priority,
    due_on = p_due_on,
    acknowledged_at = coalesce(acknowledged_at, now ()),
    acknowledged_by = coalesce(acknowledged_by, auth.uid ()),
    assigned_at = coalesce(assigned_at, now ()),
    assigned_by = auth.uid (),
    status = case
      when status in ('submitted', 'acknowledged', 'assigned', 'on_hold') then 'assigned'
      else status
    end
  where id = p_request_id;

  insert into public.maintenance_events (
    organisation_id, request_id, kind, actor_user_id, actor_label, body, metadata
  )
  values (
    v_request.organisation_id,
    p_request_id,
    'assignment',
    auth.uid (),
    auth.email (),
    coalesce(
      nullif(btrim(p_note), ''),
      'Request assigned' ||
        case when v_assignee_label is null then '' else ' to ' || v_assignee_label end ||
        case when v_vendor_name is null then '' else ' (' || v_vendor_name || ')' end ||
        '.'
    ),
    jsonb_build_object(
      'assignee_user_id', p_assignee_user_id,
      'coordinator_user_id', p_coordinator_user_id,
      'vendor_id', p_vendor_id,
      'priority', p_priority,
      'due_on', p_due_on
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Status transitions (MAINT-3)
-- ---------------------------------------------------------------------------
create or replace function public.transition_maintenance_request (
  p_request_id uuid,
  p_status public.maintenance_status,
  p_note text default null
) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  v_request public.maintenance_requests;
  v_cost_total bigint;
  v_pending integer;
  v_rejected integer;
  v_allowed boolean;
begin
  select * into v_request
  from public.maintenance_requests
  where id = p_request_id;

  if v_request.id is null then
    raise exception 'the request was not found' using errcode = '22023';
  end if;

  if not app.has_role (
    v_request.organisation_id,
    array[
      'owner',
      'admin',
      'property_manager',
      'caretaker',
      'maintenance_coordinator'
    ]::public.app_role[]
  ) or not app.can_reach_maintenance_request (p_request_id) then
    raise exception 'your role cannot change this request' using errcode = '42501';
  end if;

  if p_status = v_request.status then
    raise exception 'the request is already %', p_status using errcode = '23514';
  end if;

  v_allowed := case v_request.status
    when 'submitted' then p_status in ('acknowledged', 'assigned', 'rejected')
    when 'acknowledged' then p_status in ('assigned', 'in_progress', 'on_hold', 'rejected')
    when 'assigned' then p_status in ('in_progress', 'on_hold', 'rejected')
    when 'in_progress' then p_status in ('on_hold', 'awaiting_approval', 'completed')
    when 'on_hold' then p_status in ('assigned', 'in_progress', 'rejected')
    when 'awaiting_approval' then p_status in ('in_progress', 'on_hold')
    when 'completed' then p_status in ('closed', 'in_progress')
    when 'rejected' then p_status in ('closed')
    else false
  end;

  if not v_allowed then
    raise exception 'a request cannot move from % to %', v_request.status, p_status
      using errcode = '23514';
  end if;

  if p_status = 'completed' then
    if v_request.status = 'awaiting_approval' then
      raise exception 'record an approval decision before completing the job'
        using errcode = '23514';
    end if;

    select coalesce(sum(c.amount_kobo), 0) into v_cost_total
    from public.maintenance_costs c
    where c.request_id = p_request_id;

    if v_cost_total = 0 and not v_request.no_cost then
      raise exception 'record the cost, or mark the job as no cost, before completing it'
        using errcode = '23514';
    end if;

    select count(*) into v_pending
    from public.maintenance_approvals a
    where a.request_id = p_request_id and a.status = 'pending';

    select count(*) into v_rejected
    from public.maintenance_approvals a
    where a.request_id = p_request_id and a.status = 'rejected';

    if v_pending > 0 then
      raise exception 'an approval is still pending' using errcode = '23514';
    end if;

    if v_rejected > 0 then
      raise exception 'a rejected cost must be resolved before completion'
        using errcode = '23514';
    end if;

    if p_note is null or length(btrim(p_note)) < 3 then
      raise exception 'record what was done before completing the job'
        using errcode = '22023';
    end if;
  end if;

  if p_status = 'rejected' and (p_note is null or length(btrim(p_note)) < 3) then
    raise exception 'give a reason for rejecting the request'
      using errcode = '22023';
  end if;

  update public.maintenance_requests
  set
    status = p_status,
    acknowledged_at = case when p_status = 'acknowledged'
      then coalesce(acknowledged_at, now ()) else acknowledged_at end,
    acknowledged_by = case when p_status = 'acknowledged'
      then coalesce(acknowledged_by, auth.uid ()) else acknowledged_by end,
    started_at = case when p_status = 'in_progress'
      then coalesce(started_at, now ()) else started_at end,
    on_hold_reason = case when p_status = 'on_hold'
      then nullif(btrim(p_note), '') else null end,
    completed_at = case when p_status = 'completed'
      then coalesce(completed_at, now ()) else completed_at end,
    completed_by = case when p_status = 'completed'
      then coalesce(completed_by, auth.uid ()) else completed_by end,
    completion_notes = case when p_status = 'completed'
      then btrim(p_note) else completion_notes end,
    rejected_at = case when p_status = 'rejected' then now () else rejected_at end,
    rejected_by = case when p_status = 'rejected' then auth.uid () else rejected_by end,
    rejection_reason = case when p_status = 'rejected'
      then btrim(p_note) else rejection_reason end,
    closed_at = case when p_status = 'closed' then now () else closed_at end
  where id = p_request_id;

  insert into public.maintenance_events (
    organisation_id, request_id, kind, actor_user_id, actor_label, body, metadata
  )
  values (
    v_request.organisation_id,
    p_request_id,
    'status_change',
    auth.uid (),
    auth.email (),
    coalesce(nullif(btrim(p_note), ''), 'Status changed to ' || replace(p_status::text, '_', ' ') || '.'),
    jsonb_build_object('from', v_request.status, 'to', p_status)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Comments (MAINT-5)
-- ---------------------------------------------------------------------------
create or replace function public.add_maintenance_comment (
  p_request_id uuid,
  p_body text,
  p_internal boolean default false
) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  v_request public.maintenance_requests;
  v_event uuid;
  v_internal boolean;
begin
  select * into v_request
  from public.maintenance_requests
  where id = p_request_id;

  if v_request.id is null or not app.can_reach_maintenance_request (p_request_id) then
    raise exception 'the request was not found' using errcode = '22023';
  end if;

  if p_body is null or length(btrim(p_body)) < 1 then
    raise exception 'write a comment first' using errcode = '22023';
  end if;

  v_internal := coalesce(p_internal, false)
    and app.is_staff (v_request.organisation_id);

  insert into public.maintenance_events (
    organisation_id, request_id, kind, actor_user_id, actor_label, body,
    visible_to_tenant, metadata
  )
  values (
    v_request.organisation_id,
    p_request_id,
    'comment',
    auth.uid (),
    auth.email (),
    btrim(p_body),
    not v_internal,
    jsonb_build_object('internal', v_internal)
  )
  returning id into v_event;

  return v_event;
end;
$$;

-- ---------------------------------------------------------------------------
-- Costs (MAINT-10, MAINT-11)
-- ---------------------------------------------------------------------------
create or replace function public.record_maintenance_cost (
  p_request_id uuid,
  p_description text,
  p_amount_kobo bigint,
  p_payer public.maintenance_payer,
  p_reason text,
  p_invoice_path text default null,
  p_no_cost boolean default false
) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  v_request public.maintenance_requests;
  v_threshold bigint;
  v_requires boolean;
  v_cost uuid;
begin
  select * into v_request
  from public.maintenance_requests
  where id = p_request_id;

  if v_request.id is null then
    raise exception 'the request was not found' using errcode = '22023';
  end if;

  if not app.has_role (
    v_request.organisation_id,
    array[
      'owner',
      'admin',
      'property_manager',
      'caretaker',
      'maintenance_coordinator'
    ]::public.app_role[]
  ) or not app.can_reach_maintenance_request (p_request_id) then
    raise exception 'your role cannot record costs' using errcode = '42501';
  end if;

  if v_request.status in ('completed', 'rejected', 'closed') then
    raise exception 'a finished request cannot take a new cost'
      using errcode = '23514';
  end if;

  if coalesce(p_no_cost, false) then
    update public.maintenance_requests
    set no_cost = true
    where id = p_request_id;

    insert into public.maintenance_events (
      organisation_id, request_id, kind, actor_user_id, actor_label, body, metadata
    )
    values (
      v_request.organisation_id,
      p_request_id,
      'cost',
      auth.uid (),
      auth.email (),
      'Confirmed there is no cost for this job.',
      jsonb_build_object('no_cost', true)
    );
    return null;
  end if;

  if p_amount_kobo is null or p_amount_kobo <= 0 then
    raise exception 'enter the amount spent' using errcode = '22023';
  end if;

  if p_description is null or length(btrim(p_description)) < 2
     or p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'describe the cost and why it is allocated to that payer'
      using errcode = '22023';
  end if;

  select maintenance_approval_threshold_kobo into v_threshold
  from public.organisations
  where id = v_request.organisation_id;

  v_requires := p_payer in ('landlord', 'agency', 'service_charge')
    and p_amount_kobo > v_threshold;

  insert into public.maintenance_costs (
    organisation_id, request_id, description, amount_kobo, payer, reason,
    invoice_path, requires_approval, recorded_by
  )
  values (
    v_request.organisation_id, p_request_id, btrim(p_description), p_amount_kobo,
    p_payer, btrim(p_reason), nullif(btrim(p_invoice_path), ''),
    v_requires, auth.uid ()
  )
  returning id into v_cost;

  insert into public.maintenance_events (
    organisation_id, request_id, kind, actor_user_id, actor_label, body, metadata
  )
  values (
    v_request.organisation_id,
    p_request_id,
    'cost',
    auth.uid (),
    auth.email (),
    'Cost recorded: ' || btrim(p_description) || ' (' || p_payer::text || ').',
    jsonb_build_object(
      'cost_id', v_cost,
      'amount_kobo', p_amount_kobo,
      'payer', p_payer,
      'requires_approval', v_requires
    )
  );

  if v_requires then
    insert into public.maintenance_approvals (
      organisation_id, request_id, cost_id, amount_kobo, threshold_kobo, requested_by
    )
    values (
      v_request.organisation_id, p_request_id, v_cost, p_amount_kobo, v_threshold,
      auth.uid ()
    );

    update public.maintenance_requests
    set status = 'awaiting_approval'
    where id = p_request_id;

    insert into public.maintenance_events (
      organisation_id, request_id, kind, actor_user_id, actor_label, body, metadata
    )
    values (
      v_request.organisation_id,
      p_request_id,
      'approval',
      auth.uid (),
      auth.email (),
      'Landlord approval requested for the repair cost.',
      jsonb_build_object('cost_id', v_cost, 'amount_kobo', p_amount_kobo, 'threshold_kobo', v_threshold)
    );
  end if;

  return v_cost;
end;
$$;

-- ---------------------------------------------------------------------------
-- Approval decision (MAINT-8, OWN-4)
-- ---------------------------------------------------------------------------
create or replace function public.decide_maintenance_approval (
  p_approval_id uuid,
  p_approved boolean,
  p_comment text default null
) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  v_approval public.maintenance_approvals;
  v_request public.maintenance_requests;
  v_landlord uuid;
  v_authorised boolean;
begin
  select * into v_approval
  from public.maintenance_approvals
  where id = p_approval_id;

  if v_approval.id is null then
    raise exception 'the approval was not found' using errcode = '22023';
  end if;

  if v_approval.status <> 'pending' then
    raise exception 'that approval has already been decided'
      using errcode = '23514';
  end if;

  select * into v_request
  from public.maintenance_requests
  where id = v_approval.request_id;

  select p.landlord_id into v_landlord
  from public.properties p
  where p.id = v_request.property_id;

  v_authorised := app.has_role (
    v_request.organisation_id,
    array['owner', 'admin', 'maintenance_coordinator']::public.app_role[]
  ) or v_landlord in (select app.current_landlord_ids ());

  if not v_authorised then
    raise exception 'your role cannot approve this repair' using errcode = '42501';
  end if;

  if not coalesce(p_approved, false)
     and (p_comment is null or length(btrim(p_comment)) < 3) then
    raise exception 'give a reason for rejecting the cost'
      using errcode = '22023';
  end if;

  update public.maintenance_approvals
  set
    status = case when p_approved then 'approved' else 'rejected' end::public.maintenance_approval_status,
    decided_by = auth.uid (),
    decided_at = now (),
    comment = nullif(btrim(p_comment), '')
  where id = p_approval_id;

  update public.maintenance_requests
  set
    status = case when p_approved then 'in_progress' else 'on_hold' end::public.maintenance_status,
    on_hold_reason = case when p_approved then null
      else coalesce(nullif(btrim(p_comment), ''), 'Cost rejected') end
  where id = v_request.id;

  insert into public.maintenance_events (
    organisation_id, request_id, kind, actor_user_id, actor_label, body, metadata
  )
  values (
    v_request.organisation_id,
    v_request.id,
    'approval',
    auth.uid (),
    auth.email (),
    case when p_approved then 'Repair cost approved.'
         else 'Repair cost rejected: ' || btrim(p_comment) end,
    jsonb_build_object(
      'approval_id', p_approval_id,
      'decision', case when p_approved then 'approved' else 'rejected' end,
      'comment', nullif(btrim(p_comment), '')
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Tenant response (MAINT-13)
-- ---------------------------------------------------------------------------
create or replace function public.confirm_maintenance_resolution (p_request_id uuid) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  v_request public.maintenance_requests;
begin
  select * into v_request
  from public.maintenance_requests
  where id = p_request_id;

  if v_request.id is null
     or v_request.tenant_id is null
     or v_request.tenant_id not in (select app.current_tenant_ids ()) then
    raise exception 'that request is not yours' using errcode = '42501';
  end if;

  if v_request.status <> 'completed' then
    raise exception 'the repair has not been marked complete yet'
      using errcode = '23514';
  end if;

  if v_request.tenant_confirmed_at is not null then
    raise exception 'you have already confirmed this repair'
      using errcode = '23514';
  end if;

  update public.maintenance_requests
  set tenant_confirmed_at = now ()
  where id = p_request_id;

  insert into public.maintenance_events (
    organisation_id, request_id, kind, actor_user_id, actor_label, body, metadata
  )
  values (
    v_request.organisation_id,
    p_request_id,
    'tenant_response',
    auth.uid (),
    auth.email (),
    'Tenant confirmed the repair is resolved.',
    jsonb_build_object('response', 'confirmed')
  );
end;
$$;

create or replace function public.reopen_maintenance_request (p_request_id uuid, p_reason text) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  v_request public.maintenance_requests;
begin
  select * into v_request
  from public.maintenance_requests
  where id = p_request_id;

  if v_request.id is null
     or v_request.tenant_id is null
     or v_request.tenant_id not in (select app.current_tenant_ids ()) then
    raise exception 'that request is not yours' using errcode = '42501';
  end if;

  if v_request.status not in ('completed', 'closed') then
    raise exception 'only a completed repair can be reopened'
      using errcode = '23514';
  end if;

  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'say what is still wrong' using errcode = '22023';
  end if;

  update public.maintenance_requests
  set
    status = 'in_progress',
    tenant_reopened_at = now (),
    reopen_count = reopen_count + 1,
    closed_at = null,
    tenant_confirmed_at = null
  where id = p_request_id;

  insert into public.maintenance_events (
    organisation_id, request_id, kind, actor_user_id, actor_label, body, metadata
  )
  values (
    v_request.organisation_id,
    p_request_id,
    'tenant_response',
    auth.uid (),
    auth.email (),
    'Tenant reopened the repair: ' || btrim(p_reason),
    jsonb_build_object('response', 'reopened', 'reason', btrim(p_reason))
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Audit (ORG-5 names maintenance approvals)
-- ---------------------------------------------------------------------------
create trigger maintenance_requests_audit
after insert or update or delete on public.maintenance_requests for each row
execute function app.audit_row_change ('maintenance_request');

create trigger maintenance_costs_audit
after insert or update or delete on public.maintenance_costs for each row
execute function app.audit_row_change ('maintenance_cost');

create trigger maintenance_approvals_audit
after insert or update or delete on public.maintenance_approvals for each row
execute function app.audit_row_change ('maintenance_approval');

create trigger vendors_audit
after insert or update or delete on public.vendors for each row
execute function app.audit_row_change ('vendor');

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant
select
  on public.vendors,
  public.maintenance_requests,
  public.maintenance_events,
  public.maintenance_costs,
  public.maintenance_approvals to authenticated;

grant insert,
update on public.vendors to authenticated;

revoke all on public.vendors,
public.maintenance_requests,
public.maintenance_events,
public.maintenance_costs,
public.maintenance_approvals
from
  anon;

revoke all on function public.create_maintenance_request (
  uuid,
  uuid,
  uuid,
  public.maintenance_category,
  text,
  public.maintenance_urgency,
  text,
  text,
  boolean
)
from
  public;

revoke all on function public.assign_maintenance_request (
  uuid,
  uuid,
  uuid,
  uuid,
  public.maintenance_priority,
  date,
  text
)
from
  public;

revoke all on function public.transition_maintenance_request (uuid, public.maintenance_status, text)
from
  public;

revoke all on function public.add_maintenance_comment (uuid, text, boolean)
from
  public;

revoke all on function public.record_maintenance_cost (
  uuid,
  text,
  bigint,
  public.maintenance_payer,
  text,
  text,
  boolean
)
from
  public;

revoke all on function public.decide_maintenance_approval (uuid, boolean, text)
from
  public;

revoke all on function public.confirm_maintenance_resolution (uuid)
from
  public;

revoke all on function public.reopen_maintenance_request (uuid, text)
from
  public;

grant
execute on function public.create_maintenance_request (
  uuid,
  uuid,
  uuid,
  public.maintenance_category,
  text,
  public.maintenance_urgency,
  text,
  text,
  boolean
) to authenticated;

grant
execute on function public.assign_maintenance_request (
  uuid,
  uuid,
  uuid,
  uuid,
  public.maintenance_priority,
  date,
  text
) to authenticated;

grant
execute on function public.transition_maintenance_request (uuid, public.maintenance_status, text) to authenticated;

grant
execute on function public.add_maintenance_comment (uuid, text, boolean) to authenticated;

grant
execute on function public.record_maintenance_cost (
  uuid,
  text,
  bigint,
  public.maintenance_payer,
  text,
  text,
  boolean
) to authenticated;

grant
execute on function public.decide_maintenance_approval (uuid, boolean, text) to authenticated;

grant
execute on function public.confirm_maintenance_resolution (uuid) to authenticated;

grant
execute on function public.reopen_maintenance_request (uuid, text) to authenticated;
