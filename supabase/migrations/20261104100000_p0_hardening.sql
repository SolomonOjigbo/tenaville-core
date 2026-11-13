-- P0 lifecycle hardening: devices, notifications, deposit settlement, lease
-- termination, ledger evidence and tenant maintenance media.
-- ---------------------------------------------------------------------------
-- Device identity (ORG-9)
--
-- The existing table records sessions but has no stable per-browser key, so a
-- middleware request cannot tell which row is "this device". A random cookie
-- plus a unique (user, device_key) pair makes revocation enforceable at the
-- application boundary.
-- ---------------------------------------------------------------------------
alter table public.device_sessions
add column device_key text check (length(device_key) between 8 and 100);

alter table public.device_sessions
add column user_agent text check (length(user_agent) <= 500);

alter table public.device_sessions
add constraint device_sessions_user_device_key_key unique (user_id, device_key);

-- ---------------------------------------------------------------------------
-- In-app notifications (MAINT-12)
--
-- Outbound WhatsApp/SMS is not connected yet. The tenant portal still needs a
-- durable acknowledgement/status/completion notice independent of a provider,
-- so notifications are recorded in the database and surfaced in the portal.
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (length(btrim(kind)) between 2 and 60),
  title text not null check (length(btrim(title)) between 2 and 200),
  body text not null check (length(btrim(body)) between 2 and 2000),
  related_type text check (length(btrim(related_type)) between 2 and 60),
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create index notifications_unread_idx on public.notifications (user_id)
where
  read_at is null;

alter table public.notifications enable row level security;

create policy notifications_select_self on public.notifications for
select
  to authenticated using (user_id = auth.uid ());

create policy notifications_update_self on public.notifications
for update
  to authenticated using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

grant
select
  on public.notifications to authenticated;

-- Only the read marker is user-writable. The notice itself is a record of what
-- the agency told the tenant and must not be editable by its recipient.
grant
update (read_at) on public.notifications to authenticated;

revoke all on public.notifications
from
  anon;

-- ---------------------------------------------------------------------------
-- Maintenance notices to the tenant
-- ---------------------------------------------------------------------------
create or replace function app.notify_maintenance_tenant () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  tenant_user uuid;
  title text;
  body text;
begin
  if new.tenant_id is null then
    return new;
  end if;

  select t.user_id into tenant_user
  from public.tenants t
  where t.id = new.tenant_id;

  if tenant_user is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    title := 'Repair request received';
    body := 'The agency has received your ' || replace(new.category::text, '_', ' ') || ' request.';
  elsif new.status is distinct from old.status then
    title := 'Repair status updated';
    body := 'Your repair is now ' || replace(new.status::text, '_', ' ') || '.';
  elsif new.assignee_user_id is distinct from old.assignee_user_id
        or new.vendor_id is distinct from old.vendor_id
        or new.due_on is distinct from old.due_on then
    title := 'Repair assignment updated';
    body := 'The agency has updated who is handling your repair or when it is due.';
  else
    return new;
  end if;

  insert into public.notifications (
    organisation_id, user_id, kind, title, body, related_type, related_id
  )
  values (
    new.organisation_id, tenant_user, 'maintenance', title, body,
    'maintenance_request', new.id
  );

  return new;
end;
$$;

create trigger maintenance_requests_notify_tenant
after insert or update on public.maintenance_requests for each row
execute function app.notify_maintenance_tenant ();

-- ---------------------------------------------------------------------------
-- Documents: ledger evidence and tenant repair media
-- ---------------------------------------------------------------------------
alter table public.documents
drop constraint documents_entity_type_check;

alter table public.documents
add constraint documents_entity_type_check check (
  entity_type in (
    'property',
    'unit',
    'landlord',
    'tenant',
    'lease',
    'deposit_deduction',
    'handover',
    'maintenance_request',
    'payment',
    'ledger_entry'
  )
);

-- A tenant may attach a photo or document to a repair that belongs to them,
-- through the same private registry the staff uses.
create policy documents_insert_tenant_maintenance on public.documents for insert to authenticated
with
  check (
    entity_type = 'maintenance_request'
    and organisation_id in (
      select
        app.current_organisation_ids ()
    )
    and exists (
      select
        1
      from
        public.maintenance_requests mr
      where
        mr.id = entity_id
        and mr.organisation_id = documents.organisation_id
        and mr.tenant_id in (
          select
            app.current_tenant_ids ()
        )
    )
  );

