-- Remove the three demo organisations and everything under them, so the seed can run again.
--
-- STAGING / LOCAL ONLY. Run in the Supabase SQL editor (or psql) as the `postgres` role.
--
-- Why this is SQL and not a seed flag: payments, receipts, ledger entries and audit events are
-- append-only by design (CLAUDE.md invariant 1), and their foreign keys are RESTRICT. A client
-- cannot delete them, and it should not be able to. This script switches triggers and FK
-- enforcement off for one transaction (session_replication_role = replica), deletes every row
-- carrying a demo organisation_id table by table, then removes the demo organisations and the
-- demo logins (auth users created by the seed carry user_metadata.demo = true).
--
-- It touches only rows belonging to organisations with the three demo names below.

begin;

set local session_replication_role = replica;

do $$
declare
  demo_org_ids uuid[];
  demo_user_ids uuid[];
  t record;
begin
  select array_agg(id) into demo_org_ids
  from public.organisations
  where name in (
    'Harbourview Property Partners',
    'Garki Gate Estates',
    'Nwosu Family Properties'
  );

  if demo_org_ids is null then
    raise notice 'No demo organisations found; nothing to reset.';
    return;
  end if;

  -- Logins to remove: members of demo organisations that the seed created, and who belong to no
  -- other organisation.
  select array_agg(distinct m.user_id) into demo_user_ids
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where m.organisation_id = any (demo_org_ids)
    and coalesce(u.raw_user_meta_data ->> 'demo', 'false') = 'true'
    and not exists (
      select 1 from public.memberships other
      where other.user_id = m.user_id and other.organisation_id <> all (demo_org_ids)
    );

  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'organisation_id'
      and tb.table_type = 'BASE TABLE'
      and c.table_name <> 'organisations'
  loop
    execute format('delete from public.%I where organisation_id = any ($1)', t.table_name)
      using demo_org_ids;
  end loop;

  -- Organisation-level audit events carry the organisation as their entity, not as organisation_id.
  delete from public.audit_events
  where entity_type = 'organisation' and entity_id = any (demo_org_ids::text[]);

  delete from public.organisations where id = any (demo_org_ids);

  if demo_user_ids is not null then
    delete from public.users where id = any (demo_user_ids);
    delete from auth.users where id = any (demo_user_ids);
  end if;

  raise notice 'Removed % demo organisation(s) and % demo login(s).',
    array_length(demo_org_ids, 1), coalesce(array_length(demo_user_ids, 1), 0);
end
$$;

commit;
