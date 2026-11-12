-- R1 step 5, first part: the landlord ledger (LEDGER-1, LEDGER-4, LEDGER-9).
--
-- The ledger is append-only and keeps client funds visibly separate from
-- agency income. Two things post to it:
--
--   * A receipt. When rent is received, the rent allocation credits the
--     landlord (client funds) and the mandate's commission is debited as
--     agency income, once per receipt. A trigger on receipts does this, so the
--     payment RPC cannot forget it and a replay cannot post twice.
--   * A remittance. Money paid out to a landlord is a debit against the
--     balance, recorded through one sanctioned function.
--
-- A reversal appends mirror-image adjustments; it never edits the original
-- entry. Statements are a later step in this release and freeze these entries
-- when they are issued.
-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type public.ledger_entry_kind as enum(
  'rent_collected',
  'commission',
  'remittance',
  'adjustment',
  'opening_balance'
);

-- The separation LEDGER-4 requires in the data model, not only in a report.
create type public.ledger_funds_class as enum('client_funds', 'agency_income');

-- ---------------------------------------------------------------------------
-- remittances
-- ---------------------------------------------------------------------------
create table public.remittances (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete restrict,
  landlord_id uuid not null references public.landlords (id) on delete restrict,
  amount_kobo bigint not null check (amount_kobo > 0),
  paid_on date not null,
  method public.payment_method not null,
  reference text check (length(btrim(reference)) between 1 and 120),
  notes text,
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.remittances is 'LEDGER-1. Money paid out to a landlord. Append-only; a correction is an adjustment.';

create index remittances_landlord_idx on public.remittances (organisation_id, landlord_id, paid_on);

-- ---------------------------------------------------------------------------
-- landlord_ledger_entries
--
-- amount_kobo is signed: positive means the agency owes the landlord more
-- (rent collected, opening balance); negative means it owes less (commission,
-- remittance, reversal of a credit). Balance is the sum, so nothing is stored.
-- ---------------------------------------------------------------------------
create table public.landlord_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete restrict,
  landlord_id uuid not null references public.landlords (id) on delete restrict,
  property_id uuid references public.properties (id) on delete restrict,
  payment_id uuid references public.payments (id) on delete restrict,
  charge_id uuid references public.charges (id) on delete restrict,
  remittance_id uuid references public.remittances (id) on delete restrict,
  entry_kind public.ledger_entry_kind not null,
  funds_class public.ledger_funds_class not null,
  amount_kobo bigint not null check (amount_kobo <> 0),
  occurred_on date not null,
  description text not null check (length(btrim(description)) between 1 and 300),
  -- The rate and base are frozen on the entry. A later mandate change must not
  -- rewrite what a landlord was charged last quarter (LEDGER-9).
  commission_rate_bps integer check (commission_rate_bps between 0 and 10000),
  commission_base_kobo bigint check (commission_base_kobo >= 0),
  reverses_entry_id uuid references public.landlord_ledger_entries (id) on delete restrict,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ledger_sign_matches_kind check (
    (
      entry_kind = 'rent_collected'
      and amount_kobo > 0
    )
    or (
      entry_kind = 'commission'
      and amount_kobo < 0
    )
    or (
      entry_kind = 'remittance'
      and amount_kobo < 0
    )
    or entry_kind in ('adjustment', 'opening_balance')
  ),
  constraint ledger_commission_is_agency_income check (
    (
      entry_kind = 'commission'
      and funds_class = 'agency_income'
    )
    or entry_kind = 'adjustment'
    or (
      entry_kind not in ('commission', 'adjustment')
      and funds_class = 'client_funds'
    )
  ),
  constraint ledger_commission_details check (
    entry_kind in ('commission', 'adjustment')
    or (
      commission_rate_bps is null
      and commission_base_kobo is null
    )
  ),
  constraint ledger_remittance_link check (
    entry_kind <> 'remittance'
    or remittance_id is not null
  ),
  constraint ledger_payment_link check (
    entry_kind not in ('rent_collected', 'commission')
    or payment_id is not null
  ),
  constraint ledger_reversal_link check (
    reverses_entry_id is null
    or entry_kind = 'adjustment'
  )
);

comment on table public.landlord_ledger_entries is 'LEDGER-1, LEDGER-4. Append-only landlord ledger. Client funds and agency income are separate columns; the balance is the sum of signed amounts.';

create index ledger_entries_landlord_idx on public.landlord_ledger_entries (
  organisation_id,
  landlord_id,
  occurred_on,
  created_at
);

create index ledger_entries_payment_idx on public.landlord_ledger_entries (payment_id)
where
  payment_id is not null;

-- ---------------------------------------------------------------------------
-- Append-only
-- ---------------------------------------------------------------------------
create or replace function app.deny_ledger_rewrite () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  raise exception 'a ledger entry is never changed or removed'
    using errcode = '42501',
          hint = 'Post an adjustment instead (LEDGER-8).';
