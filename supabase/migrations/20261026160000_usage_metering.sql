-- TV-148: usage metering (BILL-3, and the input TV-153 bills from).
--
-- TV-147 answers "is there room right now". This answers a different question:
-- "what did this organisation use during the period we are about to invoice".
-- The two must not be the same number. A live count changes every time
-- somebody adds a flat; an invoice cannot.
--
-- §3.4 of the pricing decision sets the rule: "Bill on the count at the end of
-- the billing period, with a 3-day grace so a short-lived import does not
-- inflate the bill." That grace is the whole reason this is a table and not a
-- view. A reading is taken when the period ends and left provisional; three
-- days later it is finalised, and the final figure is the *lower* of what was
-- there at period end and what is there now. An agency that imported 500 units
-- by mistake on the last day of the month and fixed it on the 2nd is not
-- invoiced for 500. An agency that genuinely grew in those three days is
-- invoiced for the smaller, earlier figure too — the grace cuts one way on
-- purpose, because a customer forgiving a billing error is cheaper than a
-- customer disputing one.
--
-- A final reading is immutable and audited. It is the basis of an invoice, so
-- PRD §10.2 applies to it as much as to a payment: a figure that can be
-- rewritten after the fact is not a record of anything.
--
-- Two of the five metrics the ticket names cannot be measured yet, and are
-- recorded as null rather than zero. Zero is a number an invoice would
-- believe:
--   storage_mb  needs a document registry with sizes (TV-052). TV-014 stores
--               objects and audits access; nothing records how large they are.
--   messages    needs the message log (TV-038, Sprint 7). Nothing sends an
--               automated message yet, so there is nothing to count.
-- ---------------------------------------------------------------------------
-- The 80% threshold and the 3-day grace, each defined once
--
-- Immutable functions rather than literals scattered through queries, so the
-- warning a screen shows and the warning a reminder sends cannot drift apart,
-- and so a test can assert the number the product promised.
-- ---------------------------------------------------------------------------
create or replace function app.usage_warning_percentage () returns integer language sql immutable
set
  search_path = '' as $$
  select 80;
$$;

comment on function app.usage_warning_percentage is 'BILL-3, §3.7: "At 80% and 100% of a limit, show a clear prompt with the upgrade price."';

create or replace function app.usage_grace_days () returns integer language sql immutable
set
  search_path = '' as $$
  select 3;
$$;

comment on function app.usage_grace_days is 'BILL-3, §3.4: the days after a period ends before its reading is final, so a short-lived import does not inflate a bill.';

-- ---------------------------------------------------------------------------
-- Which band a count is in
--
-- Four answers, and 'unlimited' is one of them: a percentage of unlimited is
-- not 0, it is nothing, and a usage bar that reads 0% beside the word
-- unlimited looks broken.
--
-- Distinct from app.limit_verdict, which answers whether a *write* may
-- proceed. This answers whether a *person* should be told. A plan selling
-- extra units past its band is still worth a warning at 80% — that is the
-- point at which the upgrade is cheaper than the overage.
-- ---------------------------------------------------------------------------
create or replace function app.usage_band (used integer, allowed integer) returns text language sql immutable
set
  search_path = '' as $$
  select case
    when allowed is null or allowed = 0 then 'unlimited'
    when used >= allowed then 'reached'
    when used * 100 >= allowed * app.usage_warning_percentage() then 'approaching'
    else 'ok'
  end;
$$;

comment on function app.usage_band is 'BILL-3. ''ok'', ''approaching'' at 80%, ''reached'' at 100%, or ''unlimited''. Integer arithmetic throughout: no float rounding decides whether somebody is warned.';

-- ---------------------------------------------------------------------------
-- The readings
-- ---------------------------------------------------------------------------
create type public.usage_reading_status as enum('provisional', 'final');

