-- R1 step 4, first part: charges generated from lease terms (RENT-1, TV-018).
--
-- A charge is one dated amount a tenant owes for one period. Everything later
-- in the money path hangs off this table: RENT-3 allocates payments to
-- charges, RENT-5 ages them into arrears, LEDGER-1 recognises commission on
-- what they collect. The shape matters more than the volume of code.
--
-- Three rules are enforced here rather than in the application, because each
-- is a way a rent ledger loses the agency's trust:
--
--   1. A charge's amount, period and due date never change. One raised in
--      error is cancelled and replaced, so the history a tenant disputes is
--      the history the agency can see (PRD §10.2).
--   2. No two live charges of the same kind cover the same day for one lease.
--      Double-billing a month is the most common cause of a rent dispute, and
--      an exclusion constraint makes it unrepresentable rather than unlikely.
--   3. A schedule covers the lease term exactly: no gap, starting the day the
--      lease starts and ending the day it ends. A missing period is money the
--      agency never asks for and nobody notices until a statement is short.
--
-- What is deliberately absent is any stored `paid_kobo` or `balance_kobo`
-- column. A charge's paid balance is derived from its allocations (PRD §10.4);
-- storing it would create a second truth to reconcile, and the two would
-- disagree the first time an allocation was reversed.
--
-- Also deliberately absent is a trigger requiring an active lease to have
-- charges. It is tempting — activation starts the rent clock — but the import
-- path (TV-034) brings in tenancies that are already mid-term, and whether
-- their history arrives as generated charges or as opening balances (TV-035)
-- is not yet decided. A trigger now would settle that by accident. The
-- sanctioned activation paths below always generate charges in the same
-- transaction, and `charges_test` holds them to it; revisit the trigger when
-- opening balances land.
-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
-- Only rent is generated today. Service charges and recharged repairs become
-- charges too (LEASE-2, MAINT-8), and each is one `alter type ... add value`
-- away — cheap, unlike reshaping a table, so the enum starts at what exists.
create type public.charge_kind as enum('rent');

-- Not a payment state. 'open' means live and owed; what is left to pay comes
-- from the allocations against it. 'cancelled' is for a charge that should
-- never have been raised, or a period the lease no longer covers after an
-- early termination.
create type public.charge_status as enum('open', 'cancelled');

-- A due day never meant anything for an annual rent; it means nothing for an
-- irregular one either, where each instalment carries its own date.
alter table public.leases
drop constraint leases_due_day_requires_periodic_rent;

alter table public.leases
add constraint leases_due_day_requires_periodic_rent check (
  rent_due_day is null
  or rent_frequency not in ('annual', 'irregular')
);

-- ---------------------------------------------------------------------------
-- charges
-- ---------------------------------------------------------------------------
create table public.charges (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  -- restrict, not cascade: a lease with financial history is not deleted, and
  -- if something ever tries, the charges are what stops it.
  lease_id uuid not null references public.leases (id) on delete restrict,
  kind public.charge_kind not null default 'rent',
  -- 1-based within (lease, kind), in date order. The number a tenant sees on a
  -- statement as "instalment 2 of 4".
  sequence integer not null check (sequence >= 1),
  -- Contractual dates, not timestamps (PRD §10.6). period_end is inclusive: a
  -- charge covering March ends on 31 March.
  period_start date not null,
  period_end date not null,
  due_on date not null,
  amount_kobo bigint not null check (amount_kobo >= 0),
  -- True when the period is shorter than a full interval, which happens on the
  -- last period of a term that is not a whole number of intervals. Flagged
  -- rather than pro-rated: pro-rating needs a documented rounding rule and that
  -- rule is an open product decision (docs/ops/open-decisions.md).
  covers_partial_period boolean not null default false,
  status public.charge_status not null default 'open',
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete set null,
  cancellation_reason text check (
    length(btrim(cancellation_reason)) between 1 and 500
  ),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint charges_period_ordered check (period_end >= period_start),
  -- Rent in advance is due at the start of the period, not before it. A charge
  -- dated earlier than the period it covers would age into arrears for time
  -- the tenant has not yet occupied.
  constraint charges_due_not_before_period check (due_on >= period_start),
  constraint charges_cancellation_recorded check (
    status <> 'cancelled'
    or (
      cancelled_at is not null
      and cancellation_reason is not null
    )
  ),
  constraint charges_open_not_cancelled check (
    status = 'cancelled'
    or (
      cancelled_at is null
      and cancellation_reason is null
      and cancelled_by is null
    )
  ),
  unique (lease_id, kind, sequence),
  -- Rule 2. Cancelled charges are outside it, so a corrected schedule can be
  -- re-raised over the period a cancelled one covered.
  constraint charges_no_overlapping_periods exclude using gist (
    lease_id
    with
      =,
      kind
    with
      =,
      daterange (period_start, period_end, '[]')
    with
      &&
  )
  where
    (status <> 'cancelled')
);

