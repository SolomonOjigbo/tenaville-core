-- R1 step 1: organisation, users, roles, assignments, sessions, audit, subscription shell.
--
-- Requirements: ORG-1, ORG-2, ORG-3, ORG-4, ORG-5, ORG-8, ORG-9, BILL-1..BILL-4.
-- Decisions:    docs/decisions/0002-supabase-postgres-rls.md
--               docs/decisions/0008-identity-and-membership-model.md
--
-- Every organisation-scoped table in this file carries organisation_id, has RLS
-- enabled, and has at least one policy. A pgTAP test enumerates the schema and
-- fails if that ever stops being true (ORG-8).
create schema if not exists app;

comment on schema app is 'Internal helper functions for access control. Not a public API.';

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type public.organisation_type as enum('agency', 'individual_landlord');

-- ORG-3. Owner and admin are distinct: an owner cannot be removed by an admin.
create type public.app_role as enum(
  'owner',
  'admin',
  'property_manager',
  'letting_agent',
  'caretaker',
  'maintenance_coordinator',
  'accountant',
  'screening_reviewer',
  'landlord',
  'tenant'
);

create type public.membership_status as enum('invited', 'active', 'suspended');

-- Scope for property/portfolio-level access (ORG-4). scope_id has no foreign key
-- because the targets (properties, landlords) arrive in R1 step 2; the check
-- constraint below keeps the pairing honest in the meantime.
create type public.assignment_scope as enum('organisation', 'branch', 'property', 'landlord');

create type public.subscription_status as enum(
  'trialing',
  'active',
  'past_due',
  'grace',
  'suspended',
  'cancelled'
);

create type public.billing_period as enum('monthly', 'annual');

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function app.touch_updated_at () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Organisations (ORG-1)
-- ---------------------------------------------------------------------------
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  type public.organisation_type not null,
  -- Nigeria-first, but stored rather than assumed (PRD §12 Localisation).
  country_code text not null default 'NG' check (country_code ~ '^[A-Z]{2}$'),
  timezone text not null default 'Africa/Lagos',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create trigger organisations_touch_updated_at
before update on public.organisations for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Branches (ORG-6, R2)
--
-- The table exists now so that policies and foreign keys are shaped for a
-- second scoping dimension below organisation. Shipping branch *features* is
-- R2; retrofitting branch_id into every policy later is the cost this avoids.
-- ---------------------------------------------------------------------------
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 200),
  -- Receipt numbering is per organisation, or per branch where configured
  -- (RENT-13). The prefix lives here so R1 step 4 can read it.
  receipt_prefix text check (receipt_prefix ~ '^[A-Z0-9-]{1,12}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (organisation_id, name)
);

create index branches_organisation_id_idx on public.branches (organisation_id);

create trigger branches_touch_updated_at
before update on public.branches for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Users
--
-- A profile mirror of auth.users. Not organisation-scoped: one person has one
-- identity and may hold memberships in more than one organisation (a landlord
-- whose properties are managed by two agencies). See ADR 0008.
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (length(btrim(full_name)) between 1 and 200),
  -- Nigerian numbers in E.164. Validation of local formats happens at the edge
  -- in @tenaville/validation; the database stores the normalised form.
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (position('@' in email) > 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create trigger users_touch_updated_at
before update on public.users for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Memberships (ORG-2 invitations, ORG-3 roles)
-- ---------------------------------------------------------------------------
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  status public.membership_status not null default 'invited',
  branch_id uuid references public.branches (id) on delete set null,
  invited_by uuid references auth.users (id) on delete set null,
  invited_at timestamptz,
  accepted_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (organisation_id, user_id),
  -- A branch must belong to the same organisation as the membership. Enforced
  -- by trigger below, since a composite foreign key would need a redundant
  -- unique index on branches (id, organisation_id).
  constraint memberships_accepted_requires_active check (
    status <> 'active'
    or accepted_at is not null
  )
);