-- Evidence attached to a ledger entry is readable by finance staff and by the
-- landlord whose ledger it is.
create policy documents_select_ledger_evidence on public.documents for
select
  to authenticated using (
    entity_type = 'ledger_entry'
    and exists (
      select
        1
      from
        public.landlord_ledger_entries entry
      where
        entry.id = documents.entity_id
        and entry.organisation_id = documents.organisation_id
        and (
          app.is_staff (documents.organisation_id)
          or entry.landlord_id in (
            select
              app.current_landlord_ids ()
          )
        )
    )
  );

-- The shared document-visibility helper must know the new entity, because the
-- staff insert policy calls it as well as the select policy.
create or replace function app.can_reach_document_entity (
  target_organisation_id uuid,
  target_entity_type text,
  target_entity_id uuid
) returns boolean language sql stable security definer
set
  search_path = '' as $$
  select case target_entity_type
    when 'property' then exists (
      select 1 from public.properties p
      where p.id = target_entity_id
        and p.organisation_id = target_organisation_id
        and (
          app.is_staff (target_organisation_id)
          or p.landlord_id in (select app.current_landlord_ids ())
        )
    )
    when 'unit' then exists (
      select 1
      from public.units u
      join public.properties p on p.id = u.property_id
      where u.id = target_entity_id
        and u.organisation_id = target_organisation_id
        and (
          app.is_staff (target_organisation_id)
          or p.landlord_id in (select app.current_landlord_ids ())
        )
    )
    when 'landlord' then
      app.is_staff (target_organisation_id)
      or target_entity_id in (select app.current_landlord_ids ())
    when 'tenant' then
      app.is_staff (target_organisation_id)
      or target_entity_id in (select app.current_tenant_ids ())
    when 'lease' then app.can_reach_lease (target_entity_id)
    when 'maintenance_request' then app.can_reach_maintenance_request (target_entity_id)
    when 'payment' then exists (
      select 1 from public.payments payment
      where payment.id = target_entity_id
        and app.can_reach_lease (payment.lease_id)
    )
    when 'ledger_entry' then exists (
      select 1 from public.landlord_ledger_entries entry
      where entry.id = target_entity_id
        and entry.organisation_id = target_organisation_id
        and (
          app.is_staff (target_organisation_id)
          or entry.landlord_id in (select app.current_landlord_ids ())
        )
    )
    else app.is_staff (target_organisation_id)
  end
$$;

-- ---------------------------------------------------------------------------
-- Lease termination (LEASE-3, LEASE-5)
-- ---------------------------------------------------------------------------
create or replace function public.terminate_lease (
  p_lease_id uuid,
  p_terminated_on date,
  p_reason text
) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  v_lease public.leases;
  v_tenant_user uuid;
