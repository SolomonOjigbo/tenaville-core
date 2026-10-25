-- R1 step 3: tenants, leases, renewals, handovers, deposit lifecycle.
--
-- Requirements: LEASE-1, LEASE-2, LEASE-3, LEASE-4, LEASE-5, LEASE-6,
--               LEASE-11, LEASE-12, LEASE-13. Co-tenants and guarantors
--               (LEASE-9, R2) are representable from the start because the
--               alternative is reshaping lease_parties later.
--
-- Charges and payments are R1 step 4. This migration stops at lease *terms*:
-- the amount, the frequency and the due day. Generating the schedule and the
-- charges from those terms is one act and belongs in one place, so it is not
-- split across two steps.
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type public.tenant_kind as enum('individual', 'organisation');

-- LEASE-3. 'expiring_soon' is deliberately absent: see the note on
-- lease_overview below.
create type public.lease_status as enum(
  'draft',
  'active',
  'expired',
  'terminated',
  'renewed'
);

create type public.lease_party_role as enum('tenant', 'co_tenant', 'guarantor');

create type public.rent_frequency as enum('annual', 'half_yearly', 'quarterly', 'monthly');

create type public.handover_kind as enum('move_in', 'move_out');

-- LEASE-13. Who physically holds the deposit is PRD open decision 15; both
-- answers are representable rather than assumed, so resolving it is a
-- configuration change and not a migration.
create type public.deposit_custodian as enum('agency', 'landlord');

create type public.deposit_status as enum(
  'expected',
  'held',
  'partially_refunded',
  'refunded',
  'forfeited',
  'transferred'
);

create type public.tenant_contact_kind as enum(
  'next_of_kin',
  'employer',
  'business',
  'emergency',
  'referee'
);

-- ---------------------------------------------------------------------------
-- Expiry alert configuration (LEASE-6)
-- ---------------------------------------------------------------------------
alter table public.organisations
add column lease_expiry_alert_days smallint[] not null default '{90,60,30}'::smallint[];

comment on column public.organisations.lease_expiry_alert_days is 'Days before expiry at which to alert (LEASE-6). Configurable per organisation; the PRD default is 90, 60 and 30.';

-- A check constraint cannot contain a subquery, so the per-element bounds use
-- array ALL comparisons rather than unnest.
alter table public.organisations
add constraint organisations_alert_days_sane check (
  array_length(lease_expiry_alert_days, 1) between 1 and 6
  and 1 <= all (lease_expiry_alert_days)
  and 365 >= all (lease_expiry_alert_days)
);

-- ---------------------------------------------------------------------------
-- contracted_rent_kobo on units: removed.
--
-- It was added in step 2 as a portfolio figure. Once a lease carries the rent,
-- the lease is authoritative and the column becomes a cache that can drift —
-- and a stored rent that disagrees with the lease is how a tenant is billed
-- the wrong amount. asking_rent_kobo stays: it is the agency's advertised
-- figure for a vacant unit and has no other source.
--
-- Forward-only, so a new migration rather than an edit to the old one.
-- ---------------------------------------------------------------------------
alter table public.units
drop column contracted_rent_kobo;

-- ---------------------------------------------------------------------------
-- Tenants (LEASE-1)
-- ---------------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  -- The tenant's portal user, once they have accepted access (TENANT-1). Null
  -- until then: an agency records a tenant long before that tenant signs in.
  user_id uuid references auth.users (id) on delete set null,
  kind public.tenant_kind not null default 'individual',
  display_name text not null check (length(btrim(display_name)) between 1 and 200),
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (position('@' in email) > 1),
  preferred_channel public.contact_channel not null default 'whatsapp',
  date_of_birth date check (date_of_birth < current_date),
  occupation text,
  employer_name text,
  -- For an organisation tenant.
  business_registration text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (organisation_id, user_id)
);

create index tenants_organisation_idx on public.tenants (organisation_id);

create index tenants_user_idx on public.tenants (user_id)
where
  user_id is not null;