create index memberships_user_id_idx on public.memberships (user_id);

create index memberships_organisation_id_idx on public.memberships (organisation_id);

-- Supports the access-control lookups below, which run on every policy check.
create index memberships_user_active_idx on public.memberships (user_id, organisation_id)
where
  status = 'active';

create trigger memberships_touch_updated_at
before update on public.memberships for each row
execute function app.touch_updated_at ();

create or replace function app.assert_branch_in_organisation () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if new.branch_id is not null then
    if not exists (
      select 1 from public.branches b
      where b.id = new.branch_id and b.organisation_id = new.organisation_id
    ) then
      raise exception 'branch % does not belong to organisation %',
        new.branch_id, new.organisation_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger memberships_branch_same_organisation
before insert or update on public.memberships for each row
execute function app.assert_branch_in_organisation ();

-- ---------------------------------------------------------------------------
-- Access-control helpers
--
-- security definer so that policies on memberships do not recurse into
-- themselves: the function runs as owner, for whom RLS does not apply.
-- search_path is pinned to '' and every reference is schema-qualified, so a
-- caller cannot shadow a table with a temporary one.
-- ---------------------------------------------------------------------------
create or replace function app.current_organisation_ids () returns setof uuid language sql stable security definer
set
  search_path = '' as $$
  select m.organisation_id
  from public.memberships m
  where m.user_id = auth.uid()
    and m.status = 'active'
$$;

comment on function app.current_organisation_ids is 'Organisations the calling user actively belongs to. The isolation boundary for every policy (ORG-8).';

create or replace function app.is_member (target_organisation_id uuid) returns boolean language sql stable security definer
set
  search_path = '' as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.organisation_id = target_organisation_id
      and m.status = 'active'
  )
$$;

create or replace function app.has_role (
  target_organisation_id uuid,
  allowed public.app_role[]
) returns boolean language sql stable security definer
set
  search_path = '' as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.organisation_id = target_organisation_id
      and m.status = 'active'
      and m.role = any (allowed)
  )
$$;

comment on function app.has_role is 'Role check within one organisation. Answers "may this role act", never "which organisation" — that is current_organisation_ids (ORG-4).';

-- Staff who administer the organisation. Deliberately narrow: landlord and
-- tenant roles are members of the organisation but are not staff.
create or replace function app.is_org_admin (target_organisation_id uuid) returns boolean language sql stable security definer
set
  search_path = '' as $$
  select app.has_role(target_organisation_id, array['owner', 'admin']::public.app_role[])
$$;

create or replace function app.is_staff (target_organisation_id uuid) returns boolean language sql stable security definer
set
  search_path = '' as $$
  select app.has_role(
    target_organisation_id,
    array[
      'owner', 'admin', 'property_manager', 'letting_agent', 'caretaker',
      'maintenance_coordinator', 'accountant', 'screening_reviewer'
    ]::public.app_role[]
  )
$$;

-- ---------------------------------------------------------------------------
-- Assignments (ORG-4)
--
-- Organisation membership is not authority. A property manager sees the
-- properties assigned to them, not the whole portfolio. scope_id is
-- intentionally unconstrained by a foreign key: properties and landlords
-- arrive in R1 step 2.
-- ---------------------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  scope_type public.assignment_scope not null,
  scope_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Organisation-wide assignment carries no target; every other scope needs one.
  constraint assignments_scope_id_matches_type check (
    (
      scope_type = 'organisation'
      and scope_id is null
    )
    or (
      scope_type <> 'organisation'
      and scope_id is not null
    )
  )
);

-- Partial unique indexes rather than one constraint, because scope_id is
-- nullable and null is not equal to null in a unique constraint.
create unique index assignments_unique_scoped_idx on public.assignments (organisation_id, user_id, scope_type, scope_id)
where
  scope_id is not null;

create unique index assignments_unique_organisation_idx on public.assignments (organisation_id, user_id, scope_type)
where
  scope_id is null;

