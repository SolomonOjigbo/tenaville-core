-- TV-014: private file storage (DOC-7, and the "sensitive document access"
-- clause of ORG-5).
--
-- DOC-7 has two obligations: never expose a document through a guessable
-- public URL, and enforce authorisation at download time.
--
-- How they are met, and where each is enforced:
--
--   1. Buckets are private, declared in config.toml. There is no public
--      bucket, so there is no guessable URL to find.
--   2. A download is only ever a signed URL, minted server-side after the
--      caller has been checked against the record the file belongs to — and
--      that check reads the record through the caller's own client, so the
--      row-level policies already tested in this suite are what decide it.
--   3. Storage's own row-level policies are a second barrier, below.
--
-- The signed URL is the sharp edge: once minted it is a bearer token and works
-- for anyone holding it until it expires. That is why the lifetime is minutes
-- rather than hours, and why minting is the moment authorisation happens.
-- ---------------------------------------------------------------------------
-- Object path convention
--
-- <organisation_id>/<entity_type>/<entity_id>/<object_id>-<filename>
--
-- The organisation comes first so a storage policy can enforce tenant
-- isolation on the prefix alone, without joining anything.
-- ---------------------------------------------------------------------------
create or replace function app.storage_organisation_id (object_name text) returns uuid language plpgsql immutable
set
  search_path = '' as $$
declare
  first_segment text := split_part(object_name, '/', 1);
begin
  -- A path that does not start with a uuid belongs to no organisation and is
  -- therefore reachable by nobody.
  return first_segment::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

comment on function app.storage_organisation_id is 'The organisation a storage object belongs to, from the first path segment. Null when the path does not start with a uuid, which denies access.';

-- ---------------------------------------------------------------------------
-- Storage policies
--
-- Guarded, because storage.objects is created by the Storage service''s own
-- migrations and does not exist in a bare Postgres image — which is what the
-- test harness and CI run. These policies are therefore *not* covered by the
-- pgTAP suite, and that is recorded in docs/architecture/provider-adapters.md.
--
-- They are a second barrier rather than the primary control: the application
-- never hands a storage client to a browser. If that ever changes, these
-- become load-bearing and need a test environment that can exercise them.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'storage.objects not present; skipping storage policies (bare Postgres)';
    return;
  end if;

  execute $policy$
    create policy storage_objects_select_own_organisation on storage.objects
      for select to authenticated
      using (
        bucket_id in ('documents', 'maintenance')
        and app.storage_organisation_id(name) in (select app.current_organisation_ids())
      )
  $policy$;

  execute $policy$
    create policy storage_objects_insert_own_organisation on storage.objects
      for insert to authenticated
      with check (
        bucket_id in ('documents', 'maintenance')
        and app.storage_organisation_id(name) in (select app.current_organisation_ids())
      )
  $policy$;

  -- No update or delete policy. A document that has been attached to a lease or
  -- a deposit deduction is evidence; replacing or removing it silently is the
  -- thing an audit trail exists to prevent (PRD §10.13).
end
$$;

-- ---------------------------------------------------------------------------
-- Recording document access (ORG-5)
--
-- ORG-5 requires audit events for sensitive document access. Reads are not
-- usually audited — but a deposit-deduction photograph or a tenant's
-- identity document is exactly the access a dispute asks about later.
--
-- security definer because audit_events is insert-only to service_role: a
-- member must not be able to forge entries, but their own downloads must be
-- recorded. The function derives the actor from auth.uid() and the caller
-- cannot choose it.
-- ---------------------------------------------------------------------------
create or replace function public.record_document_access (
  target_organisation_id uuid,
  object_bucket text,
  object_path text,
  entity_type text,
  entity_id text
) returns void language plpgsql security definer
set
  search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- Only for an organisation the caller actually belongs to, so this cannot be
  -- used to write entries into somebody else's trail.
  if not app.is_member(target_organisation_id) then
    raise exception 'not a member of that organisation' using errcode = '42501';
  end if;

  insert into public.audit_events (
    organisation_id, actor_user_id, actor_label, action, entity_type, entity_id, after
  )
  values (
    target_organisation_id,
    auth.uid(),
    auth.email(),
    'document.accessed',
    entity_type,
    entity_id,
    jsonb_build_object('bucket', object_bucket, 'path', object_path)
  );
end;
$$;

grant
execute on function public.record_document_access (uuid, text, text, text, text) to authenticated;

grant
execute on function app.storage_organisation_id (text) to authenticated;

comment on function public.record_document_access is 'ORG-5: records that a document was opened. The actor comes from auth.uid(), never from an argument.';

-- ---------------------------------------------------------------------------
-- One SQLSTATE for every append-only refusal
--
-- app.deny_mutation (audit_events) raised the default P0001, while
-- app.deny_deduction_rewrite (deposit_deductions) raises 42501. Application
-- code cannot handle "this record is append-only" with a single check while
-- the two disagree, and a test comparing them is what surfaced it.
--
-- 42501, insufficient_privilege, is the accurate one: the operation is
-- refused because nobody has the privilege to perform it, not because of a
-- data problem.
--
-- Replaced here rather than edited in place: the original migration has been
-- applied, and migrations are forward-only.
-- ---------------------------------------------------------------------------
create or replace function app.deny_mutation () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  raise exception
    '% on % is not permitted: this table is append-only',
    tg_op, tg_table_name
    using errcode = '42501',
          hint = 'Record a correcting entry instead (PRD §10.2, §10.7).';
end;
$$;
