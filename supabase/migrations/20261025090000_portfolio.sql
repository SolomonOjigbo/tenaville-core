-- R1 step 2: landlords, management mandates, properties, units, import batches.
--
-- Requirements: OWN-1, OWN-2, OWN-3, PROP-1, PROP-2, PROP-3, PROP-4, PROP-5,
--               PROP-9. Also closes the unconstrained assignments.scope_id
--               left by step 1, now that properties and landlords exist.
--
-- Money is integer kobo (PRD §10.1). Commission rates are basis points, for
-- the same reason: a percentage stored as a float cannot be relied on when it
-- divides a landlord's rent.
-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type public.property_type as enum(
  'residential',
  'commercial',
  'mixed_use',
  'estate',
  'land'
);

create type public.unit_type as enum(
  'flat',
  'self_contained',
  'room',
  'duplex',
  'bungalow',
  'shop',
  'office',
  'warehouse',
  'other'
);

-- PROP-3. 'inactive' means deliberately out of the lettable pool — it is
-- excluded from the occupancy denominator where appropriate (AN-3).
create type public.unit_status as enum(
  'vacant',
  'occupied',
  'reserved',
  'under_maintenance',
  'inactive'
);

create type public.commission_type as enum('percentage', 'fixed');

-- LEDGER-9: commission is recognised when rent is received by default, with
-- the basis set in the mandate. PRD open decision 14 is unresolved, so the
-- default is the PRD's stated default and the alternative is representable.
create type public.commission_basis as enum('on_receipt', 'on_invoice');

create type public.remittance_schedule as enum(
  'on_receipt',
  'weekly',
  'fortnightly',
  'monthly',
  'quarterly',
  'annually'
);

-- OWN-2: deductions the agency may make before remitting. An agency cannot
-- invent a category at remittance time; it must be permitted by the mandate.
create type public.deduction_category as enum(
  'commission',
  'maintenance',
  'service_charge',
  'utilities',
  'statutory_fee',
  'agency_expense',
  'other'
);

create type public.contact_channel as enum('phone', 'sms', 'whatsapp', 'email');

create type public.import_kind as enum(
  'properties_units',
  'landlords',
  'tenants_leases',
  'opening_balances'
);

-- MIG-3: an import is dry-run first, then applied, and an applied batch can be
-- rolled back as a unit.
create type public.import_status as enum(
  'draft',
  'validated',
  'applied',
  'rolled_back',
  'failed'
);

create type public.import_row_status as enum('pending', 'valid', 'invalid', 'applied');

-- ---------------------------------------------------------------------------
-- Nigerian states (PRD §12 Localisation, PROP-1)
--
-- Reference data, not organisation-scoped. Seeded with the 36 states and the
-- FCT. LGA is free text for now: there are 774 of them and we do not yet have
-- an authoritative machine-readable list, so storing an unverified one would
-- be worse than storing the agency's own wording. Tracked as an open item in
-- docs/ops/open-decisions.md.
-- ---------------------------------------------------------------------------
create table public.nigerian_states (
  code text primary key check (code ~ '^[A-Z]{2,3}$'),
  name text not null unique,
  zone text not null
);

-- ---------------------------------------------------------------------------
-- Landlords (OWN-1)
--
-- Remittance details are the sensitive part: a bank account number is what an
-- attacker would change to redirect a landlord's money. Access is restricted
-- to admins and accountants, and changes are audited.
-- ---------------------------------------------------------------------------
create table public.landlords (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  -- The landlord's portal user, once they have accepted access (OWN-3). Null
  -- until then: an agency records a landlord long before that landlord signs in.
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null check (length(btrim(display_name)) between 1 and 200),
  -- An entity landlord (a company or family trust) rather than a person.
  is_organisation boolean not null default false,
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (position('@' in email) > 1),
  preferred_channel public.contact_channel not null default 'whatsapp',
  address_line text,
  state_code text references public.nigerian_states (code),
  lga text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  -- One portal user cannot be two landlords in the same organisation.
  unique (organisation_id, user_id)
);

create index landlords_organisation_idx on public.landlords (organisation_id);

create index landlords_user_idx on public.landlords (user_id)
where
  user_id is not null;