create index assignments_user_idx on public.assignments (user_id, organisation_id);

create index assignments_scope_idx on public.assignments (scope_type, scope_id);

-- ---------------------------------------------------------------------------
-- Device sessions (ORG-9, MOB-6)
--
-- Supabase Auth owns the session itself. This table is the device list the user
-- sees, and the record of a revocation — revoking must also wipe the mobile
-- app's local cache, so the app needs to be able to observe it.
-- ---------------------------------------------------------------------------
create table public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Null until the user has selected an organisation to work in.
  organisation_id uuid references public.organisations (id) on delete cascade,
  device_label text check (length(btrim(device_label)) between 1 and 120),
  platform text not null check (platform in ('web', 'ios', 'android')),
  app_version text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint device_sessions_revoked_by_requires_revoked_at check (
    revoked_by is null
    or revoked_at is not null
  )
);

create index device_sessions_user_idx on public.device_sessions (user_id);

create index device_sessions_active_idx on public.device_sessions (user_id, last_seen_at desc)
where
  revoked_at is null;

-- ---------------------------------------------------------------------------
-- Audit events (ORG-5, PRD §10.7)
--
-- Append-only. The whole value of an audit trail is that it cannot be tidied
-- up after the fact, so update and delete are blocked in the database rather
-- than merely avoided in application code.
--
-- actor_label preserves who acted even if the user record is later removed:
-- "deleted user" in a dispute is not an answer.
-- ---------------------------------------------------------------------------
create table public.audit_events (
  id bigint generated always as identity primary key,
  -- Null only for events that precede an organisation (signup itself).
  organisation_id uuid references public.organisations (id) on delete restrict,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_label text,
  -- Dotted action key, e.g. 'membership.role_changed', 'payment.reversed'.
  action text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  entity_type text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  -- Required for sensitive overrides (PRD §10.7). Which actions require one is
  -- enforced in the domain layer, where the catalogue of actions lives.
  reason text,
  request_id text,
  ip inet,
  user_agent text,
  occurred_at timestamptz not null default now()
);

create index audit_events_organisation_occurred_idx on public.audit_events (organisation_id, occurred_at desc);

create index audit_events_entity_idx on public.audit_events (entity_type, entity_id);

create index audit_events_actor_idx on public.audit_events (actor_user_id, occurred_at desc);

create or replace function app.deny_mutation () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  raise exception
    '% on % is not permitted: this table is append-only',
    tg_op, tg_table_name
    using hint = 'Record a correcting entry instead (PRD §10.2, §10.7).';
end;
$$;

create trigger audit_events_append_only
before update or delete on public.audit_events for each row
execute function app.deny_mutation ();

-- ---------------------------------------------------------------------------
-- Plans and subscriptions (BILL-1..BILL-4)
--
-- Priced by units under management, in naira. Amounts are integer kobo
-- (PRD §10.1) — ₦25,000.00 is 2_500_000.
-- ---------------------------------------------------------------------------
create table public.plans (
  -- Stable string key so a plan can be referenced in config and copy.
  id text primary key check (id ~ '^[a-z0-9_]{2,32}$'),
  name text not null,
  description text,
  -- Null means unlimited. Plan limits drive upgrade prompts (BILL-3).
  unit_limit integer check (
    unit_limit is null
    or unit_limit > 0
  ),
  price_kobo bigint not null check (price_kobo >= 0),
  billing_period public.billing_period not null,
  trial_days integer not null default 0 check (trial_days >= 0),
  -- Private plans exist for pilot agencies on negotiated terms.
  is_public boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

comment on column public.plans.price_kobo is 'Integer kobo, never a float or a decimal (PRD §10.1).';

create trigger plans_touch_updated_at
before update on public.plans for each row
execute function app.touch_updated_at ();

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null unique references public.organisations (id) on delete cascade,
  plan_id text not null references public.plans (id) on delete restrict,
  status public.subscription_status not null default 'trialing',
  -- Calendar dates, not timestamps: a billing period boundary must not shift
  -- with the reader's timezone (PRD §10.6).
  trial_ends_on date,
  current_period_start date,
  current_period_end date,
  -- BILL-3: restrictions apply only after a grace period.
  grace_ends_on date,
  -- Snapshot of the limit at purchase, so a plan price change does not silently
  -- re-scope an existing subscription.
  units_included integer check (
    units_included is null
    or units_included > 0
  ),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint subscriptions_period_ordered check (
    current_period_start is null
    or current_period_end is null
    or current_period_end >= current_period_start
  ),
  constraint subscriptions_trialing_requires_trial_end check (
    status <> 'trialing'
    or trial_ends_on is not null
  )
);