-- Supports "find the tenant" by name, the most common staff lookup.
create index tenants_name_idx on public.tenants (organisation_id, lower(display_name));

create trigger tenants_touch_updated_at
before update on public.tenants for each row
execute function app.touch_updated_at ();

-- Optional next-of-kin, employer and business details (LEASE-1). A separate
-- table because a tenant may have several, and because collecting none of them
-- must be as easy as collecting all: privacy by design means the schema does
-- not demand what the agency does not need (PRD principle 8).
create table public.tenant_contacts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind public.tenant_contact_kind not null,
  name text not null check (length(btrim(name)) between 1 and 200),
  relationship text,
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (position('@' in email) > 1),
  address_line text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index tenant_contacts_tenant_idx on public.tenant_contacts (tenant_id);

create trigger tenant_contacts_touch_updated_at
before update on public.tenant_contacts for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Leases (LEASE-2, LEASE-3, LEASE-4, LEASE-11, LEASE-12)
-- ---------------------------------------------------------------------------
create table public.leases (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  unit_id uuid not null references public.units (id) on delete restrict,
  -- The agency's own reference, as used on the tenancy agreement.
  reference text check (length(btrim(reference)) between 1 and 60),
  status public.lease_status not null default 'draft',
  -- Contractual dates, not timestamps: a tenancy that runs to 31 March ends on
  -- 31 March wherever the reader is (PRD §10.6).
  starts_on date not null,
  ends_on date not null,
  -- Rent terms. Integer kobo (PRD §10.1). The frequency and due day are what
  -- step 4 generates charges from.
  rent_kobo bigint not null check (rent_kobo >= 0),
  rent_frequency public.rent_frequency not null default 'annual',
  -- Day of month rent falls due, for monthly and quarterly terms. Null for an
  -- annual rent due on the anniversary of starts_on.
  rent_due_day smallint check (rent_due_day between 1 and 28),
  first_due_on date,
  -- LEASE-4: a renewal is a new lease that points at what it replaced, so the
  -- historical terms survive intact rather than being overwritten.
  renewed_from_lease_id uuid references public.leases (id) on delete set null,
  terminated_on date,
  termination_reason text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint leases_dates_ordered check (ends_on > starts_on),
  constraint leases_terminated_has_date check (
    status <> 'terminated'
    or terminated_on is not null
  ),
  constraint leases_terminated_within_term check (
    terminated_on is null
    or terminated_on >= starts_on
  ),
  -- A due day only means something for a periodic rent.
  constraint leases_due_day_requires_periodic_rent check (
    rent_due_day is null
    or rent_frequency <> 'annual'
  ),
  constraint leases_first_due_within_term check (
    first_due_on is null
    or (
      first_due_on >= starts_on
      and first_due_on <= ends_on
    )
  ),
  -- A renewal cannot point at itself.
  constraint leases_renewal_not_self check (renewed_from_lease_id is distinct from id),
  unique (organisation_id, reference)
);

create index leases_organisation_idx on public.leases (organisation_id);

create index leases_unit_idx on public.leases (unit_id);

create index leases_status_idx on public.leases (organisation_id, status);

-- Supports the expiry pipeline (LEASE-6, AN-5): "which leases end soon".
create index leases_expiry_idx on public.leases (organisation_id, ends_on)
where
  status = 'active';

create index leases_renewed_from_idx on public.leases (renewed_from_lease_id)
where
  renewed_from_lease_id is not null;

create trigger leases_touch_updated_at
before update on public.leases for each row
execute function app.touch_updated_at ();

comment on column public.leases.rent_kobo is 'Integer kobo (PRD §10.1). The lease is authoritative for rent; units.contracted_rent_kobo was removed for that reason.';

-- Two active leases on one unit is double-letting: two tenants told the same
-- flat is theirs. An exclusion constraint makes it impossible rather than
-- unlikely, and catches the overlap a date comparison in application code
-- would miss under concurrency.
alter table public.leases
add constraint leases_no_overlapping_active_term exclude using gist (
  unit_id
  with
    =,
    daterange (starts_on, ends_on, '[]')
  with
    &&
)
where
  (status = 'active');

