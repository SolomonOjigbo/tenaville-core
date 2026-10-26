-- TV-147: plan limits and feature flags, enforced where it counts (BILL-3).
--
-- The pricing decision gave every plan its limits and a feature matrix, and
-- the previous migration stored them. Nothing read them. An organisation on
-- the Free plan could add a hundred properties, and the only thing standing
-- between a free account and an agency's whole landlord ledger was that the
-- screens had not been built yet.
--
-- Two principles shape this, both from the decision document:
--
--   *Limits come from the plans table, not from code.* Every number below is
--   read from `plans` at the moment of the write. A price change or a new plan
--   is an insert, never a deploy. The one thing code decides is what a limit
--   *means*, and even that is data: a limit with a per-unit overage price is
--   billable beyond the band, a limit without one is a wall. That is why the
--   Free plan has null overage columns and the paid plans do not.
--
--   *Limit scale, not safety.* Two-factor authentication, audit records and
--   full export are never gated, so nothing here touches them. Over-limit data
--   is never deleted either: these checks refuse to create the hundred-and-first
--   unit, they never remove the hundredth.
--
-- Enforced in the database rather than in a route handler, for the usual
-- reason — the mobile app, an import, a direct SQL fix and a route handler all
-- write through the same connection, and only one of them goes through
-- TypeScript. A check in the API alone is a check an import can walk past.
--
-- What is NOT here, deliberately:
--   - 80% and 100% warnings. That is TV-148, which also decides what "active"
--     means at a period boundary. This migration refuses the write; it does
--     not nag before it.
--   - Billing the overage. TV-153. These checks *allow* a billable overage;
--     turning it into money is a different ticket.
--   - Read-only locking on downgrade. TV-152, and it is the harder half: a
--     locked property must stay printable and exportable.
--   - Storage. `plans.storage_mb` has no counterpart to count: TV-014 stores
--     objects and records access, but nothing registers a document's size.
--     Enforcing it needs that registry, which arrives with documents (TV-052).
-- ---------------------------------------------------------------------------
-- The feature catalogue
--
-- A table rather than boolean columns on `plans`, because a feature is a row:
-- adding one is an insert, and the set a plan grants is a join rather than a
-- widening migration. The catalogue exists so that a mistyped key fails loudly
-- — `plan_allows(org, 'ledger_statments')` raises rather than quietly denying
-- access, which is the failure mode nobody notices until a customer does.
-- ---------------------------------------------------------------------------
create table public.features (
  key text primary key check (key ~ '^[a-z0-9_]{3,48}$'),
  label text not null check (length(btrim(label)) between 1 and 80),
  -- What an upgrade prompt says. Written here so the same words appear
  -- wherever the gate bites, rather than once per screen.
  description text not null check (length(btrim(description)) between 1 and 400),
  -- False while the feature's own ticket is unbuilt. The gate still answers,
  -- so a module can ask the question before it ships the behaviour.
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.features is 'BILL-3. The catalogue of gateable features, from the feature matrix in docs/requirements/sprint-4-decisions-and-pricing.md §3.5.';

insert into
  public.features (key, label, description, is_available)
values
  (
    'multi_landlord_ledger',
    'Multiple landlords',
    'Manage property for more than one landlord, with mandates and commission. Available on Agent and above.',
    true
  ),
  (
    'landlord_statements',
    'Landlord statements and remittances',
    'Produce landlord statements and record remittances. Available on Agent and above.',
    false
  ),
  (
    'landlord_portal',
    'Landlord portal',
    'Give each landlord a read-only view of their own properties. Available on Agent and above.',
    false
  ),
  (
    'automated_messaging',
    'Automated reminders',
    'Send rent reminders and receipts automatically by WhatsApp, SMS or email. The free plan shares them by hand instead, which costs nothing to send. Available on Landlord and above.',
    false
  ),
  (
    'repair_cost_allocation',
    'Charging repair costs',
    'Record what a repair cost and charge it to the landlord, the tenant or the agency. Available on Landlord and above.',
    false
  ),
  (
    'agency_branded_documents',
    'Your branding on documents',
    'Receipts and statements carry your agency''s name instead of the Tenaville line. Available on Landlord and above.',
    false
  ),
  (
    'full_reports',
    'The full report set',
    'Every operational report, not the four the free plan includes. Available on Landlord and above.',
    false
  );

-- ---------------------------------------------------------------------------
-- Which plan grants which feature
-- ---------------------------------------------------------------------------
create table public.plan_features (
  plan_id text not null references public.plans (id) on delete cascade,
  feature_key text not null references public.features (key) on delete restrict,
  primary key (plan_id, feature_key)
);

comment on table public.plan_features is 'BILL-3. Reference data: the feature matrix, one row per grant. A plan absent from a feature''s rows does not have it.';

-- Landlord and above. Growth's own id covers the trial, which shares its tier.
insert into
  public.plan_features (plan_id, feature_key)
select
  p.id,
  f.key
from
  public.plans p
  cross join public.features f
where
  f.key in (
    'automated_messaging',
    'repair_cost_allocation',
    'agency_branded_documents',
    'full_reports'
  )
  and p.tier in ('landlord', 'agent', 'growth', 'enterprise');

-- Agent and above: the things that involve other people's money.
insert into
  public.plan_features (plan_id, feature_key)
select
  p.id,
  f.key
from
  public.plans p
  cross join public.features f
where
  f.key in (
    'multi_landlord_ledger',
    'landlord_statements',
    'landlord_portal'
  )
  and p.tier in ('agent', 'growth', 'enterprise');

-- ---------------------------------------------------------------------------
-- Which roles a plan may assign
--
-- The matrix says "Owner and caretaker" on Free, "Basic roles" on Landlord and
-- "Full roles" above. Only the first of those is defined anywhere, so only the
-- first is restrictive here: Free gets owner, caretaker and the tenant portal
-- role, and every other plan gets everything. What "basic roles" excludes is
-- an open product decision (21), and resolving it is an insert into this
-- table, not a migration.
-- ---------------------------------------------------------------------------
create table public.plan_roles (
  plan_id text not null references public.plans (id) on delete cascade,
  role public.app_role not null,
  primary key (plan_id, role)
);

comment on table public.plan_roles is 'BILL-3. Reference data: the roles each plan may assign. Absent means not assignable.';

insert into
  public.plan_roles (plan_id, role)
select
  p.id,
  r.role
from
  public.plans p
  cross join (
    select
      unnest(enum_range(null::public.app_role)) as role
  ) r
where
  p.tier <> 'free'
  or r.role in ('owner', 'caretaker', 'tenant');

-- ---------------------------------------------------------------------------
-- Which plan an organisation is entitled to today
--
-- security definer: a caretaker inserting a unit has no policy letting them
-- read `subscriptions`, and the limit still has to apply to them. The function
-- reads nothing organisation-specific beyond the plan, so widening the
-- caretaker's reach is not the cost of using it.
--
-- A subscription that has lapsed falls back to Free rather than to nothing.
-- That is BILL-4's rule in function form: an unpaid account keeps its data and
-- loses its headroom, it does not lose its account. Which statuses still
-- entitle the plan is the lifecycle question TV-151 owns; the conservative
-- reading is encoded here.
-- ---------------------------------------------------------------------------
create or replace function app.organisation_plan (target_organisation_id uuid) returns public.plans language plpgsql stable security definer
set
  search_path = '' as $$
declare
  entitled public.plans;
begin
  select p.* into entitled
  from public.subscriptions s
    join public.plans p on p.id = s.plan_id
  where s.organisation_id = target_organisation_id
    and s.status in ('trialing', 'active', 'past_due', 'grace');

  if found then
    return entitled;
  end if;

  select p.* into entitled from public.plans p where p.id = 'free';
  return entitled;
end;
$$;

comment on function app.organisation_plan is 'BILL-3. The plan an organisation is entitled to now, falling back to Free when no subscription entitles one.';

-- ---------------------------------------------------------------------------
-- What a limit means
--
-- Pure and immutable, so it can be reasoned about and tested on its own. The
-- three answers are the whole model:
--
--   'unlimited'  the plan sets no limit
--   'within'     there is room
--   'billable'   the band is full, and the plan sells more at a per-unit price
--   'refused'    the band is full and the plan does not sell more
--
-- 'billable' is why this is not a boolean. Refusing the 31st unit on a plan
-- that advertises ₦300 per extra unit would be refusing a sale.
-- ---------------------------------------------------------------------------
create or replace function app.limit_verdict (
  used integer,
  allowed integer,
  overage_kobo bigint
) returns text language sql immutable
set
  search_path = '' as $$
  select case
    when allowed is null then 'unlimited'
    when used < allowed then 'within'
    when overage_kobo is not null then 'billable'
    else 'refused'
  end;
$$;

comment on function app.limit_verdict is 'BILL-3. Whether a count is inside a plan limit, billable beyond it, or refused. A null overage price makes a limit a wall.';

-- ---------------------------------------------------------------------------
-- What an organisation is using
--
-- Counting rules, each of which is a decision:
--
--   properties  every row. There is no archive yet; when there is, it belongs
--               in this count's where clause and nowhere else.
--   units       everything but 'inactive', per §3.4: "every active unit,
--               including vacant ones. Archived units do not count."
--   users       staff seats: memberships that are invited or active. An
--               invitation holds a seat, otherwise inviting past the limit
--               would succeed and then trap the invitee at the door.
--               Suspended members do not hold one — they cannot sign in, and
--               the plan sells access, not rows.
--               Tenants and landlords are excluded: portal access comes from
--               `tenants.user_id` and `landlords.user_id`, and a plan that
--               sold three seats would otherwise be exhausted by the first
--               three tenants who logged in.
-- ---------------------------------------------------------------------------
create or replace function app.organisation_usage (target_organisation_id uuid) returns table (properties integer, units integer, users integer) language sql stable security definer
set
  search_path = '' as $$
  select
    (
      select count(*)
      from public.properties
      where organisation_id = target_organisation_id
    )::integer,
    (
      select count(*)
      from public.units
      where organisation_id = target_organisation_id
        and status <> 'inactive'
    )::integer,
    (
      select count(*)
      from public.memberships
      where organisation_id = target_organisation_id
        and status in ('invited', 'active')
        and role not in ('tenant', 'landlord')
    )::integer;
$$;

comment on function app.organisation_usage is 'BILL-3, and the counts TV-148 will meter. Staff seats only: portal access does not consume one.';

-- ---------------------------------------------------------------------------
-- Feature gates
--
-- Raises on an unknown key rather than returning false. A typo that silently
-- denies a paying customer their feature is the bug that reaches support
-- instead of CI.
-- ---------------------------------------------------------------------------
create or replace function app.plan_allows (target_organisation_id uuid, target_feature text) returns boolean language plpgsql stable security definer
set
  search_path = '' as $$
declare
  -- Not named plan_id: that is also a column of plan_features, and plpgsql
  -- resolves a variable in preference to a column, so the predicate below
  -- would compare the column with itself. `supabase db lint` reports it as
  -- ambiguous, which is how this was caught.
  entitled_plan_id text;
begin
  if not exists (select 1 from public.features f where f.key = target_feature) then
    raise exception '"%" is not a feature in public.features', target_feature
      using errcode = '22023',
            hint = 'Add it to the catalogue, or fix the spelling.';
  end if;

  entitled_plan_id := (app.organisation_plan(target_organisation_id)).id;
  if entitled_plan_id is null then
    -- No plan at all should not lock an organisation out of its own data.
    return true;
  end if;

  return exists (
    select 1
    from public.plan_features pf
    where pf.plan_id = entitled_plan_id
      and pf.feature_key = target_feature
  );
end;
$$;

comment on function app.plan_allows is 'BILL-3. Whether an organisation''s plan grants a feature. Raises if the feature key is not in the catalogue.';

create or replace function app.assert_plan_allows (target_organisation_id uuid, target_feature text) returns void language plpgsql
set
  search_path = '' as $$
declare
  feature_label text;
  feature_description text;
begin
  if app.plan_allows(target_organisation_id, target_feature) then
    return;
  end if;

  select f.label, f.description into feature_label, feature_description
  from public.features f
  where f.key = target_feature;

  raise exception '% is not included in this plan', feature_label
    using errcode = '53400',
          hint = feature_description,
          detail = target_feature;
end;
$$;

comment on function app.assert_plan_allows is 'BILL-3. Refuses with 53400 (configuration_limit_exceeded) and the catalogue''s own wording, so every surface says the same thing.';

-- ---------------------------------------------------------------------------
-- The limits, at the write
--
-- One trigger function per limited table rather than a generic one, because
-- each counts something slightly different and a generic version would need
-- the differences passed in as arguments anyway — at which point the
-- indirection buys nothing and costs the reader the ability to see what is
-- counted.
-- ---------------------------------------------------------------------------
create or replace function app.assert_property_within_plan () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  plan public.plans;
  used integer;
  verdict text;
begin
  plan := app.organisation_plan(new.organisation_id);
  if plan.id is null then
    return new;
  end if;

  select count(*) into used
  from public.properties
  where organisation_id = new.organisation_id;

  -- There is no per-property overage price anywhere in the pricing, so a
  -- property limit is always a wall: null, not a column that does not exist.
  verdict := app.limit_verdict(used, plan.property_limit, null);
  if verdict = 'refused' then
    raise exception 'the % plan includes % properties, and this organisation already has %',
      plan.name, plan.property_limit, used
      using errcode = '53400',
            hint = 'Upgrade the plan to add more properties. Nothing is removed in the meantime.';
  end if;

  return new;
end;
$$;

create trigger properties_within_plan
before insert on public.properties for each row
execute function app.assert_property_within_plan ();

create or replace function app.assert_unit_within_plan () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  plan public.plans;
  used integer;
  verdict text;
begin
  -- Only a row that will occupy the band is checked. Deactivating a unit, or
  -- editing the label of one that already counts, must never be refused for a
  -- limit it is not adding to.
  if new.status = 'inactive' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status <> 'inactive' then
    return new;
  end if;

  plan := app.organisation_plan(new.organisation_id);
  if plan.id is null then
    return new;
  end if;

  select count(*) into used
  from public.units
  where organisation_id = new.organisation_id
    and status <> 'inactive';

  verdict := app.limit_verdict(used, plan.unit_limit, plan.unit_overage_kobo);
  if verdict = 'refused' then
    raise exception 'the % plan includes % units, and this organisation already has % active',
      plan.name, plan.unit_limit, used
      using errcode = '53400',
            hint = 'Upgrade the plan, or set a unit you no longer manage to inactive.';
  end if;

  return new;
end;
$$;

-- Insert, and the reactivation of an inactive unit: both put a unit back in
-- the band, and only checking inserts would make 'inactive' a way round the
-- limit.
create trigger units_within_plan
before insert or update of status on public.units for each row
execute function app.assert_unit_within_plan ();

create or replace function app.assert_membership_within_plan () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  plan public.plans;
  used integer;
  verdict text;
begin
  plan := app.organisation_plan(new.organisation_id);
  if plan.id is null then
    return new;
  end if;

  -- The role has to be one the plan can assign, whatever the seat count says.
  if not exists (
    select 1
    from public.plan_roles pr
    where pr.plan_id = plan.id
      and pr.role = new.role
  ) then
    raise exception 'the % plan cannot assign the % role', plan.name, new.role
      using errcode = '53400',
            hint = 'Upgrade the plan to use the full set of roles.';
  end if;

  -- Portal access is not a staff seat, and an existing seat-holder changing
  -- role or being reinstated is not a new seat either.
  if new.role in ('tenant', 'landlord') or new.status not in ('invited', 'active') then
    return new;
  end if;
  if tg_op = 'UPDATE'
    and old.status in ('invited', 'active')
    and old.role not in ('tenant', 'landlord') then
    return new;
  end if;

  select count(*) into used
  from public.memberships
  where organisation_id = new.organisation_id
    and status in ('invited', 'active')
    and role not in ('tenant', 'landlord')
    and id <> new.id;

  verdict := app.limit_verdict(used, plan.user_limit, plan.extra_user_kobo);
  if verdict = 'refused' then
    raise exception 'the % plan includes % users, and this organisation already has %',
      plan.name, plan.user_limit, used
      using errcode = '53400',
            hint = 'Upgrade the plan to invite more colleagues, or suspend someone who has left.';
  end if;

  return new;
end;
$$;

create trigger memberships_within_plan
before insert or update of status,
role on public.memberships for each row
execute function app.assert_membership_within_plan ();

-- ---------------------------------------------------------------------------
-- The feature gates that have something to gate today
--
-- A second landlord is the line between "I own a building" and "I collect
-- other people's money", which is exactly where the pricing draws it, and
-- §3.8 names it as the reason an agency cannot run clients' money on a free
-- account. The mandate is the instrument that money moves under.
-- ---------------------------------------------------------------------------
create or replace function app.assert_landlord_within_plan () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from public.landlords l
    where l.organisation_id = new.organisation_id
      and l.id <> new.id
  ) then
    perform app.assert_plan_allows(new.organisation_id, 'multi_landlord_ledger');
  end if;

  return new;
