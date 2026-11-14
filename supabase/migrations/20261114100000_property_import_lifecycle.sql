-- Property lifecycle, migration imports and opening balances.
--
-- PROP-1/PROP-2: properties and units gain an archive marker, with a guard
-- against archiving accommodation that is still under an active lease.
-- PROP-4/MIG-1/MIG-2/MIG-3: imports now track every entity a batch creates,
-- tenant/lease and opening-balance batches can be applied, and an applied
-- batch can be rolled back through a controlled function.
alter table public.properties
add column archived_at timestamptz;

alter table public.units
add column archived_at timestamptz;

alter table public.organisations
add column opening_balances_cutover_on date;

alter table public.organisations
add column opening_balances_confirmed_at timestamptz;

alter table public.import_batches
add column cutover_on date;

alter type public.charge_kind
add value if not exists 'opening_balance';

alter type public.payment_method
add value if not exists 'opening_balance';

create index properties_archived_idx on public.properties (organisation_id)
where
  archived_at is null;

create index units_archived_idx on public.units (organisation_id)
where
  archived_at is null;

-- An opening balance cutover is once per organisation. Rolling the batch back
-- clears the confirmation and lets a corrected import take its place.
create unique index import_batches_one_opening_balance_idx on public.import_batches (organisation_id)
where
  kind = 'opening_balances'
  and status = 'applied';

-- ---------------------------------------------------------------------------
-- Archive guard
-- ---------------------------------------------------------------------------
create or replace function app.prevent_occupied_archive () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if new.archived_at is null or old.archived_at is not null then
    return new;
  end if;

  if tg_table_name = 'units' then
    if exists (
      select 1 from public.leases l
      where l.unit_id = new.id and l.status = 'active'
    ) then
      raise exception 'an occupied unit cannot be archived'
        using errcode = '23514';
    end if;
  elsif tg_table_name = 'properties' then
    if exists (
      select 1
      from public.units u
      join public.leases l on l.unit_id = u.id
      where u.property_id = new.id and l.status = 'active'
    ) then
      raise exception 'a property with an active lease cannot be archived'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger properties_archive_guard
before update of archived_at on public.properties for each row
execute function app.prevent_occupied_archive ();

create trigger units_archive_guard
before update of archived_at on public.units for each row
execute function app.prevent_occupied_archive ();

-- ---------------------------------------------------------------------------
-- Import entity ledger
-- ---------------------------------------------------------------------------
create table public.import_batch_entities (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  batch_id uuid not null references public.import_batches (id) on delete cascade,
  entity_type text not null check (
    entity_type in (
      'landlord',
      'property',
      'unit',
      'tenant',
      'lease',
      'lease_deposit',
      'charge',
      'payment',
      'ledger_entry'
    )
  ),
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique (batch_id, entity_type, entity_id)
);

create index import_batch_entities_batch_idx on public.import_batch_entities (batch_id);

alter table public.import_batch_entities enable row level security;