comment on table public.charges is 'RENT-1. One dated amount owed for one period. Append-only in its financial columns; the paid balance is derived from allocations, never stored (PRD §10.4).';

comment on column public.charges.covers_partial_period is 'The period is shorter than a full interval. The amount is still the full periodic rent unless an agency decides otherwise: pro-rating awaits the rounding rule in open decision 20.';

-- Arrears and upcoming dues are read by due date across an organisation
-- (RENT-5), which is the one access path that is not through a lease.
create index charges_organisation_due_idx on public.charges (organisation_id, due_on)
where
  status <> 'cancelled';

create index charges_lease_idx on public.charges (lease_id, sequence);

create trigger charges_touch_updated_at
before update on public.charges for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- A charge belongs to its lease's organisation
--
-- organisation_id is denormalised onto every scoped table so RLS can read it
-- without a join. That only holds if it cannot disagree with the parent.
-- ---------------------------------------------------------------------------
create or replace function app.assert_charge_lease_same_organisation () returns trigger language plpgsql
set
  search_path = '' as $$
declare
  lease_organisation uuid;
begin
  select l.organisation_id into lease_organisation
  from public.leases l
  where l.id = new.lease_id;

  if lease_organisation is null then
    raise exception 'lease % does not exist', new.lease_id using errcode = '23503';
  end if;

  if lease_organisation <> new.organisation_id then
    raise exception 'a charge must belong to the same organisation as its lease'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger charges_same_organisation
before insert or update of organisation_id,
lease_id on public.charges for each row
execute function app.assert_charge_lease_same_organisation ();

-- ---------------------------------------------------------------------------
-- Rule 1: append-only in the financial columns
-- ---------------------------------------------------------------------------
create or replace function app.deny_charge_rewrite () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'a charge is never deleted'
      using errcode = '42501',
            hint = 'Cancel it and raise a replacement (PRD §10.2).';
  end if;

  if new.amount_kobo <> old.amount_kobo
    or new.period_start <> old.period_start
    or new.period_end <> old.period_end
    or new.due_on <> old.due_on
    or new.sequence <> old.sequence
    or new.lease_id <> old.lease_id
    or new.organisation_id <> old.organisation_id
    or new.kind <> old.kind then
    raise exception 'a charge''s amount, period, due date and lease cannot be changed'
      using errcode = '42501',
            hint = 'Cancel it and raise a replacement (PRD §10.2).';
  end if;

  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'a cancelled charge cannot be reopened'
      using errcode = '42501',
            hint = 'Raise a replacement charge instead.';
  end if;

  return new;
end;
$$;

create trigger charges_append_only
before update or delete on public.charges for each row
execute function app.deny_charge_rewrite ();

-- Money changing is the first category ORG-5 names.
create trigger charges_audit
after insert or update on public.charges for each row
execute function app.audit_row_change ('charge');