end;
$$;

create trigger landlord_ledger_entries_append_only
before update or delete on public.landlord_ledger_entries for each row
execute function app.deny_ledger_rewrite ();

create or replace function app.deny_remittance_rewrite () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  raise exception 'a remittance is never changed or removed'
    using errcode = '42501',
          hint = 'Record an adjustment against the ledger instead.';
end;
$$;

create trigger remittances_append_only
before update or delete on public.remittances for each row
execute function app.deny_remittance_rewrite ();

-- ---------------------------------------------------------------------------
-- Posting a receipt: rent credit and commission
--
-- On the receipt, not on the payment: one receipt means one posting, and the
-- receipt number is the reference a landlord can see. The trigger is security
-- definer so writers cannot reach the ledger directly, and it runs inside the
-- payment transaction — a ledger failure rolls the receipt back.
-- ---------------------------------------------------------------------------
create or replace function app.post_receipt_ledger () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  payment_amount bigint;
  payment_date date;
  lease_organisation uuid;
  property_id uuid;
  receipt_landlord_id uuid;
  rental_base bigint;
  mandate public.management_mandates;
  commission_kobo bigint;
begin
  select p.amount_kobo, p.paid_on
  into payment_amount, payment_date
  from public.payments p
  where p.id = new.payment_id;

  -- A receipt is only issued for money in. Reversals have no receipt.
  if payment_amount is null or payment_amount <= 0 then
    return new;
  end if;

  select l.organisation_id, u.property_id, pr.landlord_id
  into lease_organisation, property_id, receipt_landlord_id
  from public.leases l
  join public.units u on u.id = l.unit_id
  join public.properties pr on pr.id = u.property_id
  where l.id = new.lease_id;

  if receipt_landlord_id is null then
    return new;
  end if;

  -- Commission is on rent only. Service charges and credits are not rental
  -- income, and the mandate's commission basis says "on rent received".
  select coalesce(sum(a.amount_kobo), 0)
  into rental_base
  from public.payment_allocations a
  join public.charges c on c.id = a.charge_id
  where a.payment_id = new.payment_id
    and c.kind = 'rent'
    and a.amount_kobo > 0;

  if rental_base <= 0 then
    return new;
  end if;

  insert into public.landlord_ledger_entries (
    organisation_id, landlord_id, property_id, payment_id,
    entry_kind, funds_class, amount_kobo, occurred_on, description, created_by
  )
  values (
    lease_organisation, receipt_landlord_id, property_id, new.payment_id,
    'rent_collected', 'client_funds', rental_base, payment_date,
    'Rent collected · receipt ' || new.receipt_number, auth.uid()
  );

  select * into mandate
  from public.management_mandates m
  where m.organisation_id = lease_organisation
    and m.landlord_id = receipt_landlord_id
    and m.starts_on <= payment_date
    and (m.ends_on is null or m.ends_on >= payment_date)
    and m.terminated_on is null
  order by m.starts_on desc
  limit 1;

  if not found or mandate.commission_basis <> 'on_receipt' then
    return new;
  end if;

  if mandate.commission_type = 'percentage' then
    commission_kobo := ((rental_base * coalesce(mandate.commission_rate_bps, 0)) + 5000) / 10000;
  else
    commission_kobo := coalesce(mandate.commission_fixed_kobo, 0);
  end if;

  if commission_kobo > 0 then
    insert into public.landlord_ledger_entries (
      organisation_id, landlord_id, property_id, payment_id,
      entry_kind, funds_class, amount_kobo, occurred_on, description,
      commission_rate_bps, commission_base_kobo, created_by
    )
    values (
      lease_organisation, receipt_landlord_id, property_id, new.payment_id,
      'commission', 'agency_income', 0 - commission_kobo, payment_date,
      'Commission · receipt ' || new.receipt_number,
      case when mandate.commission_type = 'percentage' then mandate.commission_rate_bps else null end,
      rental_base, auth.uid()
    );
  end if;

  return new;
end;
$$;

create trigger receipts_post_ledger
after insert on public.receipts for each row
execute function app.post_receipt_ledger ();

comment on function app.post_receipt_ledger is 'LEDGER-1, LEDGER-9. Posts rent collected and commission from one receipt, in the payment transaction.';

