-- Schema-wide access-control guards (ORG-8, PRD §10.8, §16.2).
--
-- These assertions are written over the catalogue rather than table by table,
-- so a table or view added in a later release is covered the day it lands. A
-- new table that forgets RLS fails this test without anyone having to remember
-- to extend it.

begin;
select plan(7);

-- A table without RLS enabled denies nothing, which is the dangerous default.
select is_empty(
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

-- A table with RLS enabled but no policy denies everything: a different bug,
-- which fails closed and loudly, but still a mistake.
select is_empty(
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

-- A nullable organisation_id is a row belonging to no tenant, which escapes
-- every policy. Base tables only: a view's columns are always reported
-- nullable and a view holds no rows of its own.
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join information_schema.columns col
      on col.table_schema = 'public'
     and col.table_name = c.relname
     and col.column_name = 'organisation_id'
    where n.nspname = 'public'
      and c.relkind = 'r'
      and col.is_nullable = 'YES'
      and c.relname not in ('device_sessions', 'audit_events')
  $$,
  'organisation_id is not nullable on base tables except where documented'
);

-- A view without security_invoker runs as its owner, bypassing the policies on
-- the tables beneath it. Any view we add must set it.
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'v'
      and not exists (
        select 1 from unnest(coalesce(c.reloptions, '{}')) opt
        where opt = 'security_invoker=true'
      )
      and not exists (
        select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e'
      )
  $$,
  'every view in public sets security_invoker, so RLS is not bypassed'
);

-- anon must reach nothing: there is no unauthenticated read surface (PROP-9).
select is_empty(
  $$
    select distinct g.table_name
    from information_schema.role_table_grants g
    join pg_class c on c.relname = g.table_name
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    where g.table_schema = 'public'
      and g.grantee = 'anon'
      and not exists (
        select 1 from pg_depend d
        where d.objid = c.oid and d.deptype = 'e'
      )
  $$,
  'anon holds no grants on our tables in public (PROP-9)'
);

-- The helper every policy depends on must not be callable in a way that lets a
-- caller shadow its tables.
select is(
  (
    select array_to_string(proconfig, ',')
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proname = 'current_organisation_ids'
  ),
  'search_path=""',
  'app.current_organisation_ids pins an empty search_path'
);

select is(
  (
    select prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proname = 'current_organisation_ids'
  ),
  true,
  'app.current_organisation_ids is security definer, so membership policies do not recurse'
);

select * from finish();
rollback;
