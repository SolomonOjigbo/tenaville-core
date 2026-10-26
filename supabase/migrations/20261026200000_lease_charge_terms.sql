-- TV-154: the non-rent charges a tenancy agrees (LEASE-2, RENT-1).
--
-- LEASE-2 asks for a lease with "rent, payment frequency, due dates, deposit
-- and other charges". The other charges had no representation: `charge_kind`
-- held 'rent' alone, so a service charge could not be billed through the
-- product at all, and an agency that bills one — which in Lagos is most of
-- them — kept that part in a spreadsheet. A tenant then receives two
-- statements that do not reconcile, which is the problem this product exists
-- to remove.
--
-- A term is the agreement; the charges are its instalments. Separating them is
-- what makes a recurring charge possible: "₦120,000 a year for the service
-- charge, quarterly" is one row that produces four charges, and the row is
-- what a renewal copies and a dispute reads.
--
-- The charges themselves are ordinary rows in `charges`. That is deliberate
-- and is most of the value of this ticket: allocation (TV-023), arrears ageing
-- (TV-031) and landlord statements (TV-032) are written against `charges`, so
-- a service charge is allocated to, aged and reported by the same code as rent
-- without any of it knowing that service charges exist.
-- ---------------------------------------------------------------------------
-- The agreed term
-- ---------------------------------------------------------------------------
create table public.lease_charge_terms (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  lease_id uuid not null references public.leases (id) on delete restrict,
  kind public.charge_kind not null,
  -- What the tenancy calls it. Two service charges on one lease are ordinary —
  -- an estate levy and a waste charge, say — and the tenant needs to know
  -- which is which on a receipt.
  description text not null check (length(btrim(description)) between 1 and 200),
  -- The amount of one instalment, in integer kobo (PRD §10.1). For 'one_off'
  -- it is the whole charge.
  amount_kobo bigint not null check (amount_kobo > 0),
  frequency public.charge_frequency not null,
  -- The term's own dates, which need not be the lease's: a service charge
  -- agreed halfway through a tenancy starts halfway through it.
  starts_on date not null,
  ends_on date not null,
  due_day smallint check (due_day between 1 and 28),
  -- Set when the instalments have been raised, which freezes the terms.
  raised_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint lease_charge_terms_dates_ordered check (ends_on >= starts_on),
  -- Rent has its own terms on the lease, and two places to state the rent
  -- would eventually disagree.
  constraint lease_charge_terms_not_rent check (kind <> 'rent'),
  -- A due day is meaningless for a single charge.
  constraint lease_charge_terms_due_day_is_periodic check (
    due_day is null
    or frequency <> 'one_off'
  )
);

comment on table public.lease_charge_terms is 'LEASE-2. A non-rent charge a tenancy agrees — service charge, utility, agreed fee — and how often it falls due. Its instalments are ordinary rows in charges.';

create index lease_charge_terms_lease_idx on public.lease_charge_terms (lease_id);

create trigger lease_charge_terms_touch_updated_at
before update on public.lease_charge_terms for each row
execute function app.touch_updated_at ();

-- A financial term of a tenancy, audited like the rent is (ORG-5).
create trigger lease_charge_terms_audit
after insert or update or delete on public.lease_charge_terms for each row
execute function app.audit_row_change ('lease_charge_term');

-- ---------------------------------------------------------------------------
-- A term belongs to its lease, and sits inside it
-- ---------------------------------------------------------------------------
create or replace function app.assert_charge_term_within_lease () returns trigger language plpgsql
set
  search_path = '' as $$
declare
  lease_record record;
begin
  select l.organisation_id, l.starts_on, l.ends_on into lease_record
  from public.leases l
  where l.id = new.lease_id;

  if not found then
    raise exception 'lease % does not exist', new.lease_id using errcode = '23503';
  end if;

  if lease_record.organisation_id <> new.organisation_id then
    raise exception 'a charge term must belong to the same organisation as its lease'
      using errcode = '23514';
  end if;

  -- A charge for time the tenancy does not cover is a charge nobody agreed to.
  if new.starts_on < lease_record.starts_on or new.ends_on > lease_record.ends_on then
    raise exception 'a charge term must sit inside the tenancy, which runs % to %',
      lease_record.starts_on, lease_record.ends_on
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger lease_charge_terms_within_lease
before insert or update of organisation_id,
lease_id,
starts_on,
ends_on on public.lease_charge_terms for each row
execute function app.assert_charge_term_within_lease ();