begin
  select * into v_lease from public.leases where id = p_lease_id;
  if v_lease.id is null then
    raise exception 'the lease was not found' using errcode = '22023';
  end if;

  if not app.has_role (
    v_lease.organisation_id,
    array['owner', 'admin', 'property_manager']::public.app_role[]
  ) or not app.can_reach_lease (p_lease_id) then
    raise exception 'your role cannot terminate this lease' using errcode = '42501';
  end if;

  if v_lease.status in ('terminated', 'expired', 'renewed') then
    raise exception 'the lease is already finished' using errcode = '23514';
  end if;

  if p_terminated_on is null or p_terminated_on < v_lease.starts_on then
    raise exception 'the termination date must be on or after the lease start'
      using errcode = '22023';
  end if;

  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'give a reason for termination' using errcode = '22023';
  end if;

  perform set_config('app.audit_reason', btrim(p_reason), true);

  update public.leases
  set status = 'terminated',
      terminated_on = p_terminated_on,
      termination_reason = btrim(p_reason)
  where id = p_lease_id;

  select t.user_id into v_tenant_user
  from public.lease_parties lp
  join public.tenants t on t.id = lp.tenant_id
  where lp.lease_id = p_lease_id and lp.role = 'tenant'
  limit 1;

  if v_tenant_user is not null then
    insert into public.notifications (
      organisation_id, user_id, kind, title, body, related_type, related_id
    )
    values (
      v_lease.organisation_id, v_tenant_user, 'tenancy',
      'Tenancy ending', 'The agency has recorded the end of this tenancy on ' ||
        to_char(p_terminated_on, 'DD Mon YYYY') || '.',
      'lease', p_lease_id
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Deposit settlement (LEASE-13)
-- ---------------------------------------------------------------------------
alter table public.lease_deposits
add column refunded_amount_kobo bigint not null default 0 check (refunded_amount_kobo >= 0);

alter table public.lease_deposits
add column forfeited_amount_kobo bigint not null default 0 check (forfeited_amount_kobo >= 0);

alter table public.lease_deposits
add constraint lease_deposits_settlement_within_amount check (
  refunded_amount_kobo + forfeited_amount_kobo <= amount_kobo
);

create or replace function public.settle_deposit (
  p_deposit_id uuid,
  p_outcome text,
  p_settled_on date,
  p_transferred_to_lease_id uuid default null,
  p_notes text default null
) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  v_deposit public.lease_deposits;
  v_deductions bigint;
  v_refund bigint;
  v_tenant_user uuid;
begin
  select * into v_deposit from public.lease_deposits where id = p_deposit_id;
  if v_deposit.id is null then
    raise exception 'the deposit was not found' using errcode = '22023';
  end if;

  if not app.has_role (
    v_deposit.organisation_id,
    array['owner', 'admin', 'property_manager', 'accountant']::public.app_role[]
  ) or not app.can_reach_lease (v_deposit.lease_id) then
    raise exception 'your role cannot settle this deposit' using errcode = '42501';
  end if;

  if v_deposit.status <> 'held' or v_deposit.settled_on is not null then
    raise exception 'only a held deposit can be settled' using errcode = '23514';
  end if;

  if p_outcome not in ('refund', 'forfeit', 'transfer') then
    raise exception 'choose refund, forfeit or transfer' using errcode = '22023';
  end if;

  if p_settled_on is null then
    raise exception 'record the settlement date' using errcode = '22023';
  end if;

  select coalesce(sum(d.amount_kobo), 0) into v_deductions
  from public.deposit_deductions d
  where d.deposit_id = p_deposit_id
    and d.approved_at is not null
    and d.reverses_deduction_id is null
    and not exists (
      select 1
      from public.deposit_deductions reversal
      where reversal.reverses_deduction_id = d.id
    );

  if v_deductions > v_deposit.amount_kobo then
    raise exception 'approved deductions exceed the deposit' using errcode = '23514';
  end if;

  if p_outcome = 'transfer' then
    if p_transferred_to_lease_id is null or p_transferred_to_lease_id = v_deposit.lease_id then
      raise exception 'choose the lease receiving the transfer' using errcode = '22023';
    end if;
    if not app.can_reach_lease (p_transferred_to_lease_id)
       or not exists (
         select 1
         from public.leases target
         where target.id = p_transferred_to_lease_id
           and target.organisation_id = v_deposit.organisation_id
       ) then
      raise exception 'the receiving lease is not in this organisation' using errcode = '42501';
    end if;

    update public.lease_deposits
    set status = 'transferred', settled_on = p_settled_on,
        transferred_to_lease_id = p_transferred_to_lease_id,
        notes = nullif(btrim(p_notes), '')
    where id = p_deposit_id;
  else
    v_refund := case when p_outcome = 'refund'
      then v_deposit.amount_kobo - v_deductions
      else 0 end;

    update public.lease_deposits
    set status = (case
          when p_outcome = 'forfeit' then 'forfeited'
          when v_deductions > 0 then 'partially_refunded'
          else 'refunded'
        end)::public.deposit_status,
        settled_on = p_settled_on,
        refunded_amount_kobo = v_refund,
        forfeited_amount_kobo = case when p_outcome = 'forfeit'
          then v_deposit.amount_kobo
          else v_deductions end,
        notes = nullif(btrim(p_notes), '')
    where id = p_deposit_id;
  end if;

  select t.user_id into v_tenant_user
  from public.lease_parties lp
  join public.tenants t on t.id = lp.tenant_id
  where lp.lease_id = v_deposit.lease_id and lp.role = 'tenant'
  limit 1;

  if v_tenant_user is not null then
    insert into public.notifications (
      organisation_id, user_id, kind, title, body, related_type, related_id
    )
    values (
      v_deposit.organisation_id, v_tenant_user, 'deposit',
      'Deposit settled',
      case p_outcome
        when 'refund' then 'Your deposit has been settled with a refund recorded.'
        when 'forfeit' then 'Your deposit has been recorded as forfeited. Contact the agency if you disagree.'
        else 'Your deposit has been transferred to the next tenancy.'
      end,
      'lease_deposit', p_deposit_id
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.terminate_lease (uuid, date, text)
from
  public;

revoke all on function public.settle_deposit (uuid, text, date, uuid, text)
from
  public;

grant
execute on function public.terminate_lease (uuid, date, text) to authenticated;

grant
execute on function public.settle_deposit (uuid, text, date, uuid, text) to authenticated;