-- ---------------------------------------------------------------------------
-- Generating a schedule
--
-- The date arithmetic lives in TypeScript (leases/domain/schedule.ts) and is
-- not repeated here. Writing it twice would give a tenant's schedule two
-- definitions, and the day they disagreed the ledger would be wrong in a way
-- nobody could explain. What this function does instead is check the *shape*
-- of what it was handed — coverage, contiguity, numbering, amounts — which it
-- can do without knowing how a quarter is counted.
--
-- Invoker rights, not security definer: the caller's RLS policies decide
-- whether they may raise a charge on this lease, exactly as they would for a
-- direct insert.
-- ---------------------------------------------------------------------------
create or replace function app.insert_lease_charges (target_lease_id uuid, charge_rows jsonb) returns integer language plpgsql
set
  search_path = '' as $$
declare
  lease_record record;
  row_count integer;
  first_start date;
  last_end date;
  highest_sequence integer;
  total_kobo bigint;
begin
  if charge_rows is null
    or jsonb_typeof(charge_rows) <> 'array'
    or jsonb_array_length(charge_rows) = 0 then
    raise exception 'a rent schedule needs at least one charge'
      using errcode = '22023';
  end if;

  select l.id, l.organisation_id, l.starts_on, l.ends_on, l.rent_kobo, l.rent_frequency
  into lease_record
  from public.leases l
  where l.id = target_lease_id;

  if not found then
    raise exception 'lease % does not exist, or is not yours to charge', target_lease_id
      using errcode = '42501';
  end if;

  -- Idempotency. Generating twice would double every tenant's arrears, and a
  -- retried request is the ordinary way that happens.
  if exists (
    select 1
    from public.charges c
    where c.lease_id = target_lease_id
      and c.kind = 'rent'
      and c.status <> 'cancelled'
  ) then
    raise exception 'lease % already has a rent schedule', target_lease_id
      using errcode = '23505',
            hint = 'Cancel the existing charges before raising replacements.';
  end if;

  insert into public.charges (
    organisation_id, lease_id, kind, sequence,
    period_start, period_end, due_on, amount_kobo,
    covers_partial_period, created_by
  )
  select
    lease_record.organisation_id,
    target_lease_id,
    'rent',
    (row_json ->> 'sequence')::integer,
    (row_json ->> 'period_start')::date,
    (row_json ->> 'period_end')::date,
    (row_json ->> 'due_on')::date,
    (row_json ->> 'amount_kobo')::bigint,
    coalesce((row_json ->> 'covers_partial_period')::boolean, false),
    auth.uid()
  from jsonb_array_elements(charge_rows) as row_json;

  select
    count(*),
    min(c.period_start),
    max(c.period_end),
    max(c.sequence),
    sum(c.amount_kobo)
  into row_count, first_start, last_end, highest_sequence, total_kobo
  from public.charges c
  where c.lease_id = target_lease_id
    and c.kind = 'rent'
    and c.status <> 'cancelled';

  -- Rule 3: the schedule covers the term exactly.
  if first_start <> lease_record.starts_on then
    raise exception 'the schedule starts on % but the lease starts on %',
      first_start, lease_record.starts_on using errcode = '23514';
  end if;

  if last_end <> lease_record.ends_on then
    raise exception 'the schedule ends on % but the lease ends on %',
      last_end, lease_record.ends_on using errcode = '23514';
  end if;

  if highest_sequence <> row_count then
    raise exception 'the schedule is numbered 1 to % but has % charges',
      highest_sequence, row_count using errcode = '23514';
  end if;

  -- Overlaps are impossible (the exclusion constraint); gaps are not.
  if exists (
    select 1
    from (
      select
        c.period_start,
        lag(c.period_end) over (order by c.sequence) as previous_end
      from public.charges c
      where c.lease_id = target_lease_id
        and c.kind = 'rent'
        and c.status <> 'cancelled'
    ) ordered
    where ordered.previous_end is not null
      and ordered.period_start <> ordered.previous_end + 1
  ) then
    raise exception 'the schedule leaves a gap between periods'
      using errcode = '23514',
            hint = 'Each period must begin the day after the previous one ends.';
  end if;

  -- Only the last period may be short: a gap in the middle of a term would
  -- otherwise be expressible as two partial periods either side of it.
  if exists (
    select 1
    from public.charges c
    where c.lease_id = target_lease_id
      and c.kind = 'rent'
      and c.status <> 'cancelled'
      and c.covers_partial_period
      and c.sequence <> highest_sequence
  ) then
    raise exception 'only the last period of a term can be a part period'
      using errcode = '23514';
  end if;

  if lease_record.rent_frequency = 'irregular' then
    -- The instalments are whatever was agreed; together they are the rent.
    if total_kobo <> lease_record.rent_kobo then
      raise exception 'the instalments total % kobo but the lease rent is % kobo',
        total_kobo, lease_record.rent_kobo using errcode = '23514';
    end if;
  else
    if exists (
      select 1
      from public.charges c
      where c.lease_id = target_lease_id
        and c.kind = 'rent'
        and c.status <> 'cancelled'
        and not c.covers_partial_period
        and c.amount_kobo <> lease_record.rent_kobo
    ) then
      raise exception 'a full period must be charged at the lease rent of % kobo',
        lease_record.rent_kobo using errcode = '23514';
    end if;

    -- A part period may be charged in full or pro-rated once there is a
    -- rounding rule, but never more than a full period.
    if exists (
      select 1
      from public.charges c
      where c.lease_id = target_lease_id
        and c.kind = 'rent'
        and c.status <> 'cancelled'
        and c.covers_partial_period
        and (
          c.amount_kobo > lease_record.rent_kobo
          or c.amount_kobo = 0
        )
    ) then
      raise exception 'a part period must be charged between 1 kobo and the full rent'
        using errcode = '23514';
    end if;
  end if;

  return row_count;
