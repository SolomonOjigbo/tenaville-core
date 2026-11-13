-- Document registry (DOC-1, DOC-2, DOC-5, DOC-7).
--
-- The storage bucket already holds private objects and the download route
-- already mints short-lived signed URLs after checking the owning record. What
-- was missing is the register: what the file is, when it was issued, when it
-- expires, what it is attached to, and how big it is.
--
-- The file lives in storage; this table is the authoritative record. A path
-- without a row is not listed and cannot be downloaded through the UI, and a
-- row without an object is a broken reference the office has to fix.
-- ---------------------------------------------------------------------------
create type public.document_type as enum(
  'lease_agreement',
  'tenancy_agreement',
  'identification',
  'proof_of_ownership',
  'inspection_report',
  'insurance',
  'receipt',
  'statement',
  'notice',
  'photo',
  'other'
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  entity_type text not null check (
    entity_type in (
      'property',
      'unit',
      'landlord',
      'tenant',
      'lease',
      'deposit_deduction',
      'handover',
      'maintenance_request',
      'payment'
    )
  ),
  entity_id uuid not null,
  bucket text not null default 'documents' check (bucket in ('documents', 'maintenance')),
  storage_path text not null check (length(btrim(storage_path)) between 3 and 800),
  file_name text not null check (length(btrim(file_name)) between 1 and 300),
  mime_type text,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  document_type public.document_type not null default 'other',
  title text check (length(btrim(title)) between 1 and 240),
  issue_date date,
  expiry_date date,
  notes text check (length(btrim(notes)) between 1 and 2000),
  sensitive boolean not null default false,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint documents_expiry_after_issue check (
    expiry_date is null
    or issue_date is null
    or expiry_date >= issue_date
  ),
  unique (bucket, storage_path)
);

create index documents_entity_idx on public.documents (organisation_id, entity_type, entity_id);

create index documents_expiry_idx on public.documents (organisation_id, expiry_date)
where
  expiry_date is not null;

create trigger documents_touch_updated_at
before update on public.documents for each row
execute function app.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Reachability of the record a document is attached to
--
-- Read through a definer function for the same reason the property and lease
-- helpers are: a policy that joins several RLS-protected tables back into
-- itself recurses.
-- ---------------------------------------------------------------------------
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
    else app.is_staff (target_organisation_id)
  end
$$;

comment on function app.can_reach_document_entity is 'DOC-2: whether the caller may reach the record a document is attached to. Staff reach their organisation; a landlord a property they own; a tenant their tenancy or repair.';

grant
execute on function app.can_reach_document_entity (uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.documents enable row level security;

create policy documents_select_reachable on public.documents for
select
  to authenticated using (
    organisation_id in (
      select
        app.current_organisation_ids ()
    )
    and (
      app.is_staff (organisation_id)
      or app.can_reach_document_entity (organisation_id, entity_type, entity_id)
    )
  );

create policy documents_insert_staff on public.documents for insert to authenticated
with
  check (
    app.has_role (
      organisation_id,
      array[
        'owner',
        'admin',
        'property_manager',
        'letting_agent',
        'caretaker',
        'maintenance_coordinator',
        'accountant'
      ]::public.app_role[]
    )
    and app.can_reach_document_entity (organisation_id, entity_type, entity_id)
  );

create policy documents_update_staff on public.documents
for update
  to authenticated using (
    app.has_role (
      organisation_id,
      array[
        'owner',
        'admin',
        'property_manager',
        'letting_agent',
        'caretaker',
        'maintenance_coordinator',
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
        'letting_agent',
        'caretaker',
        'maintenance_coordinator',
        'accountant'
      ]::public.app_role[]
    )
  );

-- ---------------------------------------------------------------------------
-- Expiry tasks (DOC-5)
-- ---------------------------------------------------------------------------
create or replace function public.generate_document_expiry_tasks (
  p_organisation_id uuid,
  p_days_ahead integer default 30
) returns integer language plpgsql security definer
set
  search_path = '' as $$
declare
  v_created integer;
begin
  if not app.has_role (
    p_organisation_id,
    array[
      'owner',
      'admin',
      'property_manager',
      'letting_agent',
      'caretaker',
      'maintenance_coordinator',
      'accountant'
    ]::public.app_role[]
  ) then
    raise exception 'your role cannot generate document alerts' using errcode = '42501';
  end if;

  insert into public.tasks (
    organisation_id, title, notes, owner_user_id, due_on, priority,
    related_type, related_id, dedupe_key, created_by
  )
  select
    p_organisation_id,
    case when document.expiry_date < current_date
      then 'Document expired · '
      else 'Document expiring · ' end ||
      coalesce(document.title, document.file_name),
    coalesce(document.title, document.file_name) || ' (' ||
      replace(document.document_type::text, '_', ' ') || ') for ' ||
      replace(document.entity_type, '_', ' ') || ' expires on ' ||
      to_char(document.expiry_date, 'DD Mon YYYY') || '.',
    auth.uid (),
    document.expiry_date,
    case
      when document.expiry_date < current_date then 'urgent'::public.task_priority
      when document.expiry_date <= current_date + 7 then 'high'::public.task_priority
      else 'normal'::public.task_priority
    end,
    'document',
    document.id,
    'document_expiry:' || document.id::text,
    auth.uid ()
  from public.documents document
  where document.organisation_id = p_organisation_id
    and document.expiry_date is not null
    and document.expiry_date <= current_date + greatest(p_days_ahead, 0)
  on conflict (organisation_id, dedupe_key) where dedupe_key is not null do nothing;

  get diagnostics v_created = row_count;
  return v_created;
end;
$$;

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------
create trigger documents_audit
after insert or update or delete on public.documents for each row
execute function app.audit_row_change ('document');

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant
select
,
  insert,
update on public.documents to authenticated;

revoke all on public.documents
from
  anon;

revoke all on function public.generate_document_expiry_tasks (uuid, integer)
from
  public;

grant
execute on function public.generate_document_expiry_tasks (uuid, integer) to authenticated;
