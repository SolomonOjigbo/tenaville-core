-- Billing lifecycle (BILL-1, BILL-2, BILL-3).
--
-- Entitlements already exist. This adds the paid half: a plan change is an
-- explicit, audited event; an invoice freezes what was sold; a payment is
-- append-only and moves the invoice to paid.
--
-- There is no card gateway here. Invoices are issued in naira and payments are
-- recorded against them, which is the honest first step for an agency paying by
-- transfer. A gateway can later record the same payment rows.
-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type public.billing_invoice_status as enum('draft', 'open', 'paid', 'void');

create type public.billing_invoice_line_kind as enum('subscription', 'unit_overage', 'adjustment');

create type public.subscription_change_kind as enum('upgrade', 'downgrade');

-- ---------------------------------------------------------------------------
-- Invoice numbering
--
-- A transactional counter, not max()+1: two owners changing plans at the same
-- moment must not receive the same invoice number. Gaps are possible if a
-- transaction rolls back; invoice numbers are references, not a statutory
-- gapless series.
-- ---------------------------------------------------------------------------
create table public.billing_invoice_counters (
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  invoice_year integer not null check (invoice_year between 2000 and 2200),
  last_number integer not null default 0 check (last_number >= 0),
  primary key (organisation_id, invoice_year)
);

alter table public.billing_invoice_counters enable row level security;

create policy billing_invoice_counters_select_admin on public.billing_invoice_counters for
select
  to authenticated using (app.is_org_admin (organisation_id));

create or replace function app.next_invoice_number (target_organisation_id uuid, target_year integer) returns text language plpgsql security definer
set
  search_path = '' as $$
declare
  next_number integer;
begin
  insert into public.billing_invoice_counters (
    organisation_id, invoice_year, last_number
  )
  values (target_organisation_id, target_year, 1)
  on conflict (organisation_id, invoice_year) do update
    set last_number = public.billing_invoice_counters.last_number + 1
  returning last_number into next_number;

  return 'INV-' || target_year::text || '-' || lpad(next_number::text, 4, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------
create table public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  invoice_number text not null check (length(btrim(invoice_number)) between 5 and 40),
  subscription_id uuid references public.subscriptions (id) on delete set null,
  plan_id text not null references public.plans (id) on delete restrict,
  period_start date not null,
  period_end date not null,
  status public.billing_invoice_status not null default 'open',
  currency text not null default 'NGN' check (currency = 'NGN'),
  subtotal_kobo bigint not null default 0 check (subtotal_kobo >= 0),
  total_kobo bigint not null default 0 check (total_kobo >= 0),
  amount_paid_kobo bigint not null default 0 check (amount_paid_kobo >= 0),
  issued_on date not null default current_date,
  due_on date,
  paid_at timestamptz,
  notes text check (length(btrim(notes)) between 1 and 2000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (organisation_id, invoice_number),
  constraint billing_invoices_period_ordered check (period_end >= period_start),
  constraint billing_invoices_paid_within_total check (amount_paid_kobo <= total_kobo),
  constraint billing_invoices_paid_recorded check (
    status <> 'paid'
    or paid_at is not null
  )
);

create index billing_invoices_org_idx on public.billing_invoices (organisation_id, issued_on desc);

create index billing_invoices_open_idx on public.billing_invoices (organisation_id, due_on)
where
  status = 'open';

create trigger billing_invoices_touch_updated_at
before update on public.billing_invoices for each row
execute function app.touch_updated_at ();

create table public.billing_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  invoice_id uuid not null references public.billing_invoices (id) on delete restrict,
  kind public.billing_invoice_line_kind not null,
  description text not null check (length(btrim(description)) between 2 and 300),
  quantity integer not null default 1 check (quantity > 0),
  unit_amount_kobo bigint not null check (unit_amount_kobo >= 0),
  amount_kobo bigint not null check (amount_kobo >= 0),
  created_at timestamptz not null default now()
);