create table public.usage_readings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  -- The billing period this reading is for. Calendar dates: a period boundary
  -- must not move with the reader's timezone (PRD §10.6).
  period_start date not null,
  period_end date not null,
  status public.usage_reading_status not null default 'provisional',
  -- The plan as it was when the period ended. Snapshotted because a plan's
  -- price or band changing next month must not rewrite what this month billed.
  plan_id text not null references public.plans (id) on delete restrict,
  unit_limit integer,
  unit_overage_kobo bigint,
  user_limit integer,
  property_limit integer,
  -- What was counted. Null means "not measured", which is not zero.
  units integer check (
    units is null
    or units >= 0
  ),
  properties integer check (
    properties is null
    or properties >= 0
  ),
  users integer check (
    users is null
    or users >= 0
  ),
  storage_mb integer check (
    storage_mb is null
    or storage_mb >= 0
  ),
  messages integer check (
    messages is null
    or messages >= 0
  ),
  taken_at timestamptz not null default now(),
  finalised_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint usage_readings_period_ordered check (period_end >= period_start),
  constraint usage_readings_final_is_dated check (
    status <> 'final'
    or finalised_at is not null
  ),
  -- One reading per organisation per period. A retried job must not produce a
  -- second basis for the same invoice.
  unique (organisation_id, period_start, period_end)
);

comment on table public.usage_readings is 'BILL-3, TV-148. What an organisation used in one billing period, provisional at period end and final after the grace. The basis of an invoice, so a final reading is immutable (PRD §10.2).';

comment on column public.usage_readings.storage_mb is 'Null until a document registry records sizes (TV-052). Null means not measured; zero would be a figure an invoice believes.';

comment on column public.usage_readings.messages is 'Null until the message log exists (TV-038). Null means not measured.';

create index usage_readings_organisation_idx on public.usage_readings (organisation_id, period_end desc);

create index usage_readings_pending_idx on public.usage_readings (period_end)
where
  status = 'provisional';

create trigger usage_readings_touch_updated_at
before update on public.usage_readings for each row
execute function app.touch_updated_at ();

-- A metered figure is a financial record, so it is audited like one (ORG-5).
create trigger usage_readings_audit
after insert or update on public.usage_readings for each row
execute function app.audit_row_change ('usage_reading');

-- ---------------------------------------------------------------------------
-- A final reading cannot be rewritten
-- ---------------------------------------------------------------------------
create or replace function app.deny_usage_reading_rewrite () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'a usage reading is never deleted'
      using errcode = '42501',
            hint = 'It is the basis of an invoice (PRD §10.2).';
  end if;

  if old.status = 'final' then
    raise exception 'the reading for % to % is final and cannot be changed',
      old.period_start, old.period_end
      using errcode = '42501',
            hint = 'Take a new reading for a new period, or raise a credit against the invoice.';
  end if;

  if new.organisation_id <> old.organisation_id
    or new.period_start <> old.period_start
    or new.period_end <> old.period_end then
    raise exception 'a reading cannot be moved to another organisation or period'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger usage_readings_append_only
before update or delete on public.usage_readings for each row
execute function app.deny_usage_reading_rewrite ();

-- ---------------------------------------------------------------------------
-- Taking a reading
--
-- security definer, because the thing that calls this is a scheduled job, not
-- a person: it has to read every organisation's counts and write a row nobody
-- has a policy to write. The functions are therefore narrow — they take a
-- reading for a period, and do nothing else — and the write policies below
-- grant no one else the privilege.
--
-- Idempotent. A retried job finds the existing provisional reading and
-- refreshes its counts rather than inserting a second basis for one invoice.
-- A period already finalised is left alone.
-- ---------------------------------------------------------------------------
create or replace function public.take_usage_reading (
  target_organisation_id uuid,
  period_start date,
  period_end date
) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  plan public.plans;
  usage record;
  reading_id uuid;
  existing public.usage_reading_status;
begin
  if period_end < period_start then
    raise exception 'a period cannot end before it starts' using errcode = '22023';
  end if;

  select ur.id, ur.status into reading_id, existing
  from public.usage_readings ur
  where ur.organisation_id = target_organisation_id
    and ur.period_start = take_usage_reading.period_start
    and ur.period_end = take_usage_reading.period_end;

  if existing = 'final' then
    return reading_id;
  end if;

  plan := app.organisation_plan(target_organisation_id);
  if plan.id is null then
    raise exception 'organisation % has no plan to meter against', target_organisation_id
      using errcode = '22023';
  end if;

  select * into usage from app.organisation_usage(target_organisation_id);

  if reading_id is null then
    insert into public.usage_readings (
      organisation_id, period_start, period_end, status, plan_id,
      unit_limit, unit_overage_kobo, user_limit, property_limit,
      units, properties, users
    )
    values (
      target_organisation_id,
      take_usage_reading.period_start,
      take_usage_reading.period_end,
      'provisional',
      plan.id,
      plan.unit_limit, plan.unit_overage_kobo, plan.user_limit, plan.property_limit,
      usage.units, usage.properties, usage.users
    )
    returning id into reading_id;
  else
    update public.usage_readings
    set
      plan_id = plan.id,
      unit_limit = plan.unit_limit,
      unit_overage_kobo = plan.unit_overage_kobo,
      user_limit = plan.user_limit,
      property_limit = plan.property_limit,
      units = usage.units,
      properties = usage.properties,
      users = usage.users,
      taken_at = now()
    where id = reading_id;
  end if;

  return reading_id;