end;
$$;

create trigger landlords_within_plan
before insert on public.landlords for each row
execute function app.assert_landlord_within_plan ();

create or replace function app.assert_mandate_within_plan () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  perform app.assert_plan_allows(new.organisation_id, 'multi_landlord_ledger');
  return new;
end;
$$;

create trigger management_mandates_within_plan
before insert on public.management_mandates for each row
execute function app.assert_mandate_within_plan ();

-- ---------------------------------------------------------------------------
-- What the caller's own organisation is entitled to
--
-- Takes no organisation id, which is the point: there is no argument to
-- tamper with. It answers for the organisations the caller is actually a
-- member of, which for everyone but a multi-agency consultant is one row.
--
-- One function rather than letting the page assemble this itself, because the
-- page cannot: `subscriptions` is readable by owners, admins and accountants
-- only, so a property manager looking at a usage bar would otherwise see
-- nothing. The limits are not a secret from the staff working inside them.
--
-- The verdicts come back with the counts so that a screen and a trigger cannot
-- disagree about whether there is room — both read `app.limit_verdict`.
-- ---------------------------------------------------------------------------
create or replace function public.plan_entitlements () returns table (
  organisation_id uuid,
  plan_id text,
  plan_name text,
  tier public.plan_tier,
  properties_used integer,
  property_limit integer,
  properties_verdict text,
  units_used integer,
  unit_limit integer,
  units_verdict text,
  unit_overage_kobo bigint,
  users_used integer,
  user_limit integer,
  users_verdict text,
  extra_user_kobo bigint,
  storage_mb integer,
  included_messages integer,
  features text[]
) language sql stable security definer
set
  search_path = '' as $$
  select
    o.id,
    plan.id,
    plan.name,
    plan.tier,
    usage.properties,
    plan.property_limit,
    app.limit_verdict(usage.properties, plan.property_limit, null),
    usage.units,
    plan.unit_limit,
    app.limit_verdict(usage.units, plan.unit_limit, plan.unit_overage_kobo),
    plan.unit_overage_kobo,
    usage.users,
    plan.user_limit,
    app.limit_verdict(usage.users, plan.user_limit, plan.extra_user_kobo),
    plan.extra_user_kobo,
    plan.storage_mb,
    plan.included_messages,
    coalesce(
      (
        select array_agg(pf.feature_key order by pf.feature_key)
        from public.plan_features pf
        where pf.plan_id = plan.id
      ),
      array[]::text[]
    )
  from public.organisations o
    cross join lateral app.organisation_plan(o.id) as plan
    cross join lateral app.organisation_usage(o.id) as usage
  where o.id in (select app.current_organisation_ids());