-- ---------------------------------------------------------------------------
-- Reversing a payment also reverses its ledger entries
--
-- Copied from the payments migration with one addition at the end: mirror each
-- original entry as an adjustment with the opposite sign. Nothing is edited.
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

  -- The ledger mirrors the money out. An adjustment, not an edit, so the
  -- landlord statement can show both the receipt and its correction.
  insert into public.landlord_ledger_entries (
    organisation_id, landlord_id, property_id, payment_id, charge_id,
    entry_kind, funds_class, amount_kobo, occurred_on, description,
    commission_rate_bps, commission_base_kobo, reverses_entry_id, created_by
  )
  select
    e.organisation_id, e.landlord_id, e.property_id, reversal_payment, e.charge_id,
    'adjustment', e.funds_class, 0 - e.amount_kobo, reversal_date,
    left('Reversal of ' || e.description, 300),
    e.commission_rate_bps, e.commission_base_kobo, e.id, acting_user
  from public.landlord_ledger_entries e
  where e.payment_id = target_payment_id;

  return reversal_payment;
end;
$$;

comment on function public.reverse_payment is 'RENT-4, LEDGER-1. Records a linked negative payment, reverses its receipt and mirrors its ledger entries as adjustments.';

-- ---------------------------------------------------------------------------
-- Remittances
-- ---------------------------------------------------------------------------
create or replace function public.record_remittance (
  target_organisation_id uuid,
  target_landlord_id uuid,
  remittance_amount_kobo bigint,
  remittance_paid_on date,
  remittance_method public.payment_method,
  remittance_reference text default null
) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  acting_user uuid := auth.uid();
  landlord_organisation uuid;
  new_remittance uuid;
begin
  if acting_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not app.has_role(
    target_organisation_id,
    array['owner', 'admin', 'accountant']::public.app_role[]
  ) then
    raise exception 'you may not record remittances for this organisation'
      using errcode = '42501';
  end if;

  select l.organisation_id into landlord_organisation
  from public.landlords l
  where l.id = target_landlord_id;

  if landlord_organisation is null or landlord_organisation <> target_organisation_id then
    raise exception 'landlord % does not belong to organisation %',
      target_landlord_id, target_organisation_id using errcode = '42501';
  end if;

  if remittance_amount_kobo is null or remittance_amount_kobo <= 0 then
    raise exception 'a remittance must be greater than zero kobo'
      using errcode = '22023';
  end if;

  if remittance_paid_on is null then
    raise exception 'a remittance needs the date it was paid'
      using errcode = '22023';
  end if;

  if remittance_reference is not null
    and length(btrim(remittance_reference)) not between 1 and 120 then
    raise exception 'a remittance reference must be between 1 and 120 characters'
      using errcode = '22023';
  end if;

  insert into public.remittances (
    organisation_id, landlord_id, amount_kobo, paid_on, method, reference, recorded_by
  )
  values (
    target_organisation_id, target_landlord_id, remittance_amount_kobo,
    remittance_paid_on, remittance_method,
    nullif(btrim(coalesce(remittance_reference, '')), ''), acting_user
  )
  returning id into new_remittance;

  insert into public.landlord_ledger_entries (
    organisation_id, landlord_id, remittance_id,
    entry_kind, funds_class, amount_kobo, occurred_on, description, created_by
  )
  values (
    target_organisation_id, target_landlord_id, new_remittance,
    'remittance', 'client_funds', 0 - remittance_amount_kobo, remittance_paid_on,
    'Remittance · ' || coalesce(nullif(btrim(coalesce(remittance_reference, '')), ''), remittance_paid_on::text),
    acting_user
  );

  return new_remittance;
end;
$$;

comment on function public.record_remittance is 'LEDGER-1. Records money paid to a landlord and debits the ledger in one transaction.';

-- ---------------------------------------------------------------------------
-- Auditing: money changing is what ORG-5 names first
-- ---------------------------------------------------------------------------
create trigger landlord_ledger_entries_audit
after insert on public.landlord_ledger_entries for each row
execute function app.audit_row_change ('landlord_ledger_entry');

create trigger remittances_audit
after insert on public.remittances for each row
execute function app.audit_row_change ('remittance');

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.remittances enable row level security;

alter table public.landlord_ledger_entries enable row level security;

create policy remittances_select_staff on public.remittances for
select
  to authenticated using (
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

create policy remittances_select_landlord on public.remittances for
select
  to authenticated using (
    landlord_id in (
      select
        app.current_landlord_ids ()
    )
  );

create policy landlord_ledger_select_staff on public.landlord_ledger_entries for
select
  to authenticated using (
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

create policy landlord_ledger_select_landlord on public.landlord_ledger_entries for
select
  to authenticated using (
    landlord_id in (
      select
        app.current_landlord_ids ()
    )
  );

-- ===========================================================================
-- Grants
-- ===========================================================================
grant
select
  on public.remittances to authenticated;

grant
select
  on public.landlord_ledger_entries to authenticated;

revoke all on function public.record_remittance (
  uuid,
  uuid,
  bigint,
  date,
  public.payment_method,
  text
)
from
  public;

grant
execute on function public.record_remittance (
  uuid,
  uuid,
  bigint,
  date,
  public.payment_method,
  text
) to authenticated;

revoke all on all tables in schema public
from
  anon;

revoke all on all functions in schema public
from
  anon;