end;
$$;

comment on function public.take_usage_reading is 'BILL-3, TV-148. Takes or refreshes the provisional reading for one period. Idempotent, and never touches a final reading.';

-- ---------------------------------------------------------------------------
-- Finalising
--
-- The grace, in one place: each final figure is the lower of what was there at
-- period end and what is there now. See the note at the top of this file for
-- why it cuts one way.
--
-- Refuses before the grace has elapsed. A figure finalised early is a figure
-- that did not have its grace, which is the customer's protection and not an
-- implementation detail to be lenient about.
-- ---------------------------------------------------------------------------
create or replace function public.finalise_usage_reading (target_reading_id uuid) returns public.usage_readings language plpgsql security definer
set
  search_path = '' as $$
declare
  reading public.usage_readings;
  usage record;
  finalise_on date;
begin
  select * into reading
  from public.usage_readings ur
  where ur.id = target_reading_id;

  if not found then
    raise exception 'no usage reading %', target_reading_id using errcode = '22023';
  end if;

  if reading.status = 'final' then
    return reading;
  end if;

  finalise_on := reading.period_end + app.usage_grace_days();
  if current_date < finalise_on then
    raise exception 'the reading for % to % cannot be final before %',
      reading.period_start, reading.period_end, finalise_on
      using errcode = '22023',
            hint = 'The grace exists so a short-lived import does not inflate the bill (§3.4).';
  end if;

  select * into usage from app.organisation_usage(reading.organisation_id);

  update public.usage_readings
  set
    status = 'final',
    units = least(reading.units, usage.units),
    properties = least(reading.properties, usage.properties),
    users = least(reading.users, usage.users),
    finalised_at = now()
  where id = target_reading_id
  returning * into reading;

  return reading;
end;
$$;

comment on function public.finalise_usage_reading is 'BILL-3, TV-148. Fixes a reading after the 3-day grace at the lower of the period-end and current counts.';

-- ---------------------------------------------------------------------------
-- What a scheduled job calls
--
-- One entry point, so the schedule has one thing to get right. Takes readings
-- for periods that have ended and finalises those past their grace.
--
-- Nothing schedules it yet: there is no job runner in R1 until billing needs
-- one (TV-153). Until then this is called by hand or by a test, and that is
-- the honest state of it — a metering function nobody calls meters nothing.
-- ---------------------------------------------------------------------------
create or replace function public.record_due_usage_readings () returns table (taken integer, finalised integer) language plpgsql security definer
set
  search_path = '' as $$
declare
  due record;
  taken_count integer := 0;
  finalised_count integer := 0;
begin
  -- Periods that have ended and have no reading yet.
  for due in
    select s.organisation_id, s.current_period_start, s.current_period_end
    from public.subscriptions s
    where s.current_period_start is not null
      and s.current_period_end is not null
      and s.current_period_end < current_date
      and not exists (
        select 1
        from public.usage_readings ur
        where ur.organisation_id = s.organisation_id
          and ur.period_start = s.current_period_start
          and ur.period_end = s.current_period_end
      )
  loop
    perform public.take_usage_reading(
      due.organisation_id, due.current_period_start, due.current_period_end
    );
    taken_count := taken_count + 1;
  end loop;

  -- Provisional readings whose grace has elapsed.
  for due in
    select ur.id
    from public.usage_readings ur
    where ur.status = 'provisional'
      and ur.period_end + app.usage_grace_days() <= current_date
  loop
    perform public.finalise_usage_reading(due.id);
    finalised_count := finalised_count + 1;
  end loop;

  return query select taken_count, finalised_count;
end;
$$;