create policy import_batch_entities_admins on public.import_batch_entities for all to authenticated using (
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

grant
select
,
  insert on public.import_batch_entities to authenticated;

-- ---------------------------------------------------------------------------
-- Property import: record everything the batch created
-- ---------------------------------------------------------------------------
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
  created_landlord boolean;
  created_property boolean;
  n_properties integer := 0;
  n_units integer := 0;
  n_landlords integer := 0;
begin
  select * into batch from public.import_batches where id = target_batch_id;

  if batch.id is null then
    raise exception 'import batch not found' using errcode = 'P0002';
  end if;

  if batch.kind <> 'properties_units' then
    raise exception 'batch % is a % import, not properties_units', batch.id, batch.kind
      using errcode = '22023';
  end if;

  if batch.status <> 'validated' then
    raise exception 'batch % is %, so it cannot be applied; only a validated batch can', batch.id, batch.status
      using errcode = '22023';
  end if;

  if exists (select 1 from public.import_rows where batch_id = batch.id and status = 'invalid') then
    raise exception 'batch % still has invalid rows', batch.id using errcode = '22023';
  end if;

  for r in
    select * from public.import_rows
    where batch_id = batch.id and status = 'valid'
    order by row_number
  loop
    payload := r.raw;
    created_landlord := false;
    created_property := false;

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
        created_landlord := true;
        n_landlords := n_landlords + 1;
      end if;
    end if;

    if resolved_landlord_id is null then
      raise exception 'row % has no landlord, and a property must have one (PROP-5)', r.row_number
        using errcode = '22023';
    end if;

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
      created_property := true;
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

    if created_landlord then
      insert into public.import_batch_entities (organisation_id, batch_id, entity_type, entity_id)
      values (batch.organisation_id, batch.id, 'landlord', resolved_landlord_id)
      on conflict do nothing;
    end if;

    if created_property then
      insert into public.import_batch_entities (organisation_id, batch_id, entity_type, entity_id)
      values (batch.organisation_id, batch.id, 'property', resolved_property_id)
      on conflict do nothing;
    end if;

    insert into public.import_batch_entities (organisation_id, batch_id, entity_type, entity_id)
    values (batch.organisation_id, batch.id, 'unit', new_unit_id)
    on conflict do nothing;

    update public.import_rows
    set status = 'applied',
        created_entity_type = 'unit',
        created_entity_id = new_unit_id
    where id = r.id;
  end loop;

  update public.import_batches
  set status = 'applied', applied_at = now()
  where id = batch.id;

  return query select n_properties, n_units, n_landlords;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tenant and lease import (MIG-1)
-- ---------------------------------------------------------------------------
create or replace function public.apply_tenant_lease_import (target_batch_id uuid) returns table (
  tenants_created integer,
  leases_created integer,
  deposits_created integer
) language plpgsql
set
  search_path = '' as $$
declare
  batch public.import_batches;
  r public.import_rows;
  payload jsonb;
  unit_id uuid;
  tenant_id uuid;
  lease_id uuid;
  deposit_id uuid;
  created_tenant boolean;
  n_tenants integer := 0;
  n_leases integer := 0;
  n_deposits integer := 0;
begin
  select * into batch from public.import_batches where id = target_batch_id;

  if batch.id is null then
    raise exception 'import batch not found' using errcode = 'P0002';
  end if;

  if batch.kind <> 'tenants_leases' then
    raise exception 'batch % is a % import, not tenants_leases', batch.id, batch.kind
      using errcode = '22023';
  end if;

  if batch.status <> 'validated' then
    raise exception 'batch % is %, so it cannot be applied; only a validated batch can', batch.id, batch.status
      using errcode = '22023';
  end if;

  if exists (select 1 from public.import_rows where batch_id = batch.id and status = 'invalid') then
    raise exception 'batch % still has invalid rows', batch.id using errcode = '22023';
  end if;

  for r in
    select * from public.import_rows
    where batch_id = batch.id and status = 'valid'
    order by row_number
  loop
    payload := r.raw;
    created_tenant := false;

    select u.id into unit_id
    from public.units u
    join public.properties p on p.id = u.property_id
    where u.organisation_id = batch.organisation_id
      and p.organisation_id = batch.organisation_id
      and u.archived_at is null
      and lower(btrim(p.name)) = lower(btrim(payload->>'propertyName'))
      and lower(btrim(u.label)) = lower(btrim(payload->>'unitLabel'))
    limit 1;

    if unit_id is null then
      raise exception 'row %: property/unit not found', r.row_number using errcode = '23503';
    end if;

    select t.id into tenant_id
    from public.tenants t
    where t.organisation_id = batch.organisation_id
      and lower(btrim(t.display_name)) = lower(btrim(payload->>'tenantName'))
      and (
        nullif(btrim(coalesce(payload->>'tenantEmail', '')), '') is null
        or lower(coalesce(t.email, '')) = lower(btrim(payload->>'tenantEmail'))
      )
    limit 1;

    if tenant_id is null then
      insert into public.tenants (
        organisation_id, display_name, email, phone
      )
      values (
        batch.organisation_id,
        btrim(payload->>'tenantName'),
        nullif(btrim(coalesce(payload->>'tenantEmail', '')), ''),
        nullif(btrim(coalesce(payload->>'tenantPhone', '')), '')
      )
      returning id into tenant_id;
      created_tenant := true;
      n_tenants := n_tenants + 1;
    end if;

    insert into public.leases (
      organisation_id, unit_id, reference, status, starts_on, ends_on,
      rent_kobo, rent_frequency, first_due_on, created_by
    )
    values (
      batch.organisation_id,
      unit_id,
      btrim(payload->>'leaseReference'),
      'draft',
      (payload->>'startsOn')::date,
      (payload->>'endsOn')::date,
      (payload->>'rentKobo')::bigint,
      coalesce((payload->>'rentFrequency')::public.rent_frequency, 'annual'),
      (payload->>'startsOn')::date,
      auth.uid()
    )
    returning id into lease_id;

    insert into public.lease_parties (organisation_id, lease_id, tenant_id, role)
    values (batch.organisation_id, lease_id, tenant_id, 'tenant');

    update public.leases set status = 'active' where id = lease_id;
    n_leases := n_leases + 1;

    if (payload->>'depositKobo')::bigint > 0 then
      insert into public.lease_deposits (
        organisation_id, lease_id, amount_kobo, custodian, status, received_on
      )
      values (
        batch.organisation_id,
        lease_id,
        (payload->>'depositKobo')::bigint,
        coalesce((payload->>'depositCustodian')::public.deposit_custodian, 'agency'),
        'held',
        (payload->>'startsOn')::date
      )
      returning id into deposit_id;
      n_deposits := n_deposits + 1;

      insert into public.import_batch_entities (organisation_id, batch_id, entity_type, entity_id)
      values (batch.organisation_id, batch.id, 'lease_deposit', deposit_id)
      on conflict do nothing;
    end if;

    if created_tenant then
      insert into public.import_batch_entities (organisation_id, batch_id, entity_type, entity_id)
      values (batch.organisation_id, batch.id, 'tenant', tenant_id)
      on conflict do nothing;
    end if;

    insert into public.import_batch_entities (organisation_id, batch_id, entity_type, entity_id)
    values (batch.organisation_id, batch.id, 'lease', lease_id)
    on conflict do nothing;

    update public.import_rows
    set status = 'applied', created_entity_type = 'lease', created_entity_id = lease_id
    where id = r.id;
  end loop;

  update public.import_batches
  set status = 'applied', applied_at = now()
  where id = batch.id;

  return query select n_tenants, n_leases, n_deposits;
end;
$$;

-- ---------------------------------------------------------------------------
-- Opening balances (MIG-2)
-- ---------------------------------------------------------------------------
create or replace function public.apply_opening_balance_import (target_batch_id uuid) returns table (
  charges_created integer,
  credits_created integer,
  ledger_entries_created integer
) language plpgsql security definer
set
  search_path = '' as $$
declare
  batch public.import_batches;
  r public.import_rows;
  payload jsonb;
  v_lease_id uuid;
  v_tenant_id uuid;
  v_landlord_id uuid;
  entity_id uuid;
  term_id uuid;
  amount bigint;
  next_sequence integer;
  n_charges integer := 0;
  n_credits integer := 0;
  n_ledger integer := 0;
begin
  select * into batch from public.import_batches where id = target_batch_id;

  if batch.id is null then
    raise exception 'import batch not found' using errcode = 'P0002';
  end if;

  if not app.has_role (
    batch.organisation_id,
    array['owner', 'admin']::public.app_role[]
  ) then
    raise exception 'your role cannot apply an opening balance import' using errcode = '42501';
  end if;

  if batch.kind <> 'opening_balances' then
    raise exception 'batch % is a % import, not opening_balances', batch.id, batch.kind
      using errcode = '22023';
  end if;

  if batch.status <> 'validated' then
    raise exception 'batch % is %, so it cannot be applied; only a validated batch can', batch.id, batch.status
      using errcode = '22023';
  end if;

  if batch.cutover_on is null then
    raise exception 'an opening balance import needs a cutover date' using errcode = '22023';
  end if;

  if exists (select 1 from public.import_rows where batch_id = batch.id and status = 'invalid') then
    raise exception 'batch % still has invalid rows', batch.id using errcode = '22023';
  end if;

  for r in
    select * from public.import_rows
    where batch_id = batch.id and status = 'valid'
    order by row_number
  loop
    payload := r.raw;
    amount := (payload->>'amountKobo')::bigint;
    entity_id := null;

    if payload->>'accountType' in ('tenant_arrears', 'tenant_credit') then
      select l.id into v_lease_id
      from public.leases l
      where l.organisation_id = batch.organisation_id
        and lower(btrim(l.reference)) = lower(btrim(payload->>'leaseReference'))
      limit 1;

      if v_lease_id is null then
        raise exception 'row %: lease not found', r.row_number using errcode = '23503';
      end if;

      select lp.tenant_id into v_tenant_id
      from public.lease_parties lp
      where lp.lease_id = v_lease_id and lp.role = 'tenant'
      limit 1;
    end if;

    if payload->>'accountType' = 'tenant_arrears' then
      select coalesce(max(c.sequence), 0) + 1 into next_sequence
      from public.charges c
      where c.lease_id = v_lease_id and c.kind = 'opening_balance';

      insert into public.lease_charge_terms (
        organisation_id, lease_id, kind, description, amount_kobo, frequency,
        starts_on, ends_on, raised_at, created_by
      )
      values (
        batch.organisation_id, v_lease_id, 'opening_balance',
        'Opening balance at cutover', amount, 'one_off',
        batch.cutover_on, batch.cutover_on, now(), auth.uid()
      )
      returning id into term_id;

      insert into public.charges (
        organisation_id, lease_id, kind, charge_term_id, sequence, period_start,
        period_end, due_on, amount_kobo, created_by
      )
      values (
        batch.organisation_id, v_lease_id, 'opening_balance', term_id,
        next_sequence, batch.cutover_on, batch.cutover_on, batch.cutover_on,
        amount, auth.uid()
      )
      returning id into entity_id;
      n_charges := n_charges + 1;
    elsif payload->>'accountType' = 'tenant_credit' then
      insert into public.payments (
        organisation_id, lease_id, tenant_id, amount_kobo, method, paid_on,
        status, confirmed_at, confirmed_by, notes, recorded_by
      )
      values (
        batch.organisation_id, v_lease_id, v_tenant_id, amount, 'opening_balance',
        batch.cutover_on, 'confirmed', now(), auth.uid(),
        'Opening tenant credit at cutover', auth.uid()
      )
      returning id into entity_id;

      insert into public.payment_allocations (
        organisation_id, payment_id, lease_id, charge_id, amount_kobo, note, created_by
      )
      values (
        batch.organisation_id, entity_id, v_lease_id, null, amount,
        'Opening tenant credit at cutover', auth.uid()
      );
      n_credits := n_credits + 1;
    elsif payload->>'accountType' in ('landlord_credit', 'landlord_debit') then
      select l.id into v_landlord_id
      from public.landlords l
      where l.organisation_id = batch.organisation_id
        and lower(btrim(l.display_name)) = lower(btrim(payload->>'landlordName'))
      limit 1;

      if v_landlord_id is null then
        raise exception 'row %: landlord not found', r.row_number using errcode = '23503';
      end if;

      insert into public.landlord_ledger_entries (
        organisation_id, landlord_id, entry_kind, funds_class, amount_kobo,
        occurred_on, description, created_by
      )
      values (
        batch.organisation_id,
        v_landlord_id,
        'opening_balance',
        'client_funds',
        case when payload->>'accountType' = 'landlord_debit' then -amount else amount end,
        batch.cutover_on,
        'Opening landlord balance at cutover',
        auth.uid()
      )
      returning id into entity_id;
      n_ledger := n_ledger + 1;
    else
      raise exception 'row %: unknown opening balance account type', r.row_number
        using errcode = '22023';
    end if;

    insert into public.import_batch_entities (organisation_id, batch_id, entity_type, entity_id)
    values (
      batch.organisation_id,
      batch.id,
      case
        when payload->>'accountType' = 'tenant_arrears' then 'charge'
        when payload->>'accountType' = 'tenant_credit' then 'payment'
        else 'ledger_entry'
      end,
      entity_id
    )
    on conflict do nothing;

    update public.import_rows
    set status = 'applied',
        created_entity_type = case
          when payload->>'accountType' = 'tenant_arrears' then 'charge'
          when payload->>'accountType' = 'tenant_credit' then 'payment'
          else 'ledger_entry'
        end,
        created_entity_id = entity_id
    where id = r.id;
  end loop;

  update public.import_batches
  set status = 'applied', applied_at = now()
  where id = batch.id;

  update public.organisations
  set opening_balances_cutover_on = batch.cutover_on,
      opening_balances_confirmed_at = now()
  where id = batch.organisation_id;

  return query select n_charges, n_credits, n_ledger;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rollback (MIG-3)
-- ---------------------------------------------------------------------------
create or replace function public.rollback_import_batch (target_batch_id uuid) returns integer language plpgsql security definer
set
  search_path = '' as $$
declare
  batch public.import_batches;
  e record;
  affected integer := 0;
  lease_ids uuid[];
  property_ids uuid[];
  landlord_ids uuid[];
  tenant_ids uuid[];
begin
  select * into batch from public.import_batches where id = target_batch_id;

  if batch.id is null then
    raise exception 'import batch not found' using errcode = 'P0002';
  end if;

  if not app.has_role (
    batch.organisation_id,
    array['owner', 'admin']::public.app_role[]
  ) then
    raise exception 'your role cannot roll back an import' using errcode = '42501';
  end if;

  if batch.status <> 'applied' then
    raise exception 'only an applied batch can be rolled back' using errcode = '22023';
  end if;

  if batch.kind = 'properties_units' then
    if not exists (select 1 from public.import_batch_entities where batch_id = batch.id) then
      raise exception 'this batch predates rollback tracking' using errcode = '22023';
    end if;

    select array_agg(entity_id) into property_ids
    from public.import_batch_entities
    where batch_id = batch.id and entity_type = 'property';

    select array_agg(entity_id) into landlord_ids
    from public.import_batch_entities
    where batch_id = batch.id and entity_type = 'landlord';

    if exists (
      select 1 from public.leases l
      where l.unit_id in (
        select entity_id from public.import_batch_entities
        where batch_id = batch.id and entity_type = 'unit'
      )
    ) then
      raise exception 'an imported unit now has a lease; rollback would destroy tenancy history'
        using errcode = '23503';
    end if;

    delete from public.units
    where id in (
      select entity_id from public.import_batch_entities
      where batch_id = batch.id and entity_type = 'unit'
    );
    get diagnostics affected = row_count;

    if property_ids is not null then
      if exists (
        select 1 from public.units u
        where u.property_id = any (property_ids)
      ) then
        raise exception 'an imported property now has other units; rollback refused'
          using errcode = '23503';
      end if;

      delete from public.properties where id = any (property_ids);
      if landlord_ids is null then
        select array_agg(entity_id) into landlord_ids
        from public.import_batch_entities
        where batch_id = batch.id and entity_type = 'landlord';
      end if;
    end if;

    if landlord_ids is not null then
      if exists (
        select 1 from public.properties p
        where p.landlord_id = any (landlord_ids)
      ) then
        raise exception 'an imported landlord now has other properties; rollback refused'
          using errcode = '23503';
      end if;

      delete from public.landlords where id = any (landlord_ids);
    end if;
  elsif batch.kind = 'tenants_leases' then
    select array_agg(entity_id) into lease_ids
    from public.import_batch_entities
    where batch_id = batch.id and entity_type = 'lease';

    if lease_ids is not null then
      if exists (
        select 1 from public.charges c where c.lease_id = any (lease_ids)
        union all
        select 1 from public.payments p where p.lease_id = any (lease_ids)
        union all
        select 1 from public.lease_charge_terms t where t.lease_id = any (lease_ids)
        union all
        select 1 from public.maintenance_requests m where m.lease_id = any (lease_ids)
        union all
        select 1 from public.receipts r where r.lease_id = any (lease_ids)
      ) then
        raise exception 'an imported lease now has financial or repair history; rollback refused'
          using errcode = '23503';
      end if;

      delete from public.lease_deposits where lease_id = any (lease_ids);
      delete from public.lease_parties where lease_id = any (lease_ids);
      delete from public.leases where id = any (lease_ids);
      affected := affected + 1;
    end if;

    select array_agg(entity_id) into tenant_ids
    from public.import_batch_entities
    where batch_id = batch.id and entity_type = 'tenant';

    if tenant_ids is not null then
      if exists (
        select 1 from public.lease_parties lp where lp.tenant_id = any (tenant_ids)
        union all
        select 1 from public.payments p where p.tenant_id = any (tenant_ids)
        union all
        select 1 from public.maintenance_requests m where m.tenant_id = any (tenant_ids)
      ) then
        raise exception 'an imported tenant now has other tenancy history; rollback refused'
          using errcode = '23503';
      end if;

      delete from public.tenants where id = any (tenant_ids);
    end if;
  elsif batch.kind = 'opening_balances' then
    if exists (
      select 1
      from public.payment_allocations a
      where a.charge_id in (
        select entity_id from public.import_batch_entities
        where batch_id = batch.id and entity_type = 'charge'
      )
    ) then
      raise exception 'an opening balance charge has since been paid; rollback refused'
        using errcode = '23503';
    end if;

    for e in
      select entity_type, entity_id
      from public.import_batch_entities
      where batch_id = batch.id
    loop
      if e.entity_type = 'charge' then
        update public.charges
        set status = 'cancelled',
            cancelled_at = now(),
            cancelled_by = auth.uid(),
            cancellation_reason = 'Opening balance import rolled back'
        where id = e.entity_id
          and status = 'open';
        affected := affected + 1;
      elsif e.entity_type = 'payment' then
        perform public.reverse_payment(e.entity_id, 'Opening balance import rolled back');
        affected := affected + 1;
      elsif e.entity_type = 'ledger_entry' then
        insert into public.landlord_ledger_entries (
          organisation_id, landlord_id, property_id, entry_kind, funds_class,
          amount_kobo, occurred_on, description, reverses_entry_id, created_by
        )
        select
          entry.organisation_id,
          entry.landlord_id,
          entry.property_id,
          'adjustment',
          entry.funds_class,
          -entry.amount_kobo,
          current_date,
          'Rollback of opening balance import',
          entry.id,
          auth.uid()
        from public.landlord_ledger_entries entry
        where entry.id = e.entity_id;
        affected := affected + 1;
      end if;
    end loop;

    update public.organisations
    set opening_balances_cutover_on = null,
        opening_balances_confirmed_at = null
    where id = batch.organisation_id;
  else
    raise exception 'batch kind % cannot be rolled back', batch.kind using errcode = '22023';
  end if;

  update public.import_batches
  set status = 'rolled_back',
      rolled_back_at = now(),
      rolled_back_by = auth.uid()
  where id = batch.id;

  return affected;
end;
$$;

revoke all on function public.apply_tenant_lease_import (uuid)
from
  public;

revoke all on function public.apply_opening_balance_import (uuid)
from
  public;

revoke all on function public.rollback_import_batch (uuid)
from
  public;

grant
execute on function public.apply_tenant_lease_import (uuid) to authenticated;

grant
execute on function public.apply_opening_balance_import (uuid) to authenticated;

grant
execute on function public.rollback_import_batch (uuid) to authenticated;