create index subscriptions_status_idx on public.subscriptions (status);

create trigger subscriptions_touch_updated_at
before update on public.subscriptions for each row
execute function app.touch_updated_at ();

-- BILL-4: an unpaid subscription never deletes customer data. Nothing in this
-- schema cascades from subscription state to operational records, and this
-- comment is here so a future "cleanup" migration has to argue with it.
comment on table public.subscriptions is 'Subscription state only. Never a trigger for deleting customer data (BILL-4).';

-- ===========================================================================
-- Row-level security (ORG-8, ORG-4, PRD §10.8)
--
-- RLS is enabled on every table below, including the ones that are not
-- organisation-scoped. A table with RLS enabled and no policy denies
-- everything; a table without RLS enabled denies nothing — so the default is
-- always "enabled", and access is granted deliberately.
--
-- Policies answer "which organisation" via app.current_organisation_ids().
-- Role authority is a second, separate question (app.has_role).
-- ===========================================================================
alter table public.organisations enable row level security;

alter table public.branches enable row level security;

alter table public.users enable row level security;

alter table public.memberships enable row level security;

alter table public.assignments enable row level security;

alter table public.device_sessions enable row level security;

alter table public.audit_events enable row level security;

alter table public.plans enable row level security;

alter table public.subscriptions enable row level security;

-- --- organisations ---------------------------------------------------------
-- Members read their own organisation. Creation goes through a signup function
-- (below), because a user has no membership at the moment they sign up and so
-- could not satisfy any insert policy.
create policy organisations_select_members on public.organisations for
select
  to authenticated using (
    id in (
      select
        app.current_organisation_ids ()
    )
  );

create policy organisations_update_admins on public.organisations
for update
  to authenticated using (app.is_org_admin (id))
with
  check (app.is_org_admin (id));

-- No delete policy: an organisation is never deleted through the API (BILL-4).
-- --- branches --------------------------------------------------------------
create policy branches_select_members on public.branches for
select
  to authenticated using (
    organisation_id in (
      select
        app.current_organisation_ids ()
    )
  );

create policy branches_write_admins on public.branches for all to authenticated using (app.is_org_admin (organisation_id))
with
  check (app.is_org_admin (organisation_id));

-- --- users -----------------------------------------------------------------
-- A user always reads their own profile. Beyond that, staff may read the
-- profiles of people who share an organisation with them — a tenant must not
-- be able to enumerate an agency's staff or other tenants.
create policy users_select_self on public.users for
select
  to authenticated using (id = auth.uid ());

create policy users_select_shared_organisation on public.users for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.memberships m
      where
        m.user_id = public.users.id
        and m.organisation_id in (
          select
            app.current_organisation_ids ()
        )
        and app.is_staff (m.organisation_id)
    )
  );

create policy users_update_self on public.users
for update
  to authenticated using (id = auth.uid ())
with
  check (id = auth.uid ());

-- --- memberships -----------------------------------------------------------
-- A user sees their own memberships. Staff see the memberships of their
-- organisation. Only admins change them, and a role change is audited.
create policy memberships_select_self on public.memberships for
select
  to authenticated using (user_id = auth.uid ());

create policy memberships_select_staff on public.memberships for
select
  to authenticated using (
    organisation_id in (
      select
        app.current_organisation_ids ()
    )
    and app.is_staff (organisation_id)
  );