create or replace function app.assert_lease_unit_same_organisation () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if not exists (
    select 1 from public.units u
    where u.id = new.unit_id and u.organisation_id = new.organisation_id
  ) then
    raise exception 'unit % does not belong to organisation %',
      new.unit_id, new.organisation_id
      using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger leases_unit_same_organisation
before insert or update of unit_id,
organisation_id on public.leases for each row
execute function app.assert_lease_unit_same_organisation ();

-- ---------------------------------------------------------------------------
-- Lease parties (LEASE-2 "tenant(s)", LEASE-9 co-tenants and guarantors)
-- ---------------------------------------------------------------------------
create table public.lease_parties (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  lease_id uuid not null references public.leases (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  role public.lease_party_role not null default 'tenant',
  -- Where several parties are jointly liable, this records the agreed split.
  -- Null means jointly and severally liable for the whole, which is the norm.
  liability_share_bps integer check (liability_share_bps between 0 and 10000),
  created_at timestamptz not null default now(),
  unique (lease_id, tenant_id, role)
);

create index lease_parties_lease_idx on public.lease_parties (lease_id);

create index lease_parties_tenant_idx on public.lease_parties (tenant_id);

create or replace function app.assert_lease_party_same_organisation () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if not exists (
    select 1 from public.leases l
    where l.id = new.lease_id and l.organisation_id = new.organisation_id
  ) then
    raise exception 'lease % does not belong to organisation %',
      new.lease_id, new.organisation_id using errcode = '23503';
  end if;
  if not exists (
    select 1 from public.tenants t
    where t.id = new.tenant_id and t.organisation_id = new.organisation_id
  ) then
    raise exception 'tenant % does not belong to organisation %',
      new.tenant_id, new.organisation_id using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger lease_parties_same_organisation
before insert or update on public.lease_parties for each row
execute function app.assert_lease_party_same_organisation ();

-- An active lease must have at least one party with the 'tenant' role.
-- Enforced as a deferred check at activation rather than as a table
-- constraint, because a draft lease is legitimately built up in stages.
create or replace function app.assert_active_lease_has_tenant () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if new.status = 'active' and (old.status is null or old.status <> 'active') then
    if not exists (
      select 1 from public.lease_parties p
      where p.lease_id = new.id and p.role = 'tenant'
    ) then
      raise exception 'a lease cannot be activated without a tenant'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger leases_active_requires_tenant
before insert or update of status on public.leases for each row
execute function app.assert_active_lease_has_tenant ();

-- ---------------------------------------------------------------------------
-- Caution deposits (LEASE-13, PRD §10.17)
--
-- A deposit is client money, not agency income. The PRD commits to that
-- (§10.17); what it leaves open is who physically holds it and how it appears
-- on a statement (open decision 15). `custodian` carries the first as data, so
-- both answers work without a migration, and the second is a step 6 question
-- about statement presentation rather than a schema question.
--
-- The lifecycle is the point: expected -> held -> (deductions at move-out) ->
-- refunded, forfeited or transferred, with every movement evidenced and a
-- ledger entry when money actually moves (step 6).
-- ---------------------------------------------------------------------------
create table public.lease_deposits (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  lease_id uuid not null references public.leases (id) on delete cascade,
  -- Integer kobo (PRD §10.1).
  amount_kobo bigint not null check (amount_kobo >= 0),
  custodian public.deposit_custodian not null default 'agency',
  status public.deposit_status not null default 'expected',
  received_on date,
  -- Set when the deposit leaves: refunded to the tenant, forfeited to the
  -- landlord, or transferred to a renewal.
  settled_on date,
  transferred_to_lease_id uuid references public.leases (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  -- One deposit per lease. A second deposit is an amendment to this one, which
  -- keeps "what is held for this tenancy" a single answerable question.
  unique (lease_id),
  constraint deposits_held_has_received_date check (
    status = 'expected'
    or received_on is not null
  ),
  constraint deposits_settled_has_date check (
    status not in ('refunded', 'forfeited', 'transferred')
    or settled_on is not null
  ),
  constraint deposits_transfer_has_target check (
    status <> 'transferred'
    or transferred_to_lease_id is not null
  ),
  constraint deposits_transfer_not_self check (transferred_to_lease_id is distinct from lease_id)
);

create index lease_deposits_organisation_idx on public.lease_deposits (organisation_id);

create index lease_deposits_status_idx on public.lease_deposits (organisation_id, status);

create trigger lease_deposits_touch_updated_at
before update on public.lease_deposits for each row
execute function app.touch_updated_at ();

comment on table public.lease_deposits is 'Caution deposits: client funds with an auditable lifecycle (LEASE-13, PRD §10.17). Never agency income.';

-- Deductions at move-out, each with its reason, evidence and approval
-- (LEASE-13). Append-only: a deduction a tenant disputed must still be
-- visible after it is reversed, so a correction is a new negative-free
-- reversal row rather than an edit.
create table public.deposit_deductions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  deposit_id uuid not null references public.lease_deposits (id) on delete cascade,
  amount_kobo bigint not null check (amount_kobo > 0),
  reason text not null check (length(btrim(reason)) between 3 and 1000),
  -- Private storage paths for the photographs and invoices that justify it
  -- (DOC-7: never a public URL).
  evidence_paths text[] not null default '{}',
  -- A deduction takes a tenant's money, so it does not count until an
  -- authorised person has approved it.
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  -- Set when this row reverses an earlier one.
  reverses_deduction_id uuid references public.deposit_deductions (id) on delete restrict,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint deductions_approved_pair check ((approved_by is null) = (approved_at is null)),
  constraint deductions_reversal_not_self check (reverses_deduction_id is distinct from id)
);

create index deposit_deductions_deposit_idx on public.deposit_deductions (deposit_id);

comment on table public.deposit_deductions is 'Append-only. A correction is a linked reversal row, never an edit (PRD §10.2).';

-- Append-only, like every record that moves money (PRD §10.2). Approval is the
-- one field that may be set after the fact, because approving is the workflow.
create or replace function app.deny_deduction_rewrite () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'deposit deductions cannot be deleted; record a reversal instead'
      using errcode = '42501', hint = 'PRD §10.2';
  end if;

  if new.amount_kobo <> old.amount_kobo
     or new.reason <> old.reason
     or new.deposit_id <> old.deposit_id then
    raise exception 'a deduction amount or reason cannot be changed; record a reversal instead'
      using errcode = '42501', hint = 'PRD §10.2';
  end if;

  return new;
end;
$$;

create trigger deposit_deductions_append_only
before update or delete on public.deposit_deductions for each row
execute function app.deny_deduction_rewrite ();

-- Deductions cannot exceed the deposit. Checked against approved, unreversed
-- deductions, because an unapproved proposal is not yet a claim on the money.
create or replace function app.assert_deductions_within_deposit () returns trigger language plpgsql
set
  search_path = '' as $$
declare
  deposit_amount bigint;
  claimed bigint;
begin
  select d.amount_kobo into deposit_amount
  from public.lease_deposits d
  where d.id = new.deposit_id;

  select coalesce(sum(x.amount_kobo), 0) into claimed
  from public.deposit_deductions x
  where x.deposit_id = new.deposit_id
    and x.approved_at is not null
    and x.reverses_deduction_id is null
    and not exists (
      select 1 from public.deposit_deductions r
      where r.reverses_deduction_id = x.id
    );

  if new.approved_at is not null and claimed > deposit_amount then
    raise exception
      'approved deductions (% kobo) would exceed the deposit (% kobo)',
      claimed, deposit_amount
      using errcode = '23514';
  end if;

  return null;
end;
$$;

-- An after-trigger, so the row being approved is included in the sum.
create trigger deposit_deductions_within_deposit
after insert or update of approved_at on public.deposit_deductions for each row
execute function app.assert_deductions_within_deposit ();

-- ---------------------------------------------------------------------------
-- Move-in and move-out (LEASE-5)
-- ---------------------------------------------------------------------------
create table public.lease_handovers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  lease_id uuid not null references public.leases (id) on delete cascade,
  kind public.handover_kind not null,
  happened_on date not null,
  notes text,
  -- Meter readings as {meter: reading}: electricity, water, gas vary by
  -- property and an agency should not need a migration to record a new one.
  meter_readings jsonb not null default '{}'::jsonb,
  -- The balance outstanding at move-out, recorded as observed. Step 4 computes
  -- it from charges; this is the figure the parties agreed on the day.
  outstanding_balance_kobo bigint check (outstanding_balance_kobo >= 0),
  keys_returned boolean,
  evidence_paths text[] not null default '{}',
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  -- One move-in and one move-out per lease.
  unique (lease_id, kind)
);