-- ---------------------------------------------------------------------------
-- Terms freeze once their instalments exist
--
-- Charges are append-only, so a term whose amount changed after the fact would
-- describe a set of charges that no longer matches it. Changing what a tenant
-- pays means cancelling the charges and raising a new term, which leaves the
-- trail a dispute needs.
-- ---------------------------------------------------------------------------
create or replace function app.deny_raised_charge_term_rewrite () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.raised_at is not null then
      raise exception 'a charge term with instalments raised cannot be deleted'
        using errcode = '42501',
              hint = 'Cancel its charges instead (PRD §10.2).';
    end if;
    return old;
  end if;

  if old.raised_at is null then
    return new;
  end if;

  if new.amount_kobo <> old.amount_kobo
    or new.frequency <> old.frequency
    or new.starts_on <> old.starts_on
    or new.ends_on <> old.ends_on
    or new.kind <> old.kind
    or new.lease_id <> old.lease_id then
    raise exception 'the terms of a charge with instalments raised cannot be changed'
      using errcode = '42501',
            hint = 'Cancel its charges and agree a new term (PRD §10.2).';
  end if;

  return new;
end;
$$;

create trigger lease_charge_terms_freeze_when_raised
before update or delete on public.lease_charge_terms for each row
execute function app.deny_raised_charge_term_rewrite ();

-- ---------------------------------------------------------------------------
-- Linking a charge to the term that produced it
-- ---------------------------------------------------------------------------
alter table public.charges
add column charge_term_id uuid references public.lease_charge_terms (id) on delete restrict;

comment on column public.charges.charge_term_id is 'The agreed term this instalment came from (TV-154). Null for rent, whose terms are on the lease itself.';

create index charges_term_idx on public.charges (charge_term_id)
where
  charge_term_id is not null;

-- Rent's terms live on the lease, so a rent charge has no term row; anything
-- else must say which agreement it came from, or a receipt cannot name it.
alter table public.charges
add constraint charges_non_rent_has_a_term check (
  (
    kind = 'rent'
    and charge_term_id is null
  )
  or (
    kind <> 'rent'
    and charge_term_id is not null
  )
);

-- ---------------------------------------------------------------------------
-- Overlap protection, now per agreement rather than per kind
--
-- The original constraint keyed on (lease, kind, period), which is right for
-- rent and wrong the moment a lease has two service charges: an estate levy
-- and a waste charge covering the same quarter are both 'service_charge', and
-- the old key called them a double billing.
--
-- Keying on the term instead fixes that without weakening rent. coalesce, not
-- a nullable column in the key: an exclusion constraint treats two nulls as
-- non-conflicting, so keying on charge_term_id directly would have silently
-- stopped protecting rent, which is the one thing this constraint was written
-- for. Falling back to lease_id means every rent charge on a lease still
-- shares one key.
-- ---------------------------------------------------------------------------
-- The sequence key has the same flaw, and missing it was caught by the test
-- for the constraint above: two service charges each numbering their
-- instalments 1 to 4 collided on `unique (lease_id, kind, sequence)`. An
-- instalment number means "2 of 4 of *this* agreement", so the agreement
-- belongs in the key.
--
-- A unique index rather than a table constraint, because a constraint cannot
-- be written over an expression. Not partial: a cancelled instalment keeps its
-- number, exactly as a voided receipt does (RENT-13), so a replacement takes
-- the next one rather than reusing a number that appeared on a tenant's
-- statement.
alter table public.charges
drop constraint charges_lease_id_kind_sequence_key;

create unique index charges_sequence_per_agreement on public.charges (
  (coalesce(charge_term_id, lease_id)),
  kind,
  sequence
);

alter table public.charges
drop constraint charges_no_overlapping_periods;