create index billing_invoice_lines_invoice_idx on public.billing_invoice_lines (invoice_id);

create table public.billing_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  invoice_id uuid not null references public.billing_invoices (id) on delete restrict,
  amount_kobo bigint not null check (amount_kobo > 0),
  method text not null check (
    method in ('bank_transfer', 'card', 'cash', 'other')
  ),
  reference text check (length(btrim(reference)) between 1 and 200),
  paid_on date not null default current_date,
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index billing_invoice_payments_invoice_idx on public.billing_invoice_payments (invoice_id);

-- ---------------------------------------------------------------------------
-- Plan changes
-- ---------------------------------------------------------------------------
create table public.subscription_changes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions (id) on delete restrict,
  from_plan_id text not null references public.plans (id) on delete restrict,
  to_plan_id text not null references public.plans (id) on delete restrict,
  kind public.subscription_change_kind not null,
  effective_on date not null default current_date,
  invoice_id uuid references public.billing_invoices (id) on delete set null,
  reason text not null check (length(btrim(reason)) between 3 and 1000),
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index subscription_changes_org_idx on public.subscription_changes (organisation_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Creating one invoice for a plan period
-- ---------------------------------------------------------------------------
create or replace function app.create_plan_invoice (
  target_organisation_id uuid,
  target_subscription_id uuid,
  target_plan public.plans,
  target_period_start date,
  target_period_end date,
  target_description text,
  target_created_by uuid
) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  new_invoice_id uuid;
  number text;
begin
  number := app.next_invoice_number (target_organisation_id, extract(year from current_date)::integer);

  insert into public.billing_invoices (
    organisation_id, invoice_number, subscription_id, plan_id,
    period_start, period_end, status, subtotal_kobo, total_kobo,
    issued_on, due_on, created_by
  )
  values (
    target_organisation_id, number, target_subscription_id, target_plan.id,
    target_period_start, target_period_end, 'open',
    target_plan.price_kobo, target_plan.price_kobo,
    current_date, current_date + 7, target_created_by
  )
  returning id into new_invoice_id;

  insert into public.billing_invoice_lines (
    organisation_id, invoice_id, kind, description,
    quantity, unit_amount_kobo, amount_kobo
  )
  values (
    target_organisation_id, new_invoice_id, 'subscription',
    target_description, 1, target_plan.price_kobo, target_plan.price_kobo
  );

  return new_invoice_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Change plan (BILL-1, BILL-3)
-- ---------------------------------------------------------------------------
create or replace function public.change_subscription_plan (
  p_organisation_id uuid,
  p_plan_id text,
  p_reason text
) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  v_subscription public.subscriptions;
  v_old_plan public.plans;
  v_new_plan public.plans;
  v_kind public.subscription_change_kind;
  v_units integer;
  v_properties integer;
  v_users integer;
  v_invoice_id uuid;
  v_period_start date;
  v_period_end date;
begin
  if not app.has_role (p_organisation_id, array['owner']::public.app_role[]) then
    raise exception 'only the owner can change the plan' using errcode = '42501';
  end if;

  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'give a reason for changing the plan' using errcode = '22023';
  end if;

  select * into v_subscription
  from public.subscriptions
  where organisation_id = p_organisation_id;

  if v_subscription.id is null then
    raise exception 'this organisation has no subscription' using errcode = '23514';
  end if;

  select * into v_old_plan from public.plans where id = v_subscription.plan_id;
  select * into v_new_plan from public.plans where id = p_plan_id;

  if v_new_plan.id is null or not v_new_plan.is_public then
    raise exception 'that plan is not available' using errcode = '23514';
  end if;
  if v_new_plan.id = v_old_plan.id then
    raise exception 'the organisation is already on that plan' using errcode = '23514';
  end if;

  v_kind := case
    when v_new_plan.sort_order > v_old_plan.sort_order
      then 'upgrade'::public.subscription_change_kind
    else 'downgrade'::public.subscription_change_kind
  end;

  if v_kind = 'downgrade' then
    select count(*) into v_units
    from public.units
    where organisation_id = p_organisation_id and status <> 'inactive';

    select count(*) into v_properties
    from public.properties
    where organisation_id = p_organisation_id;

    select count(*) into v_users
    from public.memberships
    where organisation_id = p_organisation_id
      and status in ('active', 'invited')
      and role not in ('tenant', 'landlord');

    if app.limit_verdict (v_units, v_new_plan.unit_limit, v_new_plan.unit_overage_kobo) = 'refused' then
      raise exception 'the % plan includes % units, and this organisation has % active',
        v_new_plan.name, v_new_plan.unit_limit, v_units
        using errcode = '23514',
              hint = 'Upgrade instead, or set units you no longer manage to inactive.';
    end if;

    if app.limit_verdict (v_properties, v_new_plan.property_limit, null) = 'refused' then
      raise exception 'the % plan includes % properties, and this organisation has %',
        v_new_plan.name, v_new_plan.property_limit, v_properties
        using errcode = '23514';
    end if;

    if app.limit_verdict (v_users, v_new_plan.user_limit, v_new_plan.extra_user_kobo) = 'refused' then
      raise exception 'the % plan includes % users, and this organisation has %',
        v_new_plan.name, v_new_plan.user_limit, v_users
        using errcode = '23514';
    end if;
  end if;

  v_period_start := current_date;
  v_period_end := (
    current_date
    + case v_new_plan.billing_period
        when 'annual' then interval '1 year'
        else interval '1 month'
      end
    - interval '1 day'
  )::date;

  update public.subscriptions
  set
    plan_id = v_new_plan.id,
    units_included = v_new_plan.unit_limit,
    status = case
      when status = 'trialing' and v_new_plan.price_kobo > 0 then 'active'
      else status
    end,
    trial_ends_on = case
      when status = 'trialing' and v_new_plan.price_kobo > 0 then null
      else trial_ends_on
    end,
    current_period_start = case
      when status = 'trialing' and v_new_plan.price_kobo > 0 then v_period_start
      else coalesce(current_period_start, v_period_start)
    end,
    current_period_end = case
      when status = 'trialing' and v_new_plan.price_kobo > 0 then v_period_end
      else coalesce(current_period_end, v_period_end)
    end
  where id = v_subscription.id;

  if v_new_plan.price_kobo > 0 then
    v_invoice_id := app.create_plan_invoice (
      p_organisation_id,
      v_subscription.id,
      v_new_plan,
      v_period_start,
      v_period_end,
      case when v_kind = 'upgrade' then 'Upgrade to ' else 'Downgrade to ' end || v_new_plan.name,
      auth.uid ()
    );
  end if;

  insert into public.subscription_changes (
    organisation_id, subscription_id, from_plan_id, to_plan_id, kind,
    effective_on, invoice_id, reason, changed_by
  )
  values (
    p_organisation_id, v_subscription.id, v_old_plan.id, v_new_plan.id, v_kind,
    current_date, v_invoice_id, btrim(p_reason), auth.uid ()
  );

  return v_invoice_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Issue an invoice for a period, including unit overage (BILL-2)
-- ---------------------------------------------------------------------------
create or replace function public.generate_subscription_invoice (
  p_organisation_id uuid,
  p_period_start date,
  p_period_end date
) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  v_subscription public.subscriptions;
  v_plan public.plans;
  v_invoice_id uuid;
  v_reading public.usage_readings;
  v_overage_units integer;
  v_overage_kobo bigint;
  v_number text;
begin
  if not app.has_role (p_organisation_id, array['owner']::public.app_role[]) then
    raise exception 'only the owner can issue an invoice' using errcode = '42501';
  end if;

  if p_period_end < p_period_start then
    raise exception 'the invoice period is reversed' using errcode = '22023';
  end if;

  select * into v_subscription from public.subscriptions
  where organisation_id = p_organisation_id;
  if v_subscription.id is null then
    raise exception 'this organisation has no subscription' using errcode = '23514';
  end if;

  select * into v_plan from public.plans where id = v_subscription.plan_id;

  if exists (
    select 1 from public.billing_invoices
    where organisation_id = p_organisation_id
      and period_start = p_period_start
      and period_end = p_period_end
      and status <> 'void'
  ) then
    raise exception 'an invoice already exists for that period' using errcode = '23514';
  end if;

  v_number := app.next_invoice_number (p_organisation_id, extract(year from current_date)::integer);

  insert into public.billing_invoices (
    organisation_id, invoice_number, subscription_id, plan_id,
    period_start, period_end, status, subtotal_kobo, total_kobo,
    issued_on, due_on, created_by
  )
  values (
    p_organisation_id, v_number, v_subscription.id, v_plan.id,
    p_period_start, p_period_end, 'open',
    v_plan.price_kobo, v_plan.price_kobo,
    current_date, current_date + 7, auth.uid ()
  )
  returning id into v_invoice_id;

  insert into public.billing_invoice_lines (
    organisation_id, invoice_id, kind, description, quantity, unit_amount_kobo, amount_kobo
  )
  values (
    p_organisation_id, v_invoice_id, 'subscription',
    v_plan.name || ' subscription', 1, v_plan.price_kobo, v_plan.price_kobo
  );

  select * into v_reading
  from public.usage_readings
  where organisation_id = p_organisation_id
    and period_start = p_period_start
    and period_end = p_period_end
    and status = 'final';

  if v_reading.id is not null
     and v_reading.units is not null
     and v_reading.unit_limit is not null
     and v_reading.unit_overage_kobo is not null
     and v_reading.units > v_reading.unit_limit then
    v_overage_units := v_reading.units - v_reading.unit_limit;
    v_overage_kobo := v_overage_units * v_reading.unit_overage_kobo;

    insert into public.billing_invoice_lines (
      organisation_id, invoice_id, kind, description, quantity, unit_amount_kobo, amount_kobo
    )
    values (
      p_organisation_id, v_invoice_id, 'unit_overage',
      'Units above the plan allowance', v_overage_units,
      v_reading.unit_overage_kobo, v_overage_kobo
    );

    update public.billing_invoices
    set subtotal_kobo = subtotal_kobo + v_overage_kobo,
        total_kobo = total_kobo + v_overage_kobo
    where id = v_invoice_id;
  end if;

  return v_invoice_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Record a payment (BILL-2)
-- ---------------------------------------------------------------------------
create or replace function public.record_invoice_payment (
  p_invoice_id uuid,
  p_amount_kobo bigint,
  p_method text,
  p_reference text,
  p_paid_on date
) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  v_invoice public.billing_invoices;
  v_paid bigint;
begin
  select * into v_invoice from public.billing_invoices where id = p_invoice_id;
  if v_invoice.id is null then
    raise exception 'the invoice was not found' using errcode = '22023';
  end if;

  if not app.has_role (
    v_invoice.organisation_id,
    array['owner', 'admin', 'accountant']::public.app_role[]
  ) then
    raise exception 'your role cannot record invoice payments' using errcode = '42501';
  end if;

  if v_invoice.status = 'void' then
    raise exception 'a void invoice cannot take a payment' using errcode = '23514';
  end if;

  if p_amount_kobo is null or p_amount_kobo <= 0 then
    raise exception 'enter a payment amount' using errcode = '22023';
  end if;

  if p_method not in ('bank_transfer', 'card', 'cash', 'other') then
    raise exception 'choose a payment method' using errcode = '22023';
  end if;

  v_paid := v_invoice.amount_paid_kobo + p_amount_kobo;
  if v_paid > v_invoice.total_kobo then
    raise exception 'the payment is more than the unpaid balance' using errcode = '23514';
  end if;

  insert into public.billing_invoice_payments (
    organisation_id, invoice_id, amount_kobo, method, reference, paid_on, recorded_by
  )
  values (
    v_invoice.organisation_id, p_invoice_id, p_amount_kobo, p_method,
    nullif(btrim(p_reference), ''), coalesce(p_paid_on, current_date), auth.uid ()
  );

  update public.billing_invoices
  set amount_paid_kobo = v_paid,
      status = case when v_paid >= total_kobo then 'paid' else status end,
      paid_at = case when v_paid >= total_kobo then coalesce(paid_at, now ()) else paid_at end
  where id = p_invoice_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.billing_invoices enable row level security;

alter table public.billing_invoice_lines enable row level security;

alter table public.billing_invoice_payments enable row level security;

alter table public.subscription_changes enable row level security;

create policy billing_invoices_select_finance on public.billing_invoices for
select
  to authenticated using (
    app.has_role (
      organisation_id,
      array['owner', 'admin', 'accountant']::public.app_role[]
    )
  );

create policy billing_invoice_lines_select_finance on public.billing_invoice_lines for
select
  to authenticated using (
    app.has_role (
      organisation_id,
      array['owner', 'admin', 'accountant']::public.app_role[]
    )
  );

create policy billing_invoice_payments_select_finance on public.billing_invoice_payments for
select
  to authenticated using (
    app.has_role (
      organisation_id,
      array['owner', 'admin', 'accountant']::public.app_role[]
    )
  );

create policy subscription_changes_select_finance on public.subscription_changes for
select
  to authenticated using (
    app.has_role (
      organisation_id,
      array['owner', 'admin', 'accountant']::public.app_role[]
    )
  );

-- ---------------------------------------------------------------------------
-- Append-only financial evidence
-- ---------------------------------------------------------------------------
create or replace function app.deny_billing_rewrite () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  raise exception 'a billing record is never changed or removed here'
    using errcode = '42501';
end;
$$;

create trigger billing_invoice_lines_append_only
before update or delete on public.billing_invoice_lines for each row
execute function app.deny_billing_rewrite ();

create trigger billing_invoice_payments_append_only
before update or delete on public.billing_invoice_payments for each row
execute function app.deny_billing_rewrite ();

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------
create trigger billing_invoices_audit
after insert or update or delete on public.billing_invoices for each row
execute function app.audit_row_change ('billing_invoice');

create trigger billing_invoice_lines_audit
after insert or update or delete on public.billing_invoice_lines for each row
execute function app.audit_row_change ('billing_invoice_line');

create trigger billing_invoice_payments_audit
after insert or update or delete on public.billing_invoice_payments for each row
execute function app.audit_row_change ('billing_invoice_payment');

create trigger subscription_changes_audit
after insert or update or delete on public.subscription_changes for each row
execute function app.audit_row_change ('subscription_change');

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant
select
  on public.billing_invoices,
  public.billing_invoice_lines,
  public.billing_invoice_payments,
  public.subscription_changes to authenticated;

revoke all on public.billing_invoices,
public.billing_invoice_lines,
public.billing_invoice_payments,
public.subscription_changes,
public.billing_invoice_counters
from
  anon;

revoke all on function public.change_subscription_plan (uuid, text, text)
from
  public;

revoke all on function public.generate_subscription_invoice (uuid, date, date)
from
  public;

revoke all on function public.record_invoice_payment (uuid, bigint, text, text, date)
from
  public;

grant
execute on function public.change_subscription_plan (uuid, text, text) to authenticated;

grant
execute on function public.generate_subscription_invoice (uuid, date, date) to authenticated;

grant
execute on function public.record_invoice_payment (uuid, bigint, text, text, date) to authenticated;