create index lease_handovers_lease_idx on public.lease_handovers (lease_id);

create trigger lease_handovers_touch_updated_at
before update on public.lease_handovers for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Unit occupancy follows the lease (PROP-3)
--
-- Without this, occupancy is maintained by hand and drifts: a rent roll that
-- says "vacant" for an occupied flat is worse than no rent roll. Only
-- 'occupied' and 'vacant' are managed here — 'reserved', 'under_maintenance'
-- and 'inactive' are deliberate staff decisions and are never overwritten.
-- ---------------------------------------------------------------------------
create or replace function app.sync_unit_occupancy () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if new.status = 'active' then
    update public.units
    set status = 'occupied'
    where id = new.unit_id
      and status in ('vacant', 'reserved');
  elsif new.status in ('expired', 'terminated') then
    -- Only free the unit if no other lease still holds it.
    if not exists (
      select 1 from public.leases l
      where l.unit_id = new.unit_id
        and l.id <> new.id
        and l.status = 'active'
    ) then
      update public.units
      set status = 'vacant'
      where id = new.unit_id
        and status = 'occupied';
    end if;
  end if;
  return new;
end;
$$;

create trigger leases_sync_unit_occupancy
after insert or update of status on public.leases for each row
execute function app.sync_unit_occupancy ();