end;
$$;

comment on function app.insert_lease_charges is 'RENT-1. Validates the shape of a schedule computed in the application and inserts it. The date arithmetic is not duplicated here on purpose.';

-- ---------------------------------------------------------------------------
-- Activation
--
-- One transaction, because a lease that went active while its charge insert
-- failed owes nothing and looks fine.
-- ---------------------------------------------------------------------------
create or replace function public.activate_lease (target_lease_id uuid, charge_rows jsonb) returns integer language plpgsql
set
  search_path = '' as $$
declare
  current_status public.lease_status;
  charges_created integer;
begin
  select l.status into current_status
  from public.leases l
  where l.id = target_lease_id;

  if not found then
    raise exception 'lease % does not exist, or is not yours to activate', target_lease_id
      using errcode = '42501';
  end if;

  if current_status <> 'draft' then
    raise exception 'a % lease cannot be activated', current_status
      using errcode = '23514',
            hint = 'Only a draft lease can be activated.';
  end if;

  -- Charges first: activation occupies the unit, and the occupancy trigger
  -- should fire on a lease that is complete.
  charges_created := app.insert_lease_charges(target_lease_id, charge_rows);

  update public.leases
  set status = 'active'
  where id = target_lease_id;

  return charges_created;
end;
$$;

comment on function public.activate_lease is 'RENT-1, LEASE-3. Activates a draft lease and raises its rent schedule in one transaction.';

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.charges enable row level security;

-- Whoever can reach the lease can see what it charges: staff within their
-- scope, the landlord of the property, and the tenant themselves. A tenant who
-- cannot see what they owe will not pay it.
create policy charges_select_reachable on public.charges for
select
  to authenticated using (app.can_reach_lease (lease_id));

-- Raising and cancelling a charge is a money action. An accountant is included
-- where they are not for lease terms: correcting a mis-raised charge is their
-- work, and the append-only rules mean the correction leaves a trail.
create policy charges_write_staff on public.charges for all to authenticated using (
  app.has_role (
    organisation_id,
    array[
      'owner',
      'admin',
      'property_manager',
      'accountant'
    ]::public.app_role[]
  )
  and app.can_reach_lease (lease_id)
)
with
  check (
    app.has_role (
      organisation_id,
      array[
        'owner',
        'admin',
        'property_manager',
        'accountant'
      ]::public.app_role[]
    )
  );