create trigger landlords_touch_updated_at
before update on public.landlords for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Landlord remittance details (OWN-1, "with restricted access")
--
-- A separate table rather than columns on landlords, because the restriction
-- is by application role and Postgres column grants are by database role —
-- every user connects as `authenticated`, so a column grant cannot tell an
-- accountant from a letting agent. A separate table gets its own policy, which
-- can.
--
-- This is the row an attacker would change to redirect a landlord's money, so
-- the write path is narrow and audited.
-- ---------------------------------------------------------------------------
create table public.landlord_remittance_details (
  landlord_id uuid primary key references public.landlords (id) on delete cascade,
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  bank_name text not null check (length(btrim(bank_name)) between 1 and 120),
  account_name text not null check (length(btrim(account_name)) between 1 and 200),
  -- Nigerian NUBAN account numbers are exactly 10 digits.
  account_number text not null check (account_number ~ '^[0-9]{10}$'),
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index landlord_remittance_organisation_idx on public.landlord_remittance_details (organisation_id);

create trigger landlord_remittance_touch_updated_at
before update on public.landlord_remittance_details for each row
execute function app.touch_updated_at ();

comment on table public.landlord_remittance_details is 'Where a landlord is paid. Restricted to owner, admin and accountant; every change is audited (OWN-1).';

-- Audit every change: redirecting remittance is the highest-value attack on an
-- agency's data, and "who changed this account number" must be answerable.
create or replace function app.audit_remittance_change () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  insert into public.audit_events (
    organisation_id, actor_user_id, actor_label, action, entity_type, entity_id,
    before, after, reason
  )
  values (
    coalesce(new.organisation_id, old.organisation_id),
    auth.uid(),
    auth.email(),
    case tg_op
      when 'INSERT' then 'remittance_details.created'
      when 'UPDATE' then 'remittance_details.updated'
      else 'remittance_details.removed'
    end,
    'landlord_remittance_details',
    coalesce(new.landlord_id, old.landlord_id)::text,
    -- The account number is masked in the trail: the audit answers who changed
    -- it and when, and does not become a second copy of the sensitive value.
    case when tg_op = 'INSERT' then null else jsonb_build_object(
      'bank_name', old.bank_name,
      'account_name', old.account_name,
      'account_number_last4', right(old.account_number, 4)
    ) end,
    case when tg_op = 'DELETE' then null else jsonb_build_object(
      'bank_name', new.bank_name,
      'account_name', new.account_name,
      'account_number_last4', right(new.account_number, 4)
    ) end,
    nullif(btrim(coalesce(current_setting('app.audit_reason', true), '')), '')
  );
  return coalesce(new, old);
end;
$$;

create trigger landlord_remittance_audit
after insert or update or delete on public.landlord_remittance_details for each row
execute function app.audit_remittance_change ();

-- ---------------------------------------------------------------------------
-- Management mandates (OWN-2)
--
-- The agreement that defines the agency's authority and financial terms. The
-- ledger reads these terms rather than hard-coding them (LEDGER-9).
-- ---------------------------------------------------------------------------
create table public.management_mandates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  landlord_id uuid not null references public.landlords (id) on delete cascade,
  reference text check (length(btrim(reference)) between 1 and 60),
  commission_type public.commission_type not null default 'percentage',
  -- Basis points: 1000 = 10.00%. An integer, because this number divides a
  -- landlord's rent and a float cannot be trusted to (PRD §10.1).
  commission_rate_bps integer check (commission_rate_bps between 0 and 10000),
  commission_fixed_kobo bigint check (commission_fixed_kobo >= 0),
  commission_basis public.commission_basis not null default 'on_receipt',
  remittance_schedule public.remittance_schedule not null default 'monthly',
  permitted_deductions public.deduction_category[] not null default array['commission', 'maintenance']::public.deduction_category[],
  starts_on date not null,
  ends_on date,
  terminated_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint mandates_dates_ordered check (
    ends_on is null
    or ends_on >= starts_on
  ),
  -- Exactly the field the commission type needs, and not the other one.
  constraint mandates_commission_fields_match_type check (
    (
      commission_type = 'percentage'
      and commission_rate_bps is not null
      and commission_fixed_kobo is null
    )
    or (
      commission_type = 'fixed'
      and commission_fixed_kobo is not null
      and commission_rate_bps is null
    )
  ),
  -- Commission is itself a deduction; a mandate that forbids it would make the
  -- agency's own fee unremittable.
  constraint mandates_permit_commission check ('commission' = any (permitted_deductions))
);

create index mandates_landlord_idx on public.management_mandates (landlord_id);

create index mandates_organisation_idx on public.management_mandates (organisation_id);