-- ---------------------------------------------------------------------------
-- Lease overview: the derived 'expiring soon' state (LEASE-3)
--
-- LEASE-3 lists 'expiring soon' among the lease states. It is not stored.
--
-- A stored state would need a scheduled job to transition it, and would be
-- wrong between the day a lease crosses the threshold and the next run of that
-- job. "Wrong" here means a renewal conversation that did not happen, which is
-- precisely the failure LEASE-6 and AN-5 exist to prevent. Derived from the end
-- date and the organisation's own alert thresholds, it is correct whenever it
-- is read.
--
-- security_invoker so the underlying RLS applies to the caller rather than to
-- the view's owner. Without it a view is a hole straight through row-level
-- security.
-- ---------------------------------------------------------------------------
create view public.lease_overview
with
  (security_invoker = true) as
select
  l.id,
  l.organisation_id,
  l.unit_id,
  l.reference,
  l.status,
  l.starts_on,
  l.ends_on,
  l.rent_kobo,
  l.rent_frequency,
  l.renewed_from_lease_id,
  l.terminated_on,
  (l.ends_on - current_date) as days_to_expiry,
  -- The derived display state. 'expiring_soon' only applies to an active
  -- lease, and only within the largest configured alert window.
  case
    when l.status <> 'active' then l.status::text
    when l.ends_on < current_date then 'expired'
    when l.ends_on - current_date <= (
      select
        coalesce(max(d), 0)
      from
        unnest(o.lease_expiry_alert_days) d
    ) then 'expiring_soon'
    else 'active'
  end as display_status,
  -- The alert threshold this lease has crossed, so a reminder job can send one
  -- notice per threshold rather than one per day (LEASE-6).
  (
    select
      max(d)
    from
      unnest(o.lease_expiry_alert_days) d
    where
      l.ends_on - current_date <= d
  ) as alert_threshold_days,
  exists (
    select
      1
    from
      public.leases r
    where
      r.renewed_from_lease_id = l.id
  ) as has_renewal