-- No delete policy, and the append-only trigger behind it. Both, because a
-- policy can be replaced by a later migration and a trigger is harder to
-- remove by accident.
-- ===========================================================================
-- Grants
-- ===========================================================================
grant
select
,
  insert,
update on public.charges to authenticated;

grant
execute on function app.insert_lease_charges (uuid, jsonb) to authenticated;

grant
execute on function public.activate_lease (uuid, jsonb) to authenticated;

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

-- ---------------------------------------------------------------------------
-- create_lease_with_tenant, now able to activate properly
--
-- Dropped and recreated rather than `create or replace`d: the new parameter
-- changes the signature, and `create or replace` would leave the old function
-- in place as an overload. A call that omitted the new argument would then be
-- ambiguous, which is a runtime failure in whichever client upgrades second.
--
-- Activating without a schedule is now refused. The flag existed before the
-- charges table did, and a lease that went active with no charges was the
-- quiet failure this step exists to remove.
-- ---------------------------------------------------------------------------
drop function public.create_lease_with_tenant (
  uuid,
  uuid,
  uuid,
  date,
  date,
  bigint,
  public.rent_frequency,
  text,
  bigint,
  public.deposit_custodian,
  boolean
);

create or replace function public.create_lease_with_tenant (
  target_organisation_id uuid,
  target_unit_id uuid,
  target_tenant_id uuid,
  lease_starts_on date,
  lease_ends_on date,
  lease_rent_kobo bigint,
  lease_rent_frequency public.rent_frequency default 'annual',
  lease_reference text default null,
  deposit_amount_kobo bigint default null,
  deposit_custodian public.deposit_custodian default 'agency',
  activate boolean default false,
  lease_charges jsonb default null
) returns uuid language plpgsql
set
  search_path = '' as $$
declare
  new_lease_id uuid;
begin
  if activate and lease_charges is null then
    raise exception 'a lease cannot be activated without its rent schedule'
      using errcode = '22023',
            hint = 'Pass lease_charges, or create the lease as a draft.';
  end if;

  insert into public.leases (
    organisation_id, unit_id, reference, status,
    starts_on, ends_on, rent_kobo, rent_frequency, created_by
  )
  values (
    target_organisation_id, target_unit_id,
    nullif(btrim(coalesce(lease_reference, '')), ''),
    'draft',
    lease_starts_on, lease_ends_on, lease_rent_kobo, lease_rent_frequency,
    auth.uid()
  )
  returning id into new_lease_id;

  insert into public.lease_parties (organisation_id, lease_id, tenant_id, role)
  values (target_organisation_id, new_lease_id, target_tenant_id, 'tenant');

  if deposit_amount_kobo is not null then
    insert into public.lease_deposits (
      organisation_id, lease_id, amount_kobo, custodian, status
    )
    values (
      target_organisation_id, new_lease_id, deposit_amount_kobo,
      deposit_custodian, 'expected'
    );
  end if;

  -- Activated after the party and the charges exist, so the "active lease
  -- needs a tenant" check passes and the unit occupancy trigger fires with the
  -- lease complete.
  if activate then
    perform app.insert_lease_charges(new_lease_id, lease_charges);
    update public.leases set status = 'active' where id = new_lease_id;
  end if;

  return new_lease_id;
end;
$$;

comment on function public.create_lease_with_tenant is 'LEASE-12, RENT-1. Creates a lease, its tenant party and its deposit in one transaction, and raises the rent schedule when activating.';

grant
execute on function public.create_lease_with_tenant (
  uuid,
  uuid,
  uuid,
  date,
  date,
  bigint,
  public.rent_frequency,
  text,
  bigint,
  public.deposit_custodian,
  boolean,
  jsonb
) to authenticated;