create policy memberships_write_admins on public.memberships for all to authenticated using (app.is_org_admin (organisation_id))
with
  check (app.is_org_admin (organisation_id));

-- --- assignments -----------------------------------------------------------
create policy assignments_select_self on public.assignments for
select
  to authenticated using (user_id = auth.uid ());

create policy assignments_select_staff on public.assignments for
select
  to authenticated using (
    organisation_id in (
      select
        app.current_organisation_ids ()
    )
    and app.is_staff (organisation_id)
  );

create policy assignments_write_admins on public.assignments for all to authenticated using (app.is_org_admin (organisation_id))
with
  check (app.is_org_admin (organisation_id));

-- --- device_sessions -------------------------------------------------------
-- Strictly the user's own devices (ORG-9). An admin cannot browse another
-- user's devices: that is surveillance, not administration. Revoking another
-- user's access is done by suspending their membership.
create policy device_sessions_select_self on public.device_sessions for
select
  to authenticated using (user_id = auth.uid ());

create policy device_sessions_insert_self on public.device_sessions for insert to authenticated
with
  check (user_id = auth.uid ());

create policy device_sessions_update_self on public.device_sessions
for update
  to authenticated using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

-- --- audit_events ----------------------------------------------------------
-- Readable by organisation admins and accountants, who are the roles that
-- answer financial and permission questions. Writes come from the server
-- (service role) so that an audit entry cannot be forged by a client, and the
-- table is append-only regardless (trigger above).
create policy audit_events_select_admins on public.audit_events for
select
  to authenticated using (
    organisation_id is not null
    and app.has_role (
      organisation_id,
      array['owner', 'admin', 'accountant']::public.app_role[]
    )
  );

-- --- plans -----------------------------------------------------------------
-- Global reference data, not organisation-scoped. Public plans are readable by
-- any signed-in user so the upgrade screen can render them (BILL-3).
create policy plans_select_public on public.plans for
select
  to authenticated using (is_public);

-- --- subscriptions ---------------------------------------------------------
-- Readable by the organisation's admins and accountant. Changed only by the
-- server, in response to a verified billing provider event.
create policy subscriptions_select_admins on public.subscriptions for
select
  to authenticated using (
    app.has_role (
      organisation_id,
      array['owner', 'admin', 'accountant']::public.app_role[]
    )
  );

-- ===========================================================================
-- Signup (ORG-1)
--
-- At the instant of signup the user belongs to nothing, so no insert policy on
-- organisations can admit them. This function is the one sanctioned way in:
-- it creates the organisation, the owner membership and the trial subscription
-- in a single transaction, and audits the result.
--
-- security definer, with every reference schema-qualified and search_path
-- pinned. It derives the user from auth.uid() and never from an argument, so a
-- caller cannot create an organisation owned by somebody else.
-- ===========================================================================
create or replace function public.create_organisation_with_owner (
  organisation_name text,
  organisation_type public.organisation_type default 'agency',
  owner_full_name text default null
) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  acting_user uuid := auth.uid();
  new_organisation_id uuid;
  trial_plan public.plans;