create trigger management_mandates_touch_updated_at
before update on public.management_mandates for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Properties (PROP-1, PROP-5, PROP-9)
-- ---------------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  -- PROP-5: one landlord in R1. Ownership shares and multiple landlords are a
  -- later release, which is why this is a column rather than a join table —
  -- adding the join table later is a migration, inventing one now is a guess.
  landlord_id uuid not null references public.landlords (id) on delete restrict,
  branch_id uuid references public.branches (id) on delete set null,
  name text not null check (length(btrim(name)) between 1 and 200),
  -- The agency's own reference, as used on paperwork and in conversation.
  reference text check (length(btrim(reference)) between 1 and 60),
  property_type public.property_type not null,
  address_line text not null check (length(btrim(address_line)) between 1 and 300),
  state_code text not null references public.nigerian_states (code),
  lga text check (length(btrim(lga)) between 1 and 120),
  area text,
  -- Optional map coordinates. Range-checked so a transposed pair is rejected
  -- rather than silently placing a Lagos property in the Atlantic.
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (organisation_id, reference),
  constraint properties_coordinates_paired check (
    (
      latitude is null
      and longitude is null
    )
    or (
      latitude is not null
      and longitude is not null
    )
  )
);

create index properties_organisation_idx on public.properties (organisation_id);

create index properties_landlord_idx on public.properties (landlord_id);

create index properties_state_idx on public.properties (organisation_id, state_code);

create trigger properties_touch_updated_at
before update on public.properties for each row
execute function app.touch_updated_at ();

comment on table public.properties is 'Internal management records only. Never exposed in a public marketplace or search index (PROP-9, ADR 0007).';

-- A property's landlord must belong to the same organisation. Without this, a
-- crafted insert could attach another tenant''s landlord to your property.
create or replace function app.assert_property_landlord_same_organisation () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if not exists (
    select 1 from public.landlords l
    where l.id = new.landlord_id and l.organisation_id = new.organisation_id
  ) then
    raise exception 'landlord % does not belong to organisation %',
      new.landlord_id, new.organisation_id
      using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger properties_landlord_same_organisation
before insert or update of landlord_id,
organisation_id on public.properties for each row
execute function app.assert_property_landlord_same_organisation ();

-- Same rule for a mandate's landlord.
create or replace function app.assert_mandate_landlord_same_organisation () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if not exists (
    select 1 from public.landlords l
    where l.id = new.landlord_id and l.organisation_id = new.organisation_id
  ) then
    raise exception 'landlord % does not belong to organisation %',
      new.landlord_id, new.organisation_id
      using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger mandates_landlord_same_organisation
before insert or update of landlord_id,
organisation_id on public.management_mandates for each row
execute function app.assert_mandate_landlord_same_organisation ();

-- ---------------------------------------------------------------------------
-- Units (PROP-2, PROP-3)
-- ---------------------------------------------------------------------------
create table public.units (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  label text not null check (length(btrim(label)) between 1 and 60),
  reference text check (length(btrim(reference)) between 1 and 60),
  unit_type public.unit_type not null,
  status public.unit_status not null default 'vacant',
  bedrooms smallint check (bedrooms between 0 and 50),
  bathrooms smallint check (bathrooms between 0 and 50),
  floor_area_sqm numeric(10, 2) check (floor_area_sqm > 0),
  -- Integer kobo (PRD §10.1). Asking rent is what the agency advertises to a
  -- prospect; contracted rent is what the current lease actually charges, and
  -- they diverge constantly — a unit let below asking is normal.
  asking_rent_kobo bigint check (asking_rent_kobo >= 0),
  contracted_rent_kobo bigint check (contracted_rent_kobo >= 0),
  facilities text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (property_id, label)
);

create index units_organisation_idx on public.units (organisation_id);

create index units_property_idx on public.units (property_id);

-- Supports the rent roll and vacancy views (AN-1).
create index units_status_idx on public.units (organisation_id, status);

create trigger units_touch_updated_at
before update on public.units for each row
execute function app.touch_updated_at ();

comment on column public.units.asking_rent_kobo is 'Integer kobo (PRD §10.1). ₦1,200,000.00 is 120000000.';

create or replace function app.assert_unit_property_same_organisation () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if not exists (
    select 1 from public.properties p
    where p.id = new.property_id and p.organisation_id = new.organisation_id
  ) then
    raise exception 'property % does not belong to organisation %',
      new.property_id, new.organisation_id
      using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger units_property_same_organisation
