-- Portal access (OWN-3, TENANT-1…TENANT-4).
--
-- The portal screens read through the user's own client, so the rows they are
-- allowed to see are decided here rather than by a page filter:
--
--   * A landlord sees the tenants who occupy their properties, and only issued
--     statements. A draft is internal working paper.
--   * A tenant sees the property and unit of their own lease. Without these
--     policies a tenancy screen could show the rent and nothing about where.
-- ---------------------------------------------------------------------------
drop policy if exists statements_select_landlord on public.statements;

create policy statements_select_landlord on public.statements for
select
  to authenticated using (
    landlord_id in (
      select
        app.current_landlord_ids ()
    )
    and status = 'issued'
  );

-- Policy expressions cannot join tables with RLS back to each other: the
-- policies would recurse (units -> properties -> units). These definer
-- helpers resolve the same sets once, outside RLS, exactly as
-- app.can_reach_property does.
create or replace function app.current_tenant_property_ids () returns setof uuid language sql stable security definer
set
  search_path = '' as $$
  select distinct u.property_id
  from public.lease_parties lp
  join public.leases l on l.id = lp.lease_id
  join public.units u on u.id = l.unit_id
  where lp.tenant_id in (select app.current_tenant_ids())
$$;

create or replace function app.current_tenant_unit_ids () returns setof uuid language sql stable security definer
set
  search_path = '' as $$
  select l.unit_id
  from public.leases l
  join public.lease_parties lp on lp.lease_id = l.id
  where lp.tenant_id in (select app.current_tenant_ids())
$$;

create or replace function app.landlord_tenant_ids () returns setof uuid language sql stable security definer
set
  search_path = '' as $$
  select lp.tenant_id
  from public.lease_parties lp
  join public.leases l on l.id = lp.lease_id
  join public.units u on u.id = l.unit_id
  join public.properties p on p.id = u.property_id
  where p.landlord_id in (select app.current_landlord_ids())
$$;

grant
execute on function app.current_tenant_property_ids () to authenticated;

grant
execute on function app.current_tenant_unit_ids () to authenticated;

grant
execute on function app.landlord_tenant_ids () to authenticated;

create policy tenants_select_landlord on public.tenants for
select
  to authenticated using (
    id in (
      select
        app.landlord_tenant_ids ()
    )
  );

create policy properties_select_tenant on public.properties for
select
  to authenticated using (
    id in (
      select
        app.current_tenant_property_ids ()
    )
  );

create policy units_select_tenant on public.units for
select
  to authenticated using (
    id in (
      select
        app.current_tenant_unit_ids ()
    )
  );