comment on function public.record_due_usage_readings is 'BILL-3, TV-148. The one entry point a scheduler calls: take readings for ended periods, finalise those past the grace.';

-- ---------------------------------------------------------------------------
-- The warnings
--
-- One row per metric that is worth saying something about, for the caller's
-- own organisations. No organisation id argument, for the reason given on
-- plan_entitlements: there is nothing to tamper with.
--
-- Returns every metric, band included, rather than only the ones over 80%.
-- A caller deciding what to show needs to know a metric is fine; a caller
-- deciding what to *send* filters on band. One query serves both, and the
-- threshold lives in app.usage_band rather than in either of them.
-- ---------------------------------------------------------------------------
create or replace function public.usage_warnings () returns table (
  organisation_id uuid,
  metric text,
  used integer,
  allowed integer,
  percentage integer,
  band text,
  overage_kobo bigint
) language sql stable security definer
set
  search_path = '' as $$
  select
    measured.organisation_id,
    measured.metric,
    measured.used,
    measured.allowed,
    case
      when measured.allowed is null or measured.allowed = 0 then null
      -- Capped: an organisation that dropped to a smaller plan is at 100%, not
      -- at 1010%, and a bar is not a place to make a point.
      else least(100, (measured.used * 100) / measured.allowed)
    end,
    app.usage_band(measured.used, measured.allowed),
    measured.overage_kobo
  from (
    select
      o.id as organisation_id,
      m.metric,
      case m.metric
        when 'units' then usage.units
        when 'properties' then usage.properties
        else usage.users
      end as used,
      case m.metric
        when 'units' then plan.unit_limit
        when 'properties' then plan.property_limit
        else plan.user_limit
      end as allowed,
      case m.metric
        when 'units' then plan.unit_overage_kobo
        when 'properties' then null::bigint
        else plan.extra_user_kobo
      end as overage_kobo
    from public.organisations o
      cross join lateral app.organisation_plan(o.id) as plan
      cross join lateral app.organisation_usage(o.id) as usage
      cross join (values ('units'), ('properties'), ('users')) as m (metric)
    where o.id in (select app.current_organisation_ids())
  ) measured;
$$;

comment on function public.usage_warnings is 'BILL-3, TV-148. Every metered limit for the caller''s organisations, with the band at 80% and 100%. Storage and messages are absent because nothing measures them yet (TV-052, TV-038).';

-- ---------------------------------------------------------------------------
-- Row-level security
--
-- Readings are read by whoever answers for the bill, and written by nobody:
-- the metering functions are security definer, so the absence of a write
-- policy is what stops a member editing the basis of their own invoice.
-- ---------------------------------------------------------------------------
alter table public.usage_readings enable row level security;

create policy usage_readings_select_billing on public.usage_readings for
select
  to authenticated using (
    app.has_role (
      organisation_id,
      array['owner', 'admin', 'accountant']::public.app_role[]
    )
  );

-- ===========================================================================
-- Grants
-- ===========================================================================
grant
select
  on public.usage_readings to authenticated;

grant
execute on function public.usage_warnings () to authenticated;

grant
execute on function app.usage_band (integer, integer) to authenticated;

grant
execute on function app.usage_warning_percentage () to authenticated;

grant
execute on function app.usage_grace_days () to authenticated;

-- Metering is a job's work, not a user's: a member who could finalise their own
-- reading could choose the moment their usage was lowest.
--
-- Revoked from `authenticated` as well as from PUBLIC, and both are needed.
-- Postgres grants EXECUTE to PUBLIC on every new function, and this image goes
-- further — its default privileges grant `authenticated` on new functions in
-- `public`, which is why the equivalent revoke on the `app` schema functions in
-- TV-147 was enough there and is not enough here. A test caught the difference:
-- the first version of this block revoked from PUBLIC only, and a property
-- manager could still meter their own organisation.
revoke
execute on function public.take_usage_reading (uuid, date, date)
from
  public,
  authenticated;

revoke
execute on function public.finalise_usage_reading (uuid)
from
  public,
  authenticated;

revoke
execute on function public.record_due_usage_readings ()
from
  public,
  authenticated;

-- The image's default privileges would otherwise grant anon the new table.
revoke all on all tables in schema public
from
  anon;

revoke all on all sequences in schema public
from
  anon;

revoke all on all functions in schema public
from
  anon;