before insert or update of property_id,
organisation_id on public.units for each row
execute function app.assert_unit_property_same_organisation ();

-- ---------------------------------------------------------------------------
-- Property photos (PROP-1)
--
-- Private object-storage paths, never public URLs (DOC-7). unit_id narrows a
-- photo to one unit within the property.
-- ---------------------------------------------------------------------------
create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  unit_id uuid references public.units (id) on delete cascade,
  storage_path text not null check (length(btrim(storage_path)) between 1 and 500),
  caption text,
  sort_order integer not null default 0,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (property_id, storage_path)
);

create index property_photos_property_idx on public.property_photos (property_id, sort_order);

comment on column public.property_photos.storage_path is 'Path in a private bucket. Served only through a short-lived signed URL after an authorisation check (DOC-7).';

-- ---------------------------------------------------------------------------
-- Import batches (PROP-4, and the foundation for MIG-1..MIG-3)
--
-- Every import is dry-run first: the rows are stored and validated before
-- anything is created, so an agency sees exactly what will happen. An applied
-- batch records what it created, which is what makes rollback possible.
-- ---------------------------------------------------------------------------
create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  kind public.import_kind not null,
  status public.import_status not null default 'draft',
  file_name text,
  -- The header row as uploaded, kept so a support conversation can establish
  -- what the agency's spreadsheet actually looked like.
  source_headers text[],
  row_count integer not null default 0 check (row_count >= 0),
  valid_count integer not null default 0 check (valid_count >= 0),
  invalid_count integer not null default 0 check (invalid_count >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  applied_at timestamptz,
  rolled_back_at timestamptz,
  rolled_back_by uuid references auth.users (id) on delete set null,
  error text,
  constraint import_batches_applied_has_timestamp check (
    status <> 'applied'
    or applied_at is not null
  ),
  constraint import_batches_rolled_back_has_timestamp check (
    status <> 'rolled_back'
    or rolled_back_at is not null
  )
);

create index import_batches_organisation_idx on public.import_batches (organisation_id, created_at desc);

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  batch_id uuid not null references public.import_batches (id) on delete cascade,
  -- The row number in the uploaded file, so an error message can say
  -- "row 42" and the agency can find it (PROP-4).
  row_number integer not null check (row_number > 0),
  raw jsonb not null,
  status public.import_row_status not null default 'pending',
  -- One entry per problem: {field, code, message}. Row-level error reporting
  -- means every problem at once, not the first one found.
  errors jsonb not null default '[]'::jsonb,
  created_entity_type text,
  created_entity_id uuid,
  created_at timestamptz not null default now(),
  unique (batch_id, row_number),
  constraint import_rows_invalid_has_errors check (
    status <> 'invalid'
    or jsonb_array_length(errors) > 0
  ),
  constraint import_rows_applied_has_entity check (
    status <> 'applied'
    or (
      created_entity_type is not null
      and created_entity_id is not null
    )
  )
);

create index import_rows_batch_idx on public.import_rows (batch_id, row_number);

create index import_rows_status_idx on public.import_rows (batch_id, status);

-- ---------------------------------------------------------------------------
-- Closing the gap step 1 left: assignments.scope_id had no constraint because
-- properties and landlords did not exist yet. They do now.
--
-- A foreign key cannot express "references whichever table scope_type names",
-- so a trigger checks that the target exists *and* belongs to the same
-- organisation. Without the second half, an assignment could scope a user to
-- another tenant's property.
-- ---------------------------------------------------------------------------
create or replace function app.assert_assignment_scope_exists () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if new.scope_type = 'organisation' then
    return new;
  end if;

  if new.scope_type = 'property' then
    if not exists (
      select 1 from public.properties p
      where p.id = new.scope_id and p.organisation_id = new.organisation_id
    ) then
      raise exception 'property % does not belong to organisation %',
        new.scope_id, new.organisation_id
        using errcode = '23503';
    end if;
  elsif new.scope_type = 'landlord' then
    if not exists (
      select 1 from public.landlords l
      where l.id = new.scope_id and l.organisation_id = new.organisation_id
    ) then
      raise exception 'landlord % does not belong to organisation %',
        new.scope_id, new.organisation_id
        using errcode = '23503';
    end if;
  elsif new.scope_type = 'branch' then
    if not exists (
      select 1 from public.branches b
      where b.id = new.scope_id and b.organisation_id = new.organisation_id
    ) then
      raise exception 'branch % does not belong to organisation %',
        new.scope_id, new.organisation_id
        using errcode = '23503';
    end if;
  end if;

  return new;