alter table public.charges
add constraint charges_no_overlapping_periods exclude using gist (
  (coalesce(charge_term_id, lease_id))
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
  (status <> 'cancelled');

-- A charge cannot be moved to another agreement either.
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
    or new.kind <> old.kind
    or new.charge_term_id is distinct from old.charge_term_id then
    raise exception 'a charge''s amount, period, due date, lease and agreement cannot be changed'
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

-- ---------------------------------------------------------------------------
-- One definition of "a schedule covers its term"
--
-- Extracted from app.insert_lease_charges when the second caller arrived.
-- Rent validates its amounts against the lease and a non-rent charge against
-- its term, but "no gap, starts where it should, ends where it should,
-- numbered 1 to n, only the last period short" is the same sentence for both —
-- and two copies of it would eventually differ on a detail nobody tested.
--
-- `is not distinct from` on the term, so that rent (term null) is matched by
-- the same predicate rather than needing its own branch.
-- ---------------------------------------------------------------------------
create or replace function app.assert_charge_schedule (
  target_lease_id uuid,
  target_kind public.charge_kind,
  target_term_id uuid,
  expected_start date,
  expected_end date
) returns integer language plpgsql
set
  search_path = '' as $$
declare
  row_count integer;
  first_start date;
  last_end date;
  highest_sequence integer;
begin
  select count(*), min(c.period_start), max(c.period_end), max(c.sequence)
  into row_count, first_start, last_end, highest_sequence
  from public.charges c
  where c.lease_id = target_lease_id
    and c.kind = target_kind
    and c.charge_term_id is not distinct from target_term_id
    and c.status <> 'cancelled';

  if first_start <> expected_start then
    raise exception 'the schedule starts on % but should start on %', first_start, expected_start
      using errcode = '23514';
  end if;

  if last_end <> expected_end then
    raise exception 'the schedule ends on % but should end on %', last_end, expected_end
      using errcode = '23514';
  end if;

  if highest_sequence <> row_count then
    raise exception 'the schedule is numbered 1 to % but has % charges', highest_sequence, row_count
      using errcode = '23514';
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
        and c.kind = target_kind
        and c.charge_term_id is not distinct from target_term_id
        and c.status <> 'cancelled'
    ) ordered
    where ordered.previous_end is not null
      and ordered.period_start <> ordered.previous_end + 1
  ) then
    raise exception 'the schedule leaves a gap between periods'
      using errcode = '23514',
            hint = 'Each period must begin the day after the previous one ends.';
  end if;

  -- Only the last period may be short, or a gap in the middle of a term would
  -- be expressible as two part periods either side of it.
  if exists (
    select 1
    from public.charges c
    where c.lease_id = target_lease_id
      and c.kind = target_kind
      and c.charge_term_id is not distinct from target_term_id
      and c.status <> 'cancelled'
      and c.covers_partial_period
      and c.sequence <> highest_sequence
  ) then
    raise exception 'only the last period of a term can be a part period'
      using errcode = '23514';
  end if;

  return row_count;
end;
$$;

comment on function app.assert_charge_schedule is 'RENT-1, LEASE-2. Checks that a set of charges covers its term exactly: no gap, right dates, numbered 1 to n, only the last period short.';

-- ---------------------------------------------------------------------------
-- Raising a term's instalments
-- ---------------------------------------------------------------------------
create or replace function app.insert_term_charges (target_term_id uuid, charge_rows jsonb) returns integer language plpgsql
set
  search_path = '' as $$
declare
  term public.lease_charge_terms;
  row_count integer;
begin
  if charge_rows is null
    or jsonb_typeof(charge_rows) <> 'array'
    or jsonb_array_length(charge_rows) = 0 then
    raise exception 'a charge term needs at least one instalment'
      using errcode = '22023';
  end if;

  select * into term
  from public.lease_charge_terms t
  where t.id = target_term_id;

  if not found then
    raise exception 'charge term % does not exist, or is not yours to raise', target_term_id
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.charges c
    where c.charge_term_id = target_term_id
      and c.status <> 'cancelled'
  ) then
    raise exception 'the instalments for this charge term have already been raised'
      using errcode = '23505',
            hint = 'Cancel them before raising replacements.';
  end if;

  insert into public.charges (
    organisation_id, lease_id, kind, charge_term_id, sequence,
    period_start, period_end, due_on, amount_kobo,
    covers_partial_period, created_by
  )
  select
    term.organisation_id,
    term.lease_id,
    term.kind,
    term.id,
    (row_json ->> 'sequence')::integer,
    (row_json ->> 'period_start')::date,
    (row_json ->> 'period_end')::date,
    (row_json ->> 'due_on')::date,
    (row_json ->> 'amount_kobo')::bigint,
    coalesce((row_json ->> 'covers_partial_period')::boolean, false),
    auth.uid()
  from jsonb_array_elements(charge_rows) as row_json;

  row_count := app.assert_charge_schedule(
    term.lease_id, term.kind, term.id, term.starts_on, term.ends_on
  );

  if term.frequency = 'one_off' then
    -- One charge for the whole term, at the agreed amount. Anything else is a
    -- schedule, and the term does not say it is one.
    if row_count <> 1 then
      raise exception 'a one-off charge is a single instalment, not %', row_count
        using errcode = '23514';
    end if;
  end if;

  -- No total to check, unlike an irregular rent: a term states one instalment
  -- amount and every instalment is that amount, so there is nothing a sum
  -- would tell us that the per-row check does not.
  if exists (
    select 1
    from public.charges c
    where c.charge_term_id = target_term_id
      and c.status <> 'cancelled'
      and not c.covers_partial_period
      and c.amount_kobo <> term.amount_kobo
  ) then
    raise exception 'each instalment of this charge is % kobo', term.amount_kobo
      using errcode = '23514';
  end if;

  -- A part period may be charged in full or less, never more: the same rule as
  -- rent, and the same open decision about pro-rating (20).
  if exists (
    select 1
    from public.charges c
    where c.charge_term_id = target_term_id
      and c.status <> 'cancelled'
      and c.covers_partial_period
      and (
        c.amount_kobo > term.amount_kobo
        or c.amount_kobo = 0
      )
  ) then
    raise exception 'a part period must be charged between 1 kobo and the full instalment'
      using errcode = '23514';
  end if;

  update public.lease_charge_terms
  set
    raised_at = now()
  where id = target_term_id;

  return row_count;
