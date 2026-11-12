-- R1 step 4: taking money in and issuing a receipt for it (RENT-2, RENT-3,
-- RENT-4, RENT-13, RENT-14; TV-022, TV-023, TV-024, TV-144).
--
-- This is the first migration in which money moves. Four rules make it safe,
-- and each is enforced here rather than in an application, because each is a
-- way an agency loses either money or trust:
--
--   1. A payment is append-only. Its amount, date, lease and method are frozen
--      at insert; a correction is a reversal row that points at what it
--      reverses, never an edit (PRD §10.2, RENT-4).
--   2. Allocations against a payment must sum to that payment, checked at
--      commit. Whether the split is 1 kobo or 1 million, the parts tie back to
--      the whole (PRD §10.4, §2.3 of the Sprint 4 decision record).
--   3. Receipt numbers come from a counter row incremented in the same
--      transaction as the receipt. A failed issue rolls the number back, so
--      there are no gaps; a void or reversal keeps its number (RENT-13).
--   4. The number is assigned by the server on the issue date in the
--      organisation's timezone, never by a client. Offline capture gets a
--      provisional reference elsewhere; this table holds only official numbers
--      (MOB-4).
--
-- What is deliberately absent: a stored paid balance on a charge. It is
-- derived from allocations, which are the source of truth (PRD §10.4). Also
-- absent is any credit ledger beyond an unallocated allocation row — applying
-- credit to a future charge is a later ticket, and inventing a balance table
-- now would create a second truth for it to disagree with.
-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type public.payment_method as enum(
  'cash',
  'bank_transfer',
  'pos',
  'cheque',
  'mobile_money',
  'other'
);

-- 'recorded' is money a staff member says they received; 'confirmed' is money
-- reconciled against a bank statement or provider event (RENT-2, R2 webhooks).
-- 'reversed' means the original row was corrected by a reversal payment.
create type public.payment_status as enum('recorded', 'confirmed', 'reversed');

create type public.receipt_status as enum('issued', 'void', 'reversed');

-- ---------------------------------------------------------------------------
-- organisations: the number prefix (RENT-13, §2.1 of the decision record)
--
-- One to five letters, chosen once. The branch segment comes from
-- branches.receipt_prefix and appears only where a branch has one, so the
-- first office is R-2026-00001 and a second branch is R-IKJ-2026-00001.
-- ---------------------------------------------------------------------------
alter table public.organisations
add column receipt_prefix text not null default 'R' check (receipt_prefix ~ '^[A-Z]{1,5}$');

comment on column public.organisations.receipt_prefix is 'RENT-13. Prefix on every receipt number. Locked once the first receipt is issued.';

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete restrict,
  branch_id uuid references public.branches (id) on delete restrict,
  lease_id uuid not null references public.leases (id) on delete restrict,
  -- Denormalised so a receipt and the cash-up can name the payer without
  -- walking the lease, and so RLS can stay a direct check. Optional: a payment
  -- can arrive from someone other than the named tenant.
  tenant_id uuid references public.tenants (id) on delete restrict,
  -- Integer kobo (PRD §10.1). Positive for money received; negative only on a
  -- reversal row, which references the payment it undoes.
  amount_kobo bigint not null,
  method public.payment_method not null,
  reference text check (length(btrim(reference)) between 1 and 120),
  -- The business date the money changed hands, not the time it was typed in
  -- (PRD §10.6). Used for cash-up; the receipt year comes from the issue date.
  paid_on date not null,
  status public.payment_status not null default 'recorded',
  -- Client-supplied UUID for offline writes and retried requests (PRD §10.5,
  -- MOB-3). Unique per organisation, so a replay returns the first payment.
  client_mutation_id uuid,
  reversal_of_id uuid references public.payments (id) on delete restrict,
  notes text,
  recorded_by uuid references auth.users (id) on delete set null,
  recorded_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users (id) on delete set null,
  reversed_at timestamptz,
  reversed_by uuid references auth.users (id) on delete set null,
  reversal_reason text check (length(btrim(reversal_reason)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint payments_amount_direction check (
    (
      reversal_of_id is null
      and amount_kobo > 0
    )
    or (
      reversal_of_id is not null
      and amount_kobo < 0
    )
  ),
  constraint payments_reversal_not_self check (reversal_of_id is distinct from id),
  constraint payments_confirmed_has_time check (
    status <> 'confirmed'
    or confirmed_at is not null
  ),
  constraint payments_reversed_has_detail check (
    status <> 'reversed'
    or (
      reversed_at is not null
      and reversal_reason is not null
    )
  )
);

comment on table public.payments is 'RENT-2, RENT-4. Money received. Append-only in its financial columns; a correction is a linked reversal row.';

-- One reversal per payment; NULLs are ordinary payments and are unconstrained.
create unique index payments_one_reversal_idx on public.payments (reversal_of_id)
where
  reversal_of_id is not null;

create unique index payments_client_mutation_idx on public.payments (organisation_id, client_mutation_id)
where
  client_mutation_id is not null;

create index payments_organisation_paid_idx on public.payments (organisation_id, paid_on);

create index payments_lease_idx on public.payments (lease_id, paid_on);

create trigger payments_touch_updated_at
before update on public.payments for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- payment_allocations
--
-- One row per charge a payment is applied to. A row with a null charge_id is
-- tenant credit: money received but not yet owed against a specific charge.
-- That is how an overpayment stays visible instead of becoming a negative
-- charge (PRD §10.4).
-- ---------------------------------------------------------------------------
create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete restrict,
  payment_id uuid not null references public.payments (id) on delete restrict,
  lease_id uuid not null references public.leases (id) on delete restrict,
  -- Null means unallocated tenant credit.
  charge_id uuid references public.charges (id) on delete restrict,
  amount_kobo bigint not null check (amount_kobo <> 0),
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- A charge is allocated against at most once per payment, and a payment has
  -- at most one credit row.
  unique nulls not distinct (payment_id, charge_id)
);