end;
$$;

create trigger assignments_scope_exists
before insert or update of scope_type,
scope_id,
organisation_id on public.assignments for each row
execute function app.assert_assignment_scope_exists ();

-- ---------------------------------------------------------------------------
-- Access helpers for portfolio scoping (ORG-4, OWN-3)
-- ---------------------------------------------------------------------------
-- The landlord records this user is (OWN-3). A person may be a landlord at
-- more than one agency, so this is a set.
create or replace function app.current_landlord_ids () returns setof uuid language sql stable security definer
set
  search_path = '' as $$
  select l.id
  from public.landlords l
  where l.user_id = auth.uid()
$$;

-- Properties a staff member may reach: organisation-wide assignment grants the
-- whole portfolio, otherwise only the properties assigned to them, plus any
-- property belonging to a landlord they are assigned to (ORG-4).
create or replace function app.can_reach_property (
  target_organisation_id uuid,
  target_property_id uuid,
  target_landlord_id uuid
) returns boolean language sql stable security definer
set
  search_path = '' as $$
  select exists (
    select 1
    from public.assignments a
    where a.user_id = auth.uid()
      and a.organisation_id = target_organisation_id
      and (
        a.scope_type = 'organisation'
        or (a.scope_type = 'property' and a.scope_id = target_property_id)
        or (a.scope_type = 'landlord' and a.scope_id = target_landlord_id)
      )
  )
$$;

comment on function app.can_reach_property is 'ORG-4: organisation membership is not authority. A property manager reaches the properties assigned to them, not the whole portfolio.';

-- ===========================================================================
-- Row-level security
-- ===========================================================================
alter table public.nigerian_states enable row level security;

alter table public.landlords enable row level security;

alter table public.landlord_remittance_details enable row level security;

alter table public.management_mandates enable row level security;

alter table public.properties enable row level security;

alter table public.units enable row level security;

alter table public.property_photos enable row level security;

alter table public.import_batches enable row level security;

alter table public.import_rows enable row level security;

-- --- nigerian_states -------------------------------------------------------
-- Reference data. Readable by any signed-in user; never writable through the
-- API.
create policy nigerian_states_select on public.nigerian_states for
select
  to authenticated using (true);

-- --- landlords -------------------------------------------------------------
-- Staff see the landlords of their organisation. A landlord sees only their
-- own record (OWN-3). Remittance details are additionally restricted by the
-- column grants below: a letting agent can see that a landlord exists without
-- seeing where their money goes.
create policy landlords_select_staff on public.landlords for
select
  to authenticated using (
    organisation_id in (
      select
        app.current_organisation_ids ()
    )
    and app.is_staff (organisation_id)
  );

create policy landlords_select_self on public.landlords for
select
  to authenticated using (user_id = auth.uid ());

create policy landlords_write_staff on public.landlords for all to authenticated using (
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

-- --- landlord_remittance_details -------------------------------------------
-- Only the roles that actually remit money, plus the landlord's own view of
-- where they are paid. A letting agent or caretaker sees the landlord's
-- contact details and never their bank account.
create policy landlord_remittance_select_finance on public.landlord_remittance_details for
select
  to authenticated using (
    app.has_role (
      organisation_id,
      array['owner', 'admin', 'accountant']::public.app_role[]
    )
  );

create policy landlord_remittance_select_self on public.landlord_remittance_details for
select
  to authenticated using (
    landlord_id in (
      select
        app.current_landlord_ids ()
    )
  );

create policy landlord_remittance_write_finance on public.landlord_remittance_details for all to authenticated using (
  app.has_role (
    organisation_id,
    array['owner', 'admin', 'accountant']::public.app_role[]
  )
)
with
  check (
    app.has_role (
      organisation_id,
      array['owner', 'admin', 'accountant']::public.app_role[]
    )
  );

-- --- management_mandates ---------------------------------------------------
-- The commercial terms. Visible to the roles that act on them, and to the
-- landlord whose mandate it is.
create policy mandates_select_staff on public.management_mandates for
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

create policy mandates_select_landlord on public.management_mandates for
select
  to authenticated using (
    landlord_id in (
      select
        app.current_landlord_ids ()
    )
  );

create policy mandates_write_admins on public.management_mandates for all to authenticated using (
  app.has_role (
    organisation_id,
    array['owner', 'admin']::public.app_role[]
  )
)
with
  check (
    app.has_role (
      organisation_id,
      array['owner', 'admin']::public.app_role[]
    )
  );

-- --- properties ------------------------------------------------------------
-- Three distinct readers, deliberately separate policies rather than one
-- clause with three branches: each is reviewable on its own.
-- Staff, subject to their assignment scope (ORG-4).
create policy properties_select_staff on public.properties for
select
  to authenticated using (
    organisation_id in (
      select
        app.current_organisation_ids ()
    )
    and app.is_staff (organisation_id)
    and app.can_reach_property (organisation_id, id, landlord_id)
  );

-- The landlord who owns it, read-only (OWN-3).
create policy properties_select_landlord on public.properties for
select
  to authenticated using (
    landlord_id in (
      select
        app.current_landlord_ids ()
    )
  );

create policy properties_write_staff on public.properties for all to authenticated using (
  app.has_role (
    organisation_id,
    array['owner', 'admin', 'property_manager']::public.app_role[]
  )
  and app.can_reach_property (organisation_id, id, landlord_id)
)
with
  check (
    app.has_role (
      organisation_id,
      array['owner', 'admin', 'property_manager']::public.app_role[]
    )
  );

-- --- units -----------------------------------------------------------------
-- Scoped through the parent property, so a unit cannot be reachable when its
-- property is not.
create policy units_select_staff on public.units for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.properties p
      where
        p.id = public.units.property_id
        and p.organisation_id = public.units.organisation_id
        and app.is_staff (p.organisation_id)
        and app.can_reach_property (p.organisation_id, p.id, p.landlord_id)
    )
  );