end;
$$;

comment on function app.insert_term_charges is 'LEASE-2. Validates and inserts the instalments of an agreed non-rent charge, then freezes the term.';

-- ---------------------------------------------------------------------------
-- app.insert_lease_charges, now sharing the shape check
--
-- Replaced rather than left alone: two copies of "a schedule covers its term"
-- would drift, and the rent path is the one with tests to catch a mistake in
-- the extraction.
-- ---------------------------------------------------------------------------
create or replace function app.insert_lease_charges (target_lease_id uuid, charge_rows jsonb) returns integer language plpgsql
set
  search_path = '' as $$
declare
  lease_record record;
  row_count integer;
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

  row_count := app.assert_charge_schedule(
    target_lease_id, 'rent', null, lease_record.starts_on, lease_record.ends_on
  );

  if lease_record.rent_frequency = 'irregular' then
    -- The instalments are whatever was agreed; together they are the rent.
    select sum(c.amount_kobo) into total_kobo
    from public.charges c
    where c.lease_id = target_lease_id
      and c.kind = 'rent'
      and c.status <> 'cancelled';

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

-- ---------------------------------------------------------------------------
-- Agreeing a charge and raising it, in one transaction
--
-- One call, because a term whose instalments failed to insert is an agreement
-- the tenant has not been billed for — and nothing on either screen would say
-- so. The dates and amounts are computed in TypeScript, as rent's are, and
-- checked here.
-- ---------------------------------------------------------------------------
create or replace function public.add_lease_charge_term (
  target_lease_id uuid,
  term_kind public.charge_kind,
  term_description text,
  term_amount_kobo bigint,
  term_frequency public.charge_frequency,
  term_starts_on date,
  term_ends_on date,
  charge_rows jsonb,
  term_due_day smallint default null
) returns uuid language plpgsql
set
  search_path = '' as $$
declare
  lease_organisation uuid;
  new_term_id uuid;
begin
  select l.organisation_id into lease_organisation
  from public.leases l
  where l.id = target_lease_id;

  if not found then
    raise exception 'lease % does not exist, or is not yours to charge', target_lease_id
      using errcode = '42501';
  end if;

  insert into public.lease_charge_terms (
    organisation_id, lease_id, kind, description, amount_kobo,
    frequency, starts_on, ends_on, due_day, created_by
  )
  values (
    lease_organisation, target_lease_id, term_kind, term_description, term_amount_kobo,
    term_frequency, term_starts_on, term_ends_on, term_due_day, auth.uid()
  )
  returning id into new_term_id;

  perform app.insert_term_charges(new_term_id, charge_rows);

  return new_term_id;
end;
$$;

comment on function public.add_lease_charge_term is 'LEASE-2. Agrees a non-rent charge and raises its instalments in one transaction.';

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.lease_charge_terms enable row level security;

-- Whoever can reach the lease can see what it charges. A tenant who cannot see
-- the service charge they are being billed will not pay it.
create policy lease_charge_terms_select_reachable on public.lease_charge_terms for
select
  to authenticated using (app.can_reach_lease (lease_id));

-- Agreeing a charge is a money action, so the same roles as the charges
-- themselves, including the accountant.
create policy lease_charge_terms_write_staff on public.lease_charge_terms for all to authenticated using (
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

-- ===========================================================================
-- Grants
-- ===========================================================================
grant
select
,
  insert,
update,
delete on public.lease_charge_terms to authenticated;

grant
execute on function app.insert_term_charges (uuid, jsonb) to authenticated;

grant
execute on function app.assert_charge_schedule (uuid, public.charge_kind, uuid, date, date) to authenticated;

grant
execute on function public.add_lease_charge_term (
  uuid,
  public.charge_kind,
  text,
  bigint,
  public.charge_frequency,
  date,
  date,
  jsonb,
  smallint
) to authenticated;

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