begin
  if acting_user is null then
    raise exception 'not authenticated'
      using errcode = '42501';
  end if;

  if organisation_name is null or length(btrim(organisation_name)) = 0 then
    raise exception 'organisation_name is required'
      using errcode = '22023';
  end if;

  insert into public.organisations (name, type)
  values (btrim(organisation_name), organisation_type)
  returning id into new_organisation_id;

  -- The profile may already exist if the person was invited elsewhere first.
  insert into public.users (id, full_name, email)
  values (
    acting_user,
    nullif(btrim(coalesce(owner_full_name, '')), ''),
    auth.email()
  )
  on conflict (id) do update
    set full_name = coalesce(public.users.full_name, excluded.full_name),
        email     = coalesce(excluded.email, public.users.email);

  insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
  values (new_organisation_id, acting_user, 'owner', 'active', now());

  -- Organisation-wide assignment: the owner is not scoped to a subset (ORG-4).
  insert into public.assignments (organisation_id, user_id, scope_type, created_by)
  values (new_organisation_id, acting_user, 'organisation', acting_user);

  -- Start the trial if one is configured. A missing trial plan must not block
  -- signup — it is a billing configuration problem, not a user's problem.
  select * into trial_plan
  from public.plans
  where id = 'trial'
  limit 1;

  if trial_plan.id is not null then
    insert into public.subscriptions (
      organisation_id, plan_id, status, trial_ends_on, units_included
    )
    values (
      new_organisation_id,
      trial_plan.id,
      'trialing',
      (current_date + make_interval(days => trial_plan.trial_days))::date,
      trial_plan.unit_limit
    );
  end if;

  insert into public.audit_events (
    organisation_id, actor_user_id, actor_label, action, entity_type, entity_id, after
  )
  values (
    new_organisation_id,
    acting_user,
    auth.email(),
    'organisation.created',
    'organisation',
    new_organisation_id::text,
    jsonb_build_object('name', btrim(organisation_name), 'type', organisation_type)
  );

  return new_organisation_id;
end;
$$;

comment on function public.create_organisation_with_owner is 'ORG-1. The only sanctioned way to create an organisation. Derives the owner from auth.uid(), never from an argument.';

-- ===========================================================================
-- Permission-change audit (ORG-5)
--
-- Role and status changes are recorded by the database, so a change made
-- through any path is captured rather than only the ones that remembered to
-- write an audit entry.
-- ===========================================================================
create or replace function app.audit_membership_change () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  changed_action text;
begin
  if tg_op = 'INSERT' then
    changed_action := 'membership.created';
  elsif tg_op = 'DELETE' then
    changed_action := 'membership.removed';
  elsif old.role <> new.role then
    changed_action := 'membership.role_changed';
  elsif old.status <> new.status then
    changed_action := 'membership.status_changed';
  else
    -- Nothing security-relevant changed; do not write noise into the trail.
    return coalesce(new, old);
  end if;

  insert into public.audit_events (
    organisation_id, actor_user_id, actor_label, action, entity_type, entity_id, before, after, reason
  )
  values (
    coalesce(new.organisation_id, old.organisation_id),
    auth.uid(),
    auth.email(),
    changed_action,
    'membership',
    coalesce(new.id, old.id)::text,
    case when tg_op = 'INSERT' then null
         else jsonb_build_object('role', old.role, 'status', old.status) end,
    case when tg_op = 'DELETE' then null
         else jsonb_build_object('role', new.role, 'status', new.status) end,
    -- Set for this transaction by the caller (see change_membership_role).
    -- A change made by any other path still gets an audit row, with no reason,
    -- which is itself a useful signal when reviewing the trail.
    nullif(btrim(coalesce(current_setting('app.audit_reason', true), '')), '')
  );

  return coalesce(new, old);
end;
$$;

create trigger memberships_audit
after insert or update or delete on public.memberships for each row
execute function app.audit_membership_change ();

-- ===========================================================================
-- Grants
--
-- RLS filters rows; grants decide whether the role may touch the table at all.
-- Both are required. These are deliberately explicit rather than relying on
-- default privileges, so that reading this file tells you the whole story.
-- ===========================================================================
grant usage on schema public to anon,
authenticated,
service_role;

grant usage on schema app to authenticated,
service_role;

-- anon gets nothing: there is no unauthenticated read surface (PROP-9).
grant
select
  on public.plans to authenticated;

grant
select
  on public.organisations,
  public.branches,
  public.users,
  public.memberships,
  public.assignments,
  public.subscriptions,
  public.audit_events to authenticated;

grant insert,
update on public.users to authenticated;

grant insert,
update,
delete on public.memberships to authenticated;

grant insert,
update,
delete on public.assignments to authenticated;