create policy units_select_landlord on public.units for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.properties p
      where
        p.id = public.units.property_id
        and p.landlord_id in (
          select
            app.current_landlord_ids ()
        )
    )
  );

create policy units_write_staff on public.units for all to authenticated using (
  app.has_role (
    organisation_id,
    array['owner', 'admin', 'property_manager']::public.app_role[]
  )
  and exists (
    select
      1
    from
      public.properties p
    where
      p.id = public.units.property_id
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

-- --- property_photos -------------------------------------------------------
create policy property_photos_select on public.property_photos for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.properties p
      where
        p.id = public.property_photos.property_id
        and (
          (
            app.is_staff (p.organisation_id)
            and app.can_reach_property (p.organisation_id, p.id, p.landlord_id)
          )
          or p.landlord_id in (
            select
              app.current_landlord_ids ()
          )
        )
    )
  );

create policy property_photos_write_staff on public.property_photos for all to authenticated using (
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

-- --- import_batches / import_rows ------------------------------------------
-- Importing creates landlords, properties and units wholesale, so it is an
-- admin action. A landlord or tenant must not see an import at all.
create policy import_batches_rw_admins on public.import_batches for all to authenticated using (
  app.has_role (
    organisation_id,
    array['owner', 'admin']::public.app_role[]
  )
)
with
  check (
    app.has_role (
      organisation_id,
      array['owner', 'admin']::public.app_role[]
    )
  );

create policy import_rows_rw_admins on public.import_rows for all to authenticated using (
  app.has_role (
    organisation_id,
    array['owner', 'admin']::public.app_role[]
  )
)
with
  check (
    app.has_role (
      organisation_id,
      array['owner', 'admin']::public.app_role[]
    )
  );

-- ===========================================================================
-- Grants
--
-- Grants decide whether a role may touch a table at all; RLS decides which
-- rows. Remittance details are a separate table precisely so that its policy
-- can restrict by application role — see the table comment.
-- ===========================================================================
grant
select
  on public.nigerian_states to authenticated;

grant
select
,
  insert,
update,
delete on public.landlords to authenticated;

grant
select
,
  insert,
update,
delete on public.landlord_remittance_details to authenticated;

grant
select
,
  insert,
update,
delete on public.management_mandates to authenticated;

grant
select
,
  insert,
update,
delete on public.properties to authenticated;

grant
select
,
  insert,
update,
delete on public.units to authenticated;

grant
select
,
  insert,
update,
delete on public.property_photos to authenticated;

grant
select
,
  insert,
update,
delete on public.import_batches to authenticated;

grant
select
,
  insert,
update,
delete on public.import_rows to authenticated;

grant
execute on function app.current_landlord_ids () to authenticated;

grant
execute on function app.can_reach_property (uuid, uuid, uuid) to authenticated;

-- Keep anon out of the tables added here, and out of anything added later:
-- the image's default privileges would otherwise grant them (see step 1).
revoke all on all tables in schema public
from
  anon;

revoke all on all sequences in schema public
from
  anon;

revoke all on all functions in schema public
from
  anon;

-- ===========================================================================
-- Nigerian states: the 36 states and the Federal Capital Territory.
--
-- In the migration rather than the seed, because properties.state_code is a
-- foreign key to it — production needs these rows, not just development.
-- Codes are ISO 3166-2:NG subdivision codes.
-- ===========================================================================
insert into
  public.nigerian_states (code, name, zone)
values
  ('AB', 'Abia', 'South East'),
  ('AD', 'Adamawa', 'North East'),
  ('AK', 'Akwa Ibom', 'South South'),
  ('AN', 'Anambra', 'South East'),
  ('BA', 'Bauchi', 'North East'),
  ('BY', 'Bayelsa', 'South South'),
  ('BE', 'Benue', 'North Central'),
  ('BO', 'Borno', 'North East'),
  ('CR', 'Cross River', 'South South'),
  ('DE', 'Delta', 'South South'),
  ('EB', 'Ebonyi', 'South East'),
  ('ED', 'Edo', 'South South'),
  ('EK', 'Ekiti', 'South West'),
  ('EN', 'Enugu', 'South East'),
  (
    'FC',
    'Federal Capital Territory',
    'North Central'
  ),
  ('GO', 'Gombe', 'North East'),
  ('IM', 'Imo', 'South East'),
  ('JI', 'Jigawa', 'North West'),
  ('KD', 'Kaduna', 'North West'),
  ('KN', 'Kano', 'North West'),
  ('KT', 'Katsina', 'North West'),
  ('KE', 'Kebbi', 'North West'),
  ('KO', 'Kogi', 'North Central'),
  ('KW', 'Kwara', 'North Central'),
  ('LA', 'Lagos', 'South West'),
  ('NA', 'Nasarawa', 'North Central'),
  ('NI', 'Niger', 'North Central'),
  ('OG', 'Ogun', 'South West'),
  ('ON', 'Ondo', 'South West'),
  ('OS', 'Osun', 'South West'),
  ('OY', 'Oyo', 'South West'),
  ('PL', 'Plateau', 'North Central'),
  ('RI', 'Rivers', 'South South'),
  ('SO', 'Sokoto', 'North West'),
  ('TA', 'Taraba', 'North East'),
  ('YO', 'Yobe', 'North East'),
  ('ZA', 'Zamfara', 'North West')
on conflict (code) do nothing;

-- ===========================================================================
-- Applying a validated import (PROP-4, and the foundation for MIG-3)
--
-- Takes the rows a dry run already validated and creates landlords, properties
-- and units in one transaction. Each import_row records what it created, which
-- is what makes a batch rollback possible in R1 step 5.
--
-- Not security definer: it runs as the caller, so the import policies decide
-- whether they may do this at all. Landlords are matched by name within the
-- organisation and created only when absent, because an agency's spreadsheet
-- repeats the landlord on every row of a building.
-- ===========================================================================
create or replace function public.apply_property_import (target_batch_id uuid) returns table (
  properties_created integer,
  units_created integer,
  landlords_created integer
) language plpgsql
set
  search_path = '' as $$
declare
  batch public.import_batches;
  r public.import_rows;
  payload jsonb;
  resolved_landlord_id uuid;
  resolved_property_id uuid;
  new_unit_id uuid;
  n_properties integer := 0;
  n_units integer := 0;
  n_landlords integer := 0;
begin
  select * into batch from public.import_batches where id = target_batch_id;

  if batch.id is null then
    raise exception 'import batch not found'
      using errcode = 'P0002';
  end if;

  if batch.kind <> 'properties_units' then
    raise exception 'batch % is a % import, not properties_units', batch.id, batch.kind
      using errcode = '22023';
  end if;

  -- MIG-3: a batch is validated by a dry run first, and applied exactly once.
  if batch.status <> 'validated' then
    raise exception 'batch % is %, so it cannot be applied; only a validated batch can', batch.id, batch.status
      using errcode = '22023';
  end if;

  if exists (select 1 from public.import_rows where batch_id = batch.id and status = 'invalid') then
    raise exception 'batch % still has invalid rows', batch.id
      using errcode = '22023';
  end if;

  for r in
    select * from public.import_rows
    where batch_id = batch.id and status = 'valid'
    order by row_number
  loop
    payload := r.raw;

    -- Landlord: match on name within the organisation, create if absent.
    resolved_landlord_id := null;
    if nullif(btrim(coalesce(payload->>'landlordName', '')), '') is not null then
      select l.id into resolved_landlord_id
      from public.landlords l
      where l.organisation_id = batch.organisation_id
        and lower(btrim(l.display_name)) = lower(btrim(payload->>'landlordName'))
      limit 1;

      if resolved_landlord_id is null then
        insert into public.landlords (organisation_id, display_name)
        values (batch.organisation_id, btrim(payload->>'landlordName'))
        returning id into resolved_landlord_id;
        n_landlords := n_landlords + 1;
      end if;
    end if;

    -- A property needs a landlord (PROP-5). A spreadsheet without an owner
    -- column cannot be applied, and saying so here beats a foreign-key error.
    if resolved_landlord_id is null then
      raise exception 'row % has no landlord, and a property must have one (PROP-5)', r.row_number
        using errcode = '22023';
    end if;

    -- Property: match on name within the organisation, create if absent.
    select p.id into resolved_property_id
    from public.properties p
    where p.organisation_id = batch.organisation_id
      and lower(btrim(p.name)) = lower(btrim(payload->>'propertyName'))
    limit 1;

    if resolved_property_id is null then
      insert into public.properties (
        organisation_id, landlord_id, name, reference, property_type,
        address_line, state_code, lga
      )
      values (
        batch.organisation_id,
        resolved_landlord_id,
        btrim(payload->>'propertyName'),
        nullif(btrim(coalesce(payload->>'propertyReference', '')), ''),
        (payload->>'propertyType')::public.property_type,
        btrim(payload->>'addressLine'),
        payload->>'stateCode',
        nullif(btrim(coalesce(payload->>'lga', '')), '')
      )
      returning id into resolved_property_id;
      n_properties := n_properties + 1;
    end if;

    insert into public.units (
      organisation_id, property_id, label, unit_type, status,
      bedrooms, bathrooms, asking_rent_kobo
    )
    values (
      batch.organisation_id,
      resolved_property_id,
      btrim(payload->>'unitLabel'),
      (payload->>'unitType')::public.unit_type,
      coalesce((payload->>'unitStatus')::public.unit_status, 'vacant'),
      (payload->>'bedrooms')::smallint,
      (payload->>'bathrooms')::smallint,
      (payload->>'askingRentKobo')::bigint
    )
    returning id into new_unit_id;
    n_units := n_units + 1;

    update public.import_rows
    set status = 'applied',
        created_entity_type = 'unit',
        created_entity_id = new_unit_id
    where id = r.id;
  end loop;

  update public.import_batches
  set status = 'applied', applied_at = now()
  where id = batch.id;

  -- The audit entry is written by the trigger on import_batches below, not
  -- here: this function runs as the caller, who has no insert grant on
  -- audit_events. Granting one would let any member forge audit entries, and a
  -- forged entry is worse than a missing one. The trigger is security definer
  -- and fires whichever path changes the batch.
  return query select n_properties, n_units, n_landlords;
end;
$$;

grant
execute on function public.apply_property_import (uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Auditing import batches (ORG-5)
--
-- A trigger rather than an insert inside apply_property_import, because that
-- function intentionally runs as the caller so RLS still applies — and the
-- caller cannot write audit rows. A trigger is security definer and catches
-- every path that changes a batch, including a future rollback.
-- ---------------------------------------------------------------------------
create or replace function app.audit_import_batch_change () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  counts jsonb;
begin
  if old.status = new.status then
    return new;
  end if;

  if new.status not in ('applied', 'rolled_back', 'failed') then
    return new;
  end if;

  select jsonb_build_object(
           'rows_applied', count(*) filter (where status = 'applied'),
           'units_created', count(*) filter (where status = 'applied' and created_entity_type = 'unit')
         )
    into counts
  from public.import_rows
  where batch_id = new.id;

  insert into public.audit_events (
    organisation_id, actor_user_id, actor_label, action, entity_type, entity_id, before, after
  )
  values (
    new.organisation_id,
    auth.uid(),
    auth.email(),
    'import.' || new.status,
    'import_batch',
    new.id::text,
    jsonb_build_object('status', old.status),
    counts || jsonb_build_object('status', new.status, 'kind', new.kind)
  );

  return new;
end;
$$;

create trigger import_batches_audit
after update of status on public.import_batches for each row
execute function app.audit_import_batch_change ();
