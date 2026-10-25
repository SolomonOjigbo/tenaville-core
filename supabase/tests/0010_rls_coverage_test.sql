-- Schema-wide access-control guards (ORG-8, PRD §10.8, §16.2).
--
-- These assertions are deliberately written over the catalogue rather than
-- table by table, so a table added in a later release is covered the day it
-- lands. A new table that forgets RLS fails this test without anyone having to
-- remember to extend it.
begin;

select
  plan (6);

-- A table without RLS enabled denies nothing, which is the dangerous default.
select
  is_empty (
    $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
  $$,
    'every table in public has row level security enabled (ORG-8)'
  );

-- A table with RLS enabled but no policy denies everything, which is a
-- different bug: it fails closed, loudly, but it is still a mistake.
select
  is_empty (
    $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity
      and not exists (
        select 1 from pg_policies p
        where p.schemaname = 'public' and p.tablename = c.relname
      )
  $$,
    'every RLS-enabled table in public has at least one policy'
  );

-- Organisation scoping is the boundary, so the column must be present and
-- non-nullable wherever a table is organisation-scoped. A nullable
-- organisation_id is a row that belongs to no tenant and therefore escapes
-- every policy. Two tables legitimately allow null and are listed explicitly.
select
  is_empty (
    $$
    select table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'organisation_id'
      and is_nullable = 'YES'
      and table_name not in ('device_sessions', 'audit_events')
  $$,
    'organisation_id is not nullable except where documented (device_sessions, audit_events)'
  );

-- anon must reach nothing: there is no unauthenticated read surface (PROP-9).
select
  is_empty (
    $$
    select distinct g.table_name
    from information_schema.role_table_grants g
    join pg_class c on c.relname = g.table_name
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    where g.table_schema = 'public'
      and g.grantee = 'anon'
      -- Exclude objects owned by an extension (pgTAP installs views here).
      and not exists (
        select 1 from pg_depend d
        where d.objid = c.oid and d.deptype = 'e'
      )
  $$,
    'anon holds no grants on our tables in public (PROP-9)'
  );

-- The helper that every policy depends on must not be callable in a way that
-- lets a caller shadow its tables.
select
  is (
    (
      select
        array_to_string(proconfig, ',')
      from
        pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
      where
        n.nspname = 'app'
        and p.proname = 'current_organisation_ids'
    ),
    'search_path=""',
    'app.current_organisation_ids pins an empty search_path'
  );

select
  is (
    (
      select
        prosecdef
      from
        pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
      where
        n.nspname = 'app'
        and p.proname = 'current_organisation_ids'
    ),
    true,
    'app.current_organisation_ids is security definer, so membership policies do not recurse'
  );

select
  *
from
  finish ();

rollback;