from
  public.leases l
  join public.organisations o on o.id = l.organisation_id;

comment on view public.lease_overview is 'Leases with derived expiry state (LEASE-3, LEASE-6). expiring_soon is computed, never stored: a stored value would be stale between threshold and job run.';

-- ---------------------------------------------------------------------------
-- Creating a lease directly from a tenant and a unit (LEASE-12)
--
-- The R1 default path. Lease, party and optional deposit are created in one
-- transaction, because a lease with no party cannot be activated and a lease
-- whose deposit insert failed separately would understate what is held.
--
-- Not security definer: it runs as the caller, so the lease and tenant
-- policies decide whether they may do this at all.
-- ---------------------------------------------------------------------------
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
  activate boolean default false
) returns uuid language plpgsql
set
  search_path = '' as $$
declare
  new_lease_id uuid;
begin
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

  -- Activated after the party exists, so the "active lease needs a tenant"
  -- check passes and the unit occupancy trigger fires with the lease complete.
  if activate then
    update public.leases set status = 'active' where id = new_lease_id;
  end if;

  return new_lease_id;
end;
$$;

comment on function public.create_lease_with_tenant is 'LEASE-12: the R1 default path, a lease direct from a tenant and unit with no application. Creation from a screening application is additive in R2.';

-- ---------------------------------------------------------------------------
-- Renewal (LEASE-4)
--
-- A renewal is a new lease that points at the one it replaces, and the old
-- lease moves to 'renewed'. The historical terms survive untouched (LEASE-11),
-- which is what lets a dispute about last year's rent be answered.
-- ---------------------------------------------------------------------------
create or replace function public.renew_lease (
  source_lease_id uuid,
  new_ends_on date,
  new_rent_kobo bigint default null,
  carry_deposit boolean default true
) returns uuid language plpgsql
set
  search_path = '' as $$
declare
  source public.leases;
  new_lease_id uuid;
  source_deposit public.lease_deposits;
begin
  select * into source from public.leases where id = source_lease_id;

  if source.id is null then
    raise exception 'lease not found' using errcode = 'P0002';
  end if;

  if source.status not in ('active', 'expired') then
    raise exception 'a % lease cannot be renewed', source.status
      using errcode = '22023';
  end if;

  if new_ends_on <= source.ends_on then
    raise exception 'a renewal must end after the lease it renews'
      using errcode = '22023';
  end if;

  -- The old lease is closed first, so the no-overlapping-active-leases
  -- constraint does not reject the renewal that abuts it.
  update public.leases
  set status = 'renewed'
  where id = source_lease_id;

  insert into public.leases (
    organisation_id, unit_id, status, starts_on, ends_on,
    rent_kobo, rent_frequency, rent_due_day, renewed_from_lease_id, created_by
  )
  values (
    source.organisation_id, source.unit_id, 'draft',
    source.ends_on + 1, new_ends_on,
    coalesce(new_rent_kobo, source.rent_kobo),
    source.rent_frequency, source.rent_due_day, source_lease_id, auth.uid()
  )
  returning id into new_lease_id;

  -- Carry the parties over, so the tenant is not re-entered (LEASE-4).
  insert into public.lease_parties (organisation_id, lease_id, tenant_id, role, liability_share_bps)
  select organisation_id, new_lease_id, tenant_id, role, liability_share_bps
  from public.lease_parties
  where lease_id = source_lease_id;

  -- Transfer the deposit rather than refunding and re-collecting it, which is
  -- what agencies actually do (LEASE-13).
  if carry_deposit then
    select * into source_deposit from public.lease_deposits where lease_id = source_lease_id;
    if source_deposit.id is not null and source_deposit.status = 'held' then
      update public.lease_deposits
      set status = 'transferred',
          settled_on = current_date,
          transferred_to_lease_id = new_lease_id
      where id = source_deposit.id;

      insert into public.lease_deposits (
        organisation_id, lease_id, amount_kobo, custodian, status, received_on, notes
      )
      values (
        source_deposit.organisation_id, new_lease_id, source_deposit.amount_kobo,
        source_deposit.custodian, 'held', current_date,
        format('Transferred from lease %s', source_lease_id)
      );
    end if;
  end if;

  return new_lease_id;
