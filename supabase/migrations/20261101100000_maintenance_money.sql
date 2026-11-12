-- Maintenance money (MAINT-10, MAINT-11, TV-050).
--
-- A cost line already records who should bear it. This migration makes that
-- decision reach the money: a landlord cost is a negative ledger entry, a
-- tenant cost is a repair charge on the tenancy, and agency/service-charge
-- costs stay in the maintenance record until those ledgers exist.
--
-- Posting happens once per cost. The unique index on maintenance_cost_id is the
-- idempotency key; the approval path and the insert trigger cannot both post
-- the same line.
-- ---------------------------------------------------------------------------
alter type public.ledger_entry_kind
add value if not exists 'maintenance_cost';

alter type public.charge_kind
add value if not exists 'repair';

alter table public.landlord_ledger_entries
add column maintenance_cost_id uuid references public.maintenance_costs (id) on delete restrict;

create unique index ledger_entries_maintenance_cost_idx on public.landlord_ledger_entries (maintenance_cost_id)
where
  maintenance_cost_id is not null;

alter table public.charges
add column maintenance_cost_id uuid references public.maintenance_costs (id) on delete restrict;

create unique index charges_maintenance_cost_idx on public.charges (maintenance_cost_id)
where
  maintenance_cost_id is not null;

-- A maintenance cost is money out of the landlord's client funds, so it is
-- signed like commission and a remittance. Rebuild the sign constraint rather
-- than leaving the new kind to fall through to "adjustment or opening".
alter table public.landlord_ledger_entries
drop constraint ledger_sign_matches_kind;

alter table public.landlord_ledger_entries
add constraint ledger_sign_matches_kind check (
  (
    entry_kind = 'rent_collected'
    and amount_kobo > 0
  )
  or (
    entry_kind not in ('rent_collected', 'adjustment', 'opening_balance')
    and amount_kobo < 0
  )
  or entry_kind in ('adjustment', 'opening_balance')
);

-- ---------------------------------------------------------------------------
-- Posting one cost
-- ---------------------------------------------------------------------------
create or replace function app.post_maintenance_cost_money (target_cost_id uuid) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  v_cost public.maintenance_costs;
  v_request public.maintenance_requests;
  v_landlord uuid;
  v_sequence integer;
  v_description text;
  v_lease_starts date;
  v_lease_ends date;
  v_term_start date;
  v_term_end date;
  v_term uuid;
begin
  select * into v_cost
  from public.maintenance_costs
  where id = target_cost_id;

  if v_cost.id is null then
    return;
  end if;

  -- Already posted by the other path (insert trigger or approval trigger).
  if exists (
    select 1 from public.landlord_ledger_entries l
    where l.maintenance_cost_id = target_cost_id
  ) or exists (
    select 1 from public.charges c
    where c.maintenance_cost_id = target_cost_id
  ) then
    return;
  end if;

  select * into v_request
  from public.maintenance_requests
  where id = v_cost.request_id;

  select p.landlord_id into v_landlord
  from public.properties p
  where p.id = v_request.property_id;

  v_description := 'Maintenance: ' || left(v_cost.description, 250);

  if v_cost.payer = 'landlord' then
    insert into public.landlord_ledger_entries (
      organisation_id, landlord_id, property_id, entry_kind, funds_class,
      amount_kobo, occurred_on, description, maintenance_cost_id, created_by
    )
    values (
      v_cost.organisation_id,
      v_landlord,
      v_request.property_id,
      'maintenance_cost',
      'client_funds',
      -v_cost.amount_kobo,
      current_date,
      v_description,
      target_cost_id,
      v_cost.recorded_by
    );
  elsif v_cost.payer = 'tenant' then
    if v_request.lease_id is null then
      raise exception 'a tenant-borne cost needs a tenancy to charge'
        using errcode = '23514',
              hint = 'Attach the repair to a lease, or record the cost against another payer.';
    end if;

    select l.starts_on, l.ends_on into v_lease_starts, v_lease_ends
    from public.leases l
    where l.id = v_request.lease_id;

    v_term_start := greatest(current_date, v_lease_starts);
    v_term_end := least(current_date, v_lease_ends);

    if v_term_start > v_term_end then
      raise exception 'the tenancy has ended; a repair charge cannot be raised on it'
        using errcode = '23514';
    end if;

    -- Non-rent charges need the agreement they came from (TV-154). A repair
    -- recharge is a one-off term, so it still names its description and is
    -- visible on the tenancy like any other agreed charge.
    insert into public.lease_charge_terms (
      organisation_id, lease_id, kind, description, amount_kobo, frequency,
      starts_on, ends_on, created_by
    )
    values (
      v_cost.organisation_id, v_request.lease_id, 'repair', left(v_cost.description, 200),
      v_cost.amount_kobo, 'one_off', v_term_start, v_term_end, v_cost.recorded_by
    )
    returning id into v_term;

    select coalesce(max(c.sequence), 0) + 1 into v_sequence
    from public.charges c
    where c.lease_id = v_request.lease_id and c.kind = 'repair';

    insert into public.charges (
      organisation_id, lease_id, kind, sequence, period_start, period_end,
      due_on, amount_kobo, status, charge_term_id, maintenance_cost_id, created_by
    )
    values (
      v_cost.organisation_id,
      v_request.lease_id,
      'repair',
      v_sequence,
      v_term_start,
      v_term_end,
      v_term_start,
      v_cost.amount_kobo,
      'open',
      v_term,
      target_cost_id,
      v_cost.recorded_by
    );
  end if;
end;
$$;

-- A cost below the threshold has no approval row, so it posts immediately. A
-- cost above it waits for the approval trigger below.
create or replace function app.post_maintenance_cost_on_insert () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if not new.requires_approval then
    perform app.post_maintenance_cost_money (new.id);
  end if;
  return new;
end;
$$;

create trigger maintenance_costs_post_money
after insert on public.maintenance_costs for each row
execute function app.post_maintenance_cost_on_insert ();

create or replace function app.post_maintenance_cost_on_approval () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    perform app.post_maintenance_cost_money (new.cost_id);
  end if;
  return new;
end;
$$;

create trigger maintenance_approvals_post_money
after update of status on public.maintenance_approvals for each row
execute function app.post_maintenance_cost_on_approval ();

revoke all on function app.post_maintenance_cost_money (uuid)
from
  public;

revoke all on function app.post_maintenance_cost_on_insert ()
from
  public;

revoke all on function app.post_maintenance_cost_on_approval ()
from
  public;