comment on table public.payment_allocations is 'RENT-3. Where a payment went. Null charge_id is tenant credit. The sum must equal the payment, checked at commit.';

create index payment_allocations_charge_idx on public.payment_allocations (charge_id)
where
  charge_id is not null;

create index payment_allocations_lease_idx on public.payment_allocations (lease_id);

-- ---------------------------------------------------------------------------
-- receipt_counters
--
-- A row per organisation, branch and year. Incremented by
-- app.next_receipt_number in the same transaction as the receipt, so a failed
-- issue cannot burn a number (the rejected `nextval` approach).
-- ---------------------------------------------------------------------------
create table public.receipt_counters (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete restrict,
  branch_id uuid references public.branches (id) on delete restrict,
  -- Generated so the unique key treats "no branch" as one value rather than
  -- relying on NULL comparison semantics.
  branch_key uuid generated always as (
    coalesce(
      branch_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  ) stored,
  year integer not null check (year between 2000 and 2100),
  last_number integer not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now(),
  unique (organisation_id, branch_key, year)
);

comment on table public.receipt_counters is 'RENT-13. The gapless allocator: one row per organisation, branch and year, incremented inside the issuing transaction.';

-- ---------------------------------------------------------------------------
-- receipts
-- ---------------------------------------------------------------------------
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete restrict,
  branch_id uuid references public.branches (id) on delete restrict,
  branch_key uuid generated always as (
    coalesce(
      branch_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  ) stored,
  lease_id uuid not null references public.leases (id) on delete restrict,
  -- One receipt per payment. A reversal keeps the receipt and marks it; a
  -- corrected payment is a new payment and therefore a new receipt.
  payment_id uuid not null references public.payments (id) on delete restrict,
  year integer not null check (year between 2000 and 2100),
  sequence integer not null check (sequence >= 1),
  prefix text not null check (prefix ~ '^[A-Z]{1,5}$'),
  -- The branch segment, when the branch has one. Stored so the printed number
  -- can be rebuilt without reading configuration that may since have changed.
  branch_code text check (branch_code ~ '^[A-Z0-9-]{1,12}$'),
  receipt_number text not null check (length(btrim(receipt_number)) between 5 and 80),
  status public.receipt_status not null default 'issued',
  -- The issue date in the organisation's timezone decides the year (§2.1), not
  -- the payment date.
  issued_on date not null,
  issued_at timestamptz not null default now(),
  issued_by uuid references auth.users (id) on delete set null,
  voided_at timestamptz,
  voided_by uuid references auth.users (id) on delete set null,
  void_reason text check (length(btrim(void_reason)) between 1 and 500),
  replaces_receipt_id uuid references public.receipts (id) on delete restrict,
  -- For the printed verification link. Unguessable, so the link is not an
  -- enumeration of an agency's receipts (PROP-9, DOC-7). A version 4 UUID is
  -- 122 random bits, rendered without hyphens as 32 hex characters; using the
  -- built-in avoids depending on pgcrypto being installed.
  verification_code text not null default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  unique (payment_id),
  unique (organisation_id, receipt_number),
  unique (organisation_id, branch_key, year, sequence),
  constraint receipts_void_has_detail check (
    status = 'issued'
    or (
      voided_at is not null
      and void_reason is not null
    )
  ),
  constraint receipts_replaces_not_self check (replaces_receipt_id is distinct from id)
);

comment on table public.receipts is 'RENT-13. One per payment, numbered by the server, never renumbered and never deleted.';

create unique index receipts_verification_code_idx on public.receipts (verification_code);

create index receipts_lease_idx on public.receipts (lease_id, issued_on);

create index receipts_organisation_issued_idx on public.receipts (organisation_id, issued_on);

-- ---------------------------------------------------------------------------
-- A payment belongs to its lease's organisation
-- ---------------------------------------------------------------------------
create or replace function app.assert_payment_scope () returns trigger language plpgsql
set
  search_path = '' as $$
declare
  lease_organisation uuid;
  tenant_organisation uuid;
  branch_organisation uuid;
begin
  select l.organisation_id into lease_organisation
  from public.leases l
  where l.id = new.lease_id;

  if lease_organisation is null then
    raise exception 'lease % does not exist', new.lease_id using errcode = '23503';
  end if;

  if lease_organisation <> new.organisation_id then
    raise exception 'a payment must belong to the same organisation as its lease'
      using errcode = '23514';
  end if;

  if new.tenant_id is not null then
    select t.organisation_id into tenant_organisation
    from public.tenants t
    where t.id = new.tenant_id;

    if tenant_organisation is null or tenant_organisation <> new.organisation_id then
      raise exception 'tenant % does not belong to organisation %', new.tenant_id, new.organisation_id
        using errcode = '23514';
    end if;

    if not exists (
      select 1 from public.lease_parties lp
      where lp.lease_id = new.lease_id and lp.tenant_id = new.tenant_id
    ) then
      raise exception 'tenant % is not a party to lease %', new.tenant_id, new.lease_id
        using errcode = '23514';
    end if;
  end if;

  if new.branch_id is not null then
    select b.organisation_id into branch_organisation
    from public.branches b
    where b.id = new.branch_id;

    if branch_organisation is null or branch_organisation <> new.organisation_id then
      raise exception 'branch % does not belong to organisation %', new.branch_id, new.organisation_id
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger payments_same_organisation
before insert or update of organisation_id,
lease_id,
tenant_id,
branch_id on public.payments for each row
execute function app.assert_payment_scope ();

-- ---------------------------------------------------------------------------
-- An allocation belongs to its payment's lease and charge
-- ---------------------------------------------------------------------------
create or replace function app.assert_allocation_scope () returns trigger language plpgsql
set
  search_path = '' as $$
declare
  payment_organisation uuid;
  payment_lease uuid;
  payment_amount bigint;
  charge_organisation uuid;
  charge_lease uuid;
begin
  select p.organisation_id, p.lease_id, p.amount_kobo
  into payment_organisation, payment_lease, payment_amount
  from public.payments p
  where p.id = new.payment_id;

  if payment_organisation is null then
    raise exception 'payment % does not exist', new.payment_id using errcode = '23503';
  end if;

  if new.organisation_id <> payment_organisation or new.lease_id <> payment_lease then
    raise exception 'an allocation must share its payment''s organisation and lease'
      using errcode = '23514';
  end if;

  -- Money out of a reversed payment is negative; money in is positive. Mixing
  -- the two would let a reversal appear to pay a charge.
  if (new.amount_kobo > 0) <> (payment_amount > 0) then
    raise exception 'an allocation must have the direction of its payment'
      using errcode = '23514';
  end if;

  if new.charge_id is not null then
    select c.organisation_id, c.lease_id into charge_organisation, charge_lease
    from public.charges c
    where c.id = new.charge_id;

    if charge_organisation is null then
      raise exception 'charge % does not exist', new.charge_id using errcode = '23503';
    end if;

    if charge_organisation <> new.organisation_id or charge_lease <> new.lease_id then
      raise exception 'a charge can only be paid by its own lease'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger payment_allocations_same_scope
before insert or update on public.payment_allocations for each row
execute function app.assert_allocation_scope ();

-- ---------------------------------------------------------------------------
-- Rule 2: the allocations sum to the payment, checked at commit
--
-- Deferred, because the payment is inserted before its allocations and both
-- are in one transaction. A constraint trigger also fires for payments created
-- outside the sanctioned RPC, so no payment can exist without its split.
-- ---------------------------------------------------------------------------
create or replace function app.assert_payment_fully_allocated () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  target_payment uuid;
  payment_amount bigint;
  allocated bigint;
begin
  if tg_op = 'DELETE' then
    target_payment := old.payment_id;
  elsif tg_table_name = 'payments' then
    target_payment := new.id;
  else
    target_payment := new.payment_id;
  end if;

  select p.amount_kobo into payment_amount
  from public.payments p
  where p.id = target_payment;

  if not found then
    return null;
  end if;

  select coalesce(sum(a.amount_kobo), 0) into allocated
  from public.payment_allocations a
  where a.payment_id = target_payment;

  if allocated <> payment_amount then
    raise exception 'payment % is allocated % kobo but is % kobo', target_payment, allocated, payment_amount
      using errcode = '23514',
            hint = 'Every payment must be fully allocated; an overpayment becomes a credit row.';
  end if;

  return null;
end;
$$;

create constraint trigger payments_fully_allocated
after insert on public.payments
deferrable initially deferred for each row
execute function app.assert_payment_fully_allocated ();

create constraint trigger payment_allocations_sum_to_payment
after insert or update or delete on public.payment_allocations
deferrable initially deferred for each row
execute function app.assert_payment_fully_allocated ();

-- ---------------------------------------------------------------------------
-- Rules 1 and 3: what may never change
-- ---------------------------------------------------------------------------
create or replace function app.deny_payment_rewrite () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'a payment is never deleted'
      using errcode = '42501',
            hint = 'Reverse it instead (PRD §10.2, RENT-4).';
  end if;

  if new.organisation_id <> old.organisation_id
    or new.branch_id is distinct from old.branch_id
    or new.lease_id <> old.lease_id
    or new.tenant_id is distinct from old.tenant_id
    or new.amount_kobo <> old.amount_kobo
    or new.method <> old.method
    or new.paid_on <> old.paid_on
    or new.reference is distinct from old.reference
    or new.client_mutation_id is distinct from old.client_mutation_id
    or new.reversal_of_id is distinct from old.reversal_of_id
    or new.recorded_by is distinct from old.recorded_by
    or new.recorded_at <> old.recorded_at then
    raise exception 'a payment''s amount, date, lease and method cannot be changed'
      using errcode = '42501',
            hint = 'Reverse it and record the correction (PRD §10.2, RENT-4).';
  end if;

  if new.status <> old.status then
    if not (
      (old.status = 'recorded' and new.status in ('confirmed', 'reversed'))
      or (old.status = 'confirmed' and new.status = 'reversed')
    ) then
      raise exception 'a payment cannot move from % to %', old.status, new.status
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger payments_append_only
before update or delete on public.payments for each row
execute function app.deny_payment_rewrite ();

create or replace function app.deny_allocation_rewrite () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  raise exception 'an allocation is never changed or removed'
    using errcode = '42501',
          hint = 'Reverse the payment and record a corrected one.';
end;
$$;

create trigger payment_allocations_append_only
before update or delete on public.payment_allocations for each row
execute function app.deny_allocation_rewrite ();

create or replace function app.deny_receipt_rewrite () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'a receipt is never deleted'
      using errcode = '42501',
            hint = 'Void or reverse it; the number stays.';
  end if;

  if new.organisation_id <> old.organisation_id
    or new.branch_id is distinct from old.branch_id
    or new.lease_id <> old.lease_id
    or new.payment_id <> old.payment_id
    or new.year <> old.year
    or new.sequence <> old.sequence
    or new.prefix <> old.prefix
    or new.branch_code is distinct from old.branch_code
    or new.receipt_number <> old.receipt_number
    or new.issued_on <> old.issued_on
    or new.issued_at <> old.issued_at
    or new.issued_by is distinct from old.issued_by
    or new.replaces_receipt_id is distinct from old.replaces_receipt_id
    or new.verification_code <> old.verification_code then
    raise exception 'a receipt''s number, payment and issue details cannot be changed'
      using errcode = '42501',
            hint = 'Void or reverse it; the number is never reused.';
  end if;

  if new.status <> old.status then
    if not (old.status = 'issued' and new.status in ('void', 'reversed')) then
      raise exception 'a receipt cannot move from % to %', old.status, new.status
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger receipts_append_only
before update or delete on public.receipts for each row
execute function app.deny_receipt_rewrite ();

-- RENT-13: the prefix is locked once a receipt exists, so numbers stay
-- consistent for the life of the organisation.
create or replace function app.deny_receipt_prefix_change () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if new.receipt_prefix is distinct from old.receipt_prefix
    and exists (
      select 1 from public.receipts r where r.organisation_id = old.id
    ) then
    raise exception 'the receipt prefix is locked once the first receipt is issued'
      using errcode = '42501',
            hint = 'Issue a new organisation if the prefix must change.';
  end if;

  return new;
end;
$$;

create trigger organisations_lock_receipt_prefix
before update of receipt_prefix on public.organisations for each row
execute function app.deny_receipt_prefix_change ();

-- ---------------------------------------------------------------------------
-- Rule 3: allocating the next number
--
-- Security definer because writers must not reach the counter table directly;
-- the increment has to happen atomically with the receipt insert and nothing
-- else. Executable only from the sanctioned RPCs below — revoking EXECUTE from
-- PUBLIC is what keeps a stray caller from burning a number.
-- ---------------------------------------------------------------------------
create or replace function app.next_receipt_number (
  target_organisation_id uuid,
  target_branch_id uuid,
  issue_year integer
) returns table (
  receipt_sequence integer,
  receipt_prefix text,
  receipt_branch_code text,
  receipt_number text
) language plpgsql security definer
set
  search_path = '' as $$
declare
  organisation_prefix text;
  branch_code text;
  next_number integer;
begin
  if issue_year < 2000 or issue_year > 2100 then
    raise exception 'issue year % is outside the supported range', issue_year
      using errcode = '22023';
  end if;

  select o.receipt_prefix into organisation_prefix
  from public.organisations o
  where o.id = target_organisation_id;

  if not found then
    raise exception 'organisation % does not exist', target_organisation_id
      using errcode = '23503';
  end if;

  if target_branch_id is not null then
    select nullif(btrim(b.receipt_prefix), '') into branch_code
    from public.branches b
    where b.id = target_branch_id
      and b.organisation_id = target_organisation_id;

    if not found then
      raise exception 'branch % does not belong to organisation %',
        target_branch_id, target_organisation_id using errcode = '23503';
    end if;
  end if;

  insert into public.receipt_counters as counters (
    organisation_id, branch_id, year, last_number
  )
  values (target_organisation_id, target_branch_id, issue_year, 1)
  on conflict (organisation_id, branch_key, year)
  do update
    set last_number = counters.last_number + 1,
        updated_at = now()
  returning last_number into next_number;
  receipt_sequence := next_number;
  receipt_prefix := organisation_prefix;
  receipt_branch_code := branch_code;
  receipt_number := organisation_prefix
    || '-' || coalesce(branch_code || '-', '')
    || issue_year::text
    || '-' || lpad(next_number::text, 5, '0');
  return next;
end;
$$;

comment on function app.next_receipt_number is 'RENT-13. Allocates the next number for an organisation/branch/year inside the caller''s transaction, so a rollback leaves no gap.';

revoke all on function app.next_receipt_number (uuid, uuid, integer)
from
  public;

revoke all on function app.next_receipt_number (uuid, uuid, integer)
from
  anon,
  authenticated;

-- ---------------------------------------------------------------------------
-- Rule 4: recording a payment and issuing its receipt in one transaction
--
-- Security definer so the counter can be incremented atomically and the
-- insert cannot be half-done. Every access decision the RLS policies would
-- have made is made explicitly here, because definer rights bypass them.
--
-- Allocation order is oldest charge first (PRD §10.4). An explicit split is
-- accepted for the permissioned override (RENT-14), but it may not exceed what
-- a charge still owes, and any remainder becomes tenant credit.
-- ---------------------------------------------------------------------------
create or replace function public.record_payment (
  target_organisation_id uuid,
  target_lease_id uuid,
  payment_amount_kobo bigint,
  payment_method public.payment_method,
  explicit_allocations jsonb default null,
  payment_paid_on date default null,
  payment_reference text default null,
  payment_client_mutation_id uuid default null,
  payment_branch_id uuid default null,
  payment_tenant_id uuid default null
) returns table (
  payment_id uuid,
  receipt_id uuid,
  receipt_number text
) language plpgsql security definer
set
  search_path = '' as $$
declare
  acting_user uuid := auth.uid();
  lease_organisation uuid;
  organisation_timezone text;
  issue_date date;
  issue_year integer;
  new_payment_id uuid;
  new_receipt_id uuid;
  issued_number text;
  allocated_sequence integer;
  allocated_prefix text;
  allocated_branch_code text;
  remaining bigint;
  declared_total bigint;
  allocation_item jsonb;
  allocation_charge uuid;
  allocation_amount bigint;
  charge_outstanding bigint;
  charge_row record;
  existing_payment uuid;
  existing_receipt uuid;
  existing_number text;
begin
  if acting_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not app.has_role(
    target_organisation_id,
    array['owner', 'admin', 'property_manager', 'accountant']::public.app_role[]
  ) then
    raise exception 'you may not record payments for this organisation'
      using errcode = '42501';
  end if;

  select l.organisation_id into lease_organisation
  from public.leases l
  where l.id = target_lease_id;

  if lease_organisation is null or lease_organisation <> target_organisation_id then
    raise exception 'lease % does not belong to organisation %',
      target_lease_id, target_organisation_id using errcode = '42501';
  end if;

  if not app.can_reach_lease(target_lease_id) then
    raise exception 'lease % is outside your assignment', target_lease_id
      using errcode = '42501';
  end if;

  if payment_amount_kobo is null or payment_amount_kobo <= 0 then
    raise exception 'a payment must be greater than zero kobo'
      using errcode = '22023';
  end if;

  if payment_reference is not null and length(btrim(payment_reference)) not between 1 and 120 then
    raise exception 'a payment reference must be between 1 and 120 characters'
      using errcode = '22023';
  end if;

  -- Idempotency: a retried sync returns the payment and receipt it already
  -- created instead of taking a second number (PRD §10.5, MOB-3).
  if payment_client_mutation_id is not null then
    select p.id, r.id, r.receipt_number
    into existing_payment, existing_receipt, existing_number
    from public.payments p
    left join public.receipts r on r.payment_id = p.id
    where p.organisation_id = target_organisation_id
      and p.client_mutation_id = payment_client_mutation_id;

    if existing_payment is not null then
      payment_id := existing_payment;
      receipt_id := existing_receipt;
      receipt_number := existing_number;
      return next;
      return;
    end if;
  end if;

  select o.timezone into organisation_timezone
  from public.organisations o
  where o.id = target_organisation_id;

  issue_date := (now() at time zone coalesce(organisation_timezone, 'Africa/Lagos'))::date;
  issue_year := extract(year from issue_date)::integer;

  insert into public.payments (
    organisation_id, branch_id, lease_id, tenant_id,
    amount_kobo, method, reference, paid_on,
    client_mutation_id, recorded_by
  )
  values (
    target_organisation_id, payment_branch_id, target_lease_id, payment_tenant_id,
    payment_amount_kobo, payment_method,
    nullif(btrim(coalesce(payment_reference, '')), ''),
    coalesce(payment_paid_on, issue_date),
    payment_client_mutation_id, acting_user
  )
  returning id into new_payment_id;

  if explicit_allocations is not null then
    if jsonb_typeof(explicit_allocations) <> 'array'
      or jsonb_array_length(explicit_allocations) = 0 then
      raise exception 'explicit allocations must be a non-empty array'
        using errcode = '22023';
    end if;

    select coalesce(sum((item ->> 'amount_kobo')::bigint), 0) into declared_total
    from jsonb_array_elements(explicit_allocations) as item;

    if declared_total > payment_amount_kobo then
      raise exception 'allocations total % kobo but the payment is % kobo',
        declared_total, payment_amount_kobo
        using errcode = '23514',
              hint = 'An allocation cannot exceed the payment.';
    end if;

    for allocation_item in
      select * from jsonb_array_elements(explicit_allocations)
    loop
      allocation_charge := nullif(btrim(coalesce(allocation_item ->> 'charge_id', '')), '')::uuid;
      allocation_amount := (allocation_item ->> 'amount_kobo')::bigint;

      if allocation_charge is null then
        raise exception 'credit is the unallocated remainder and cannot be listed explicitly'
          using errcode = '22023';
      end if;

      if allocation_amount is null or allocation_amount <= 0 then
        raise exception 'each allocation must be greater than zero kobo'
          using errcode = '22023';
      end if;

      select c.amount_kobo - coalesce(sum(a.amount_kobo), 0)
      into charge_outstanding
      from public.charges c
      left join public.payment_allocations a on a.charge_id = c.id
      where c.id = allocation_charge
        and c.lease_id = target_lease_id
        and c.status = 'open'
      group by c.amount_kobo;

      if charge_outstanding is null then
        raise exception 'charge % is not an open charge on this lease', allocation_charge
          using errcode = '23503';
      end if;

      if allocation_amount > charge_outstanding then
        raise exception 'charge % owes % kobo, so it cannot be allocated % kobo',
          allocation_charge, charge_outstanding, allocation_amount
          using errcode = '23514',
                hint = 'Allocate the excess as credit instead.';
      end if;

      insert into public.payment_allocations (
        organisation_id, payment_id, lease_id, charge_id, amount_kobo, created_by
      )
      values (
        target_organisation_id, new_payment_id, target_lease_id,
        allocation_charge, allocation_amount, acting_user
      );
    end loop;

    remaining := payment_amount_kobo - declared_total;
  else
    -- Oldest charge first: due date, then period, then schedule number.
    remaining := payment_amount_kobo;

    for charge_row in
      select
        c.id,
        c.amount_kobo - coalesce(sum(a.amount_kobo), 0) as outstanding
      from public.charges c
      left join public.payment_allocations a on a.charge_id = c.id
      where c.lease_id = target_lease_id
        and c.status = 'open'
      group by c.id, c.amount_kobo, c.due_on, c.period_start, c.sequence
      having c.amount_kobo - coalesce(sum(a.amount_kobo), 0) > 0
      order by c.due_on, c.period_start, c.sequence
    loop
      exit when remaining <= 0;

      allocation_amount := least(remaining, charge_row.outstanding);

      insert into public.payment_allocations (
        organisation_id, payment_id, lease_id, charge_id, amount_kobo, created_by
      )
      values (
        target_organisation_id, new_payment_id, target_lease_id,
        charge_row.id, allocation_amount, acting_user
      );

      remaining := remaining - allocation_amount;
    end loop;
  end if;

  -- An overpayment is credit, not a negative charge (PRD §10.4).
  if remaining > 0 then
    insert into public.payment_allocations (
      organisation_id, payment_id, lease_id, charge_id, amount_kobo, note, created_by
    )
    values (
      target_organisation_id, new_payment_id, target_lease_id,
      null, remaining, 'Unallocated tenant credit', acting_user
    );
  end if;

  -- Number allocated last, after every other write has succeeded, so the lock
  -- is held as briefly as possible (§2.3 of the decision record). One call, in
  -- the same transaction: a failure anywhere above leaves no gap behind.
  select
    n.receipt_sequence, n.receipt_prefix, n.receipt_branch_code, n.receipt_number
  into allocated_sequence, allocated_prefix, allocated_branch_code, issued_number
  from app.next_receipt_number(
    target_organisation_id,
    payment_branch_id,
    issue_year
  ) as n;

  insert into public.receipts (
    organisation_id, branch_id, lease_id, payment_id,
    year, sequence, prefix, branch_code, receipt_number,
    issued_on, issued_by
  )
  values (
    target_organisation_id, payment_branch_id, target_lease_id, new_payment_id,
    issue_year, allocated_sequence, allocated_prefix, allocated_branch_code,
    issued_number, issue_date, acting_user
  )
  returning id into new_receipt_id;

  payment_id := new_payment_id;
  receipt_id := new_receipt_id;
  receipt_number := issued_number;
  return next;
end;
$$;

comment on function public.record_payment is 'RENT-2, RENT-3, RENT-13. Records a payment, allocates it oldest charge first (or as directed), and issues its receipt number in one transaction.';

-- ---------------------------------------------------------------------------
-- Reversing a payment
--
-- A new negative payment that mirrors the original's allocations, so the
-- charge balances return to what they were without rewriting history. The
-- original receipt keeps its number and is marked reversed (RENT-13).
-- ---------------------------------------------------------------------------
create or replace function public.reverse_payment (target_payment_id uuid, reason text) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  acting_user uuid := auth.uid();
  original record;
  organisation_timezone text;
  reversal_date date;
  reversal_payment uuid;
begin
  if acting_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select p.id, p.organisation_id, p.lease_id, p.branch_id, p.tenant_id,
         p.amount_kobo, p.method, p.status, p.reversal_of_id
  into original
  from public.payments p
  where p.id = target_payment_id;

  if not found then
    raise exception 'payment % does not exist', target_payment_id using errcode = '23503';
  end if;

  if not app.has_role(
    original.organisation_id,
    array['owner', 'admin', 'property_manager', 'accountant']::public.app_role[]
  ) then
    raise exception 'you may not reverse payments for this organisation'
      using errcode = '42501';
  end if;

  if not app.can_reach_lease(original.lease_id) then
    raise exception 'lease % is outside your assignment', original.lease_id
      using errcode = '42501';
  end if;

  if original.reversal_of_id is not null then
    raise exception 'a reversal cannot itself be reversed'
      using errcode = '23514';
  end if;

  if original.status = 'reversed' then
    raise exception 'payment % is already reversed', target_payment_id
      using errcode = '23514';
  end if;

  if reason is null or length(btrim(reason)) not between 1 and 500 then
    raise exception 'a reversal needs a reason of 1 to 500 characters'
      using errcode = '22023';
  end if;

  select o.timezone into organisation_timezone
  from public.organisations o
  where o.id = original.organisation_id;

  reversal_date := (now() at time zone coalesce(organisation_timezone, 'Africa/Lagos'))::date;

  insert into public.payments (
    organisation_id, branch_id, lease_id, tenant_id,
    amount_kobo, method, paid_on, reversal_of_id,
    reversal_reason, recorded_by
  )
  values (
    original.organisation_id, original.branch_id, original.lease_id, original.tenant_id,
    0 - abs(original.amount_kobo), original.method, reversal_date, original.id,
    btrim(reason), acting_user
  )
  returning id into reversal_payment;

  insert into public.payment_allocations (
    organisation_id, payment_id, lease_id, charge_id, amount_kobo, note, created_by
  )
  select
    a.organisation_id, reversal_payment, a.lease_id, a.charge_id,
    0 - abs(a.amount_kobo), 'Reversal of payment ' || target_payment_id, acting_user
  from public.payment_allocations a
  where a.payment_id = target_payment_id;

  update public.payments
  set status = 'reversed',
      reversed_at = now(),
      reversed_by = acting_user,
      reversal_reason = btrim(reason)
  where id = target_payment_id;

  update public.receipts
  set status = 'reversed',
      voided_at = now(),
      voided_by = acting_user,
      void_reason = btrim(reason)
  where payment_id = target_payment_id
    and status = 'issued';

  return reversal_payment;
end;
$$;

comment on function public.reverse_payment is 'RENT-4. Records a linked negative payment and marks the original and its receipt reversed; nothing is rewritten or renumbered.';

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.payments enable row level security;

alter table public.payment_allocations enable row level security;

alter table public.receipts enable row level security;

alter table public.receipt_counters enable row level security;

-- Whoever can reach the lease can see what was paid against it: staff within
-- their scope, the landlord, and the tenant themselves.
create policy payments_select_reachable on public.payments for
select
  to authenticated using (app.can_reach_lease (lease_id));

create policy payments_write_staff on public.payments for all to authenticated using (
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
    and app.can_reach_lease (lease_id)
  );

create policy payment_allocations_select_reachable on public.payment_allocations for
select
  to authenticated using (app.can_reach_lease (lease_id));

create policy payment_allocations_write_staff on public.payment_allocations for all to authenticated using (
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
    and app.can_reach_lease (lease_id)
  );

create policy receipts_select_reachable on public.receipts for
select
  to authenticated using (app.can_reach_lease (lease_id));

create policy receipts_write_staff on public.receipts for all to authenticated using (
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
    and app.can_reach_lease (lease_id)
  );

-- The counter is readable so the next number is not a mystery, but writable
-- only through app.next_receipt_number.
create policy receipt_counters_select_staff on public.receipt_counters for
select
  to authenticated using (app.is_staff (organisation_id));

-- ---------------------------------------------------------------------------
-- Auditing (ORG-5 names financial changes first)
-- ---------------------------------------------------------------------------
create trigger payments_audit
after insert or update on public.payments for each row
execute function app.audit_row_change ('payment');

create trigger payment_allocations_audit
after insert on public.payment_allocations for each row
execute function app.audit_row_change ('payment_allocation');

create trigger receipts_audit
after insert or update on public.receipts for each row
execute function app.audit_row_change ('receipt');

-- ===========================================================================
-- Grants
-- ===========================================================================
grant
select
,
  insert,
update on public.payments to authenticated;

grant
select
,
  insert on public.payment_allocations to authenticated;

grant
select
,
  insert,
update on public.receipts to authenticated;

grant
select
  on public.receipt_counters to authenticated;

-- Functions are executable by PUBLIC by default, which would let anon reach
-- the RPCs. Take that away first, then grant only the role that needs them.
revoke all on function public.record_payment (
  uuid,
  uuid,
  bigint,
  public.payment_method,
  jsonb,
  date,
  text,
  uuid,
  uuid,
  uuid
)
from
  public;

revoke all on function public.reverse_payment (uuid, text)
from
  public;

grant
execute on function public.record_payment (
  uuid,
  uuid,
  bigint,
  public.payment_method,
  jsonb,
  date,
  text,
  uuid,
  uuid,
  uuid
) to authenticated;

grant
execute on function public.reverse_payment (uuid, text) to authenticated;

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