end;
$$;

-- ===========================================================================
-- Row-level security
--
-- Tenancy records are reachable by staff through the property scope they
-- already have, and by the tenant whose tenancy it is (TENANT-1) and the
-- landlord who owns the unit (OWN-3). Three readers, three separate policies.
-- ===========================================================================
alter table public.tenants enable row level security;

alter table public.tenant_contacts enable row level security;

alter table public.leases enable row level security;

alter table public.lease_parties enable row level security;

alter table public.lease_deposits enable row level security;

alter table public.deposit_deductions enable row level security;

alter table public.lease_handovers enable row level security;

-- The tenants this user is (TENANT-1). A person may be a tenant at more than
-- one agency, so this is a set.
create or replace function app.current_tenant_ids () returns setof uuid language sql stable security definer
set
  search_path = '' as $$
  select t.id from public.tenants t where t.user_id = auth.uid()
$$;

-- Whether the caller may reach a lease: staff through the unit's property
-- scope, the tenant who is a party to it, or the landlord who owns the unit.
create or replace function app.can_reach_lease (target_lease_id uuid) returns boolean language sql stable security definer
set
  search_path = '' as $$
  select exists (
    select 1
    from public.leases l
    join public.units u on u.id = l.unit_id
    join public.properties p on p.id = u.property_id
    where l.id = target_lease_id
      and (
        (app.is_staff(l.organisation_id)
          and app.can_reach_property(p.organisation_id, p.id, p.landlord_id))
        or p.landlord_id in (select app.current_landlord_ids())
        or exists (
          select 1 from public.lease_parties lp
          where lp.lease_id = l.id
            and lp.tenant_id in (select app.current_tenant_ids())
        )
      )
  )
$$;

grant
execute on function app.current_tenant_ids () to authenticated;

grant
execute on function app.can_reach_lease (uuid) to authenticated;

-- --- tenants ---------------------------------------------------------------
-- Staff see their organisation's tenants. A tenant sees only themselves — the
-- sharp edge from ADR 0008: an in-organisation user whose visibility is far
-- narrower than the organisation.
create policy tenants_select_staff on public.tenants for
select
  to authenticated using (
    organisation_id in (
      select
        app.current_organisation_ids ()
    )
    and app.is_staff (organisation_id)
  );

create policy tenants_select_self on public.tenants for
select
  to authenticated using (user_id = auth.uid ());

create policy tenants_write_staff on public.tenants for all to authenticated using (
  app.has_role (
    organisation_id,
    array[
      'owner',
      'admin',
      'property_manager',
      'letting_agent'
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
        'letting_agent'
      ]::public.app_role[]
    )
  );

-- --- tenant_contacts -------------------------------------------------------
-- Next-of-kin and employer details are personal data about third parties, so
-- they are staff-only and not visible to the landlord.
create policy tenant_contacts_select_staff on public.tenant_contacts for
select
  to authenticated using (
    organisation_id in (
      select
        app.current_organisation_ids ()
    )
    and app.is_staff (organisation_id)
  );

create policy tenant_contacts_select_own_tenant on public.tenant_contacts for
select
  to authenticated using (
    tenant_id in (
      select
        app.current_tenant_ids ()
    )
  );

create policy tenant_contacts_write_staff on public.tenant_contacts for all to authenticated using (
  app.has_role (
    organisation_id,
    array[
      'owner',
      'admin',
      'property_manager',
      'letting_agent'
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
        'letting_agent'
      ]::public.app_role[]
    )
  );