grant insert,
update,
delete on public.branches to authenticated;

grant
update on public.organisations to authenticated;

grant
select
,
  insert,
update on public.device_sessions to authenticated;

-- Audit rows are written by the server, never by a client: a forged audit
-- entry is worse than a missing one. The append-only trigger applies to every
-- role regardless.
grant insert on public.audit_events to service_role;

grant
execute on function public.create_organisation_with_owner (text, public.organisation_type, text) to authenticated;

grant
execute on function app.current_organisation_ids () to authenticated;

grant
execute on function app.is_member (uuid) to authenticated;

grant
execute on function app.has_role (uuid, public.app_role[]) to authenticated;

grant
execute on function app.is_org_admin (uuid) to authenticated;

grant
execute on function app.is_staff (uuid) to authenticated;

-- The Supabase Postgres image sets default privileges that grant new tables in
-- public to anon. Tables created above therefore picked up anon grants without
-- anyone asking for them. RLS still blocks the rows — every policy above is
-- `to authenticated` — but an unauthenticated role holding table grants
-- contradicts PROP-9, and relying on RLS as the only barrier is exactly the
-- single point of failure ADR 0002 warns about.
--
-- Revoke what was granted, and stop it happening to tables added later.
revoke all on all tables in schema public
from
  anon;

revoke all on all sequences in schema public
from
  anon;

revoke all on all functions in schema public
from
  anon;

alter default privileges in schema public
revoke all on tables
from
  anon;

alter default privileges in schema public
revoke all on sequences
from
  anon;

alter default privileges in schema public
revoke all on functions
from
  anon;

-- A pgTAP test asserts this stays true (supabase/tests/0010_rls_coverage_test.sql).
-- ---------------------------------------------------------------------------
-- Changing a member's role (ORG-3, ORG-4, ORG-5)
--
-- A role change needs the update and its audit reason in one transaction. The
-- trigger above writes the audit row but cannot see a reason, so the caller
-- supplies one here as a transaction-local setting.
--
-- Deliberately *not* security definer: running as the caller means the
-- memberships policy decides whether they may write at all, so this function
-- cannot become a way around RLS. It adds the one rule a policy cannot
-- express — only an owner may create another owner.
-- ---------------------------------------------------------------------------
create or replace function public.change_membership_role (
  target_membership_id uuid,
  new_role public.app_role,
  change_reason text
) returns void language plpgsql
set
  search_path = '' as $$
declare
  target public.memberships;
  actor_role public.app_role;
begin
  if change_reason is null or length(btrim(change_reason)) < 3 then
    raise exception 'a reason is required to change a role'
      using errcode = '22023';
  end if;

  -- Subject to RLS: a caller who cannot see the membership gets no row, and
  -- the error below does not reveal whether it exists.
  select * into target
  from public.memberships
  where id = target_membership_id;

  if target.id is null then
    raise exception 'membership not found'
      using errcode = 'P0002';
  end if;

  select m.role into actor_role
  from public.memberships m
  where m.organisation_id = target.organisation_id
    and m.user_id = auth.uid()
    and m.status = 'active';

  if actor_role is null then
    raise exception 'membership not found'
      using errcode = 'P0002';
  end if;

  if new_role = 'owner' and actor_role <> 'owner' then
    raise exception 'only an owner may assign the owner role'
      using errcode = '42501';
  end if;

  if target.role = 'owner' and actor_role <> 'owner' then
    raise exception 'only an owner may change an owner''s role'
      using errcode = '42501';
  end if;

  perform set_config('app.audit_reason', btrim(change_reason), true);

  update public.memberships
  set role = new_role
  where id = target_membership_id;

  if not found then
    -- RLS filtered the update even though the row was readable: the caller may
    -- see the membership but not change it.
    raise exception 'not permitted to change this role'
      using errcode = '42501';
  end if;
end;
$$;

grant
execute on function public.change_membership_role (uuid, public.app_role, text) to authenticated;