$$;

comment on function public.plan_entitlements is 'BILL-3. The caller''s own plan, limits, usage and feature grants. No organisation id argument, so there is nothing to tamper with.';

-- ---------------------------------------------------------------------------
-- Row-level security
--
-- All three tables are global reference data, like `plans`. Readable so an
-- upgrade screen can render the matrix; written by migrations only, which is
-- the absence of any write policy.
-- ---------------------------------------------------------------------------
alter table public.features enable row level security;

alter table public.plan_features enable row level security;

alter table public.plan_roles enable row level security;

create policy features_select_all on public.features for
select
  to authenticated using (true);

create policy plan_features_select_all on public.plan_features for
select
  to authenticated using (true);

create policy plan_roles_select_all on public.plan_roles for
select
  to authenticated using (true);

-- ===========================================================================
-- Grants
-- ===========================================================================
grant
select
  on public.features to authenticated;

grant
select
  on public.plan_features to authenticated;

grant
select
  on public.plan_roles to authenticated;

-- The three functions that take an organisation id are internal.
--
-- Postgres grants EXECUTE on a new function to PUBLIC, so leaving them alone
-- would let any signed-in user pass someone else's organisation id and learn
-- their plan and how many properties they manage. Small, and still a leak of
-- exactly the kind ORG-8 exists to prevent — an agency's size is commercially
-- interesting to the agency down the road.
--
-- Triggers are unaffected: they run as this schema's owner.
revoke
execute on function app.organisation_plan (uuid)
from
  public;

revoke
execute on function app.organisation_usage (uuid)
from
  public;

revoke
execute on function app.plan_allows (uuid, text)
from
  public;

-- Pure arithmetic over three numbers, with nothing to leak.
grant
execute on function app.limit_verdict (integer, integer, bigint) to authenticated;

grant
execute on function public.plan_entitlements () to authenticated;

-- The image's default privileges would otherwise grant anon the new tables.
revoke all on all tables in schema public
from
  anon;

revoke all on all sequences in schema public
from
  anon;

revoke all on all functions in schema public
from
  anon;