-- --- leases ----------------------------------------------------------------
create policy leases_select_reachable on public.leases for
select
  to authenticated using (app.can_reach_lease (id));

create policy leases_write_staff on public.leases for all to authenticated using (
  app.has_role (
    organisation_id,
    array['owner', 'admin', 'property_manager']::public.app_role[]
  )
  and exists (
    select
      1
    from
      public.units u
      join public.properties p on p.id = u.property_id
    where
      u.id = public.leases.unit_id
      and app.can_reach_property (p.organisation_id, p.id, p.landlord_id)
  )
)
with
  check (
    app.has_role (
      organisation_id,
      array['owner', 'admin', 'property_manager']::public.app_role[]
    )
  );

-- No delete policy: a lease is never deleted. Terminating it preserves the
-- history a dispute needs (LEASE-11).
-- --- lease_parties ---------------------------------------------------------
create policy lease_parties_select_reachable on public.lease_parties for
select
  to authenticated using (app.can_reach_lease (lease_id));

create policy lease_parties_write_staff on public.lease_parties for all to authenticated using (
  app.has_role (
    organisation_id,
    array['owner', 'admin', 'property_manager']::public.app_role[]
  )
)
with
  check (
    app.has_role (
      organisation_id,
      array['owner', 'admin', 'property_manager']::public.app_role[]
    )
  );

-- --- lease_deposits --------------------------------------------------------
-- A tenant must be able to see what is held for them and what was deducted:
-- a deposit dispute the tenant cannot inspect is the dispute this lifecycle
-- exists to prevent.
create policy lease_deposits_select_reachable on public.lease_deposits for
select
  to authenticated using (app.can_reach_lease (lease_id));

create policy lease_deposits_write_finance on public.lease_deposits for all to authenticated using (
  app.has_role (
    organisation_id,
    array[
      'owner',
      'admin',
      'property_manager',
      'accountant'
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
        'accountant'
      ]::public.app_role[]
    )
  );

-- --- deposit_deductions ----------------------------------------------------
create policy deposit_deductions_select_reachable on public.deposit_deductions for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.lease_deposits d
      where
        d.id = public.deposit_deductions.deposit_id
        and app.can_reach_lease (d.lease_id)
    )
  );

-- Proposing a deduction and approving one are the same table but different
-- authority; the approval check lives in the application layer, which is where
-- the threshold rules will also live (MAINT-8 pattern).
create policy deposit_deductions_write_staff on public.deposit_deductions for all to authenticated using (
  app.has_role (
    organisation_id,
    array[
      'owner',
      'admin',
      'property_manager',
      'accountant'
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
        'accountant'
      ]::public.app_role[]
    )
  );

-- --- lease_handovers -------------------------------------------------------
-- Caretakers record move-in and move-out: it is field work (MOB-1).
create policy lease_handovers_select_reachable on public.lease_handovers for
select
  to authenticated using (app.can_reach_lease (lease_id));

create policy lease_handovers_write_staff on public.lease_handovers for all to authenticated using (
  app.has_role (
    organisation_id,
    array['owner', 'admin', 'property_manager', 'caretaker']::public.app_role[]
  )
)
with
  check (
    app.has_role (
      organisation_id,
      array['owner', 'admin', 'property_manager', 'caretaker']::public.app_role[]
    )
  );

-- ===========================================================================
-- Grants
-- ===========================================================================
grant
select
,
  insert,
update on public.tenants to authenticated;

grant
select
,
  insert,
update,
delete on public.tenant_contacts to authenticated;

grant
select
,
  insert,
update on public.leases to authenticated;

grant
select
,
  insert,
update,
delete on public.lease_parties to authenticated;

grant
select
,
  insert,
update on public.lease_deposits to authenticated;

grant
select
,
  insert,
update on public.deposit_deductions to authenticated;

grant
select
,
  insert,
update on public.lease_handovers to authenticated;

grant
select
  on public.lease_overview to authenticated;

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
  boolean
) to authenticated;

grant
execute on function public.renew_lease (uuid, date, bigint, boolean) to authenticated;

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
