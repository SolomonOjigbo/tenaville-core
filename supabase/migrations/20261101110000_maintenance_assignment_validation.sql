-- Assignment targets must be able to see the repair (MAINT-4).
--
-- The function already checks membership, but assigning an accountant or a
-- screening reviewer is a dead end: they hold no maintenance.read, so the
-- request disappears from their queue the moment it is assigned. A trigger is
-- used rather than duplicating the whole assignment function so a direct table
-- update is covered too.
-- ---------------------------------------------------------------------------
create or replace function app.validate_maintenance_assignment () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if new.assignee_user_id is not null and not exists (
    select 1 from public.memberships m
    where m.user_id = new.assignee_user_id
      and m.organisation_id = new.organisation_id
      and m.status = 'active'
      and m.role = any (
        array[
          'owner', 'admin', 'property_manager', 'letting_agent',
          'caretaker', 'maintenance_coordinator'
        ]::public.app_role[]
      )
  ) then
    raise exception 'the assignee cannot see maintenance requests'
      using errcode = '23514';
  end if;

  if new.coordinator_user_id is not null and not exists (
    select 1 from public.memberships m
    where m.user_id = new.coordinator_user_id
      and m.organisation_id = new.organisation_id
      and m.status = 'active'
      and m.role = any (
        array[
          'owner', 'admin', 'property_manager', 'letting_agent',
          'caretaker', 'maintenance_coordinator'
        ]::public.app_role[]
      )
  ) then
    raise exception 'the coordinator cannot see maintenance requests'
      using errcode = '23514';
  end if;

  if new.vendor_id is not null and not exists (
    select 1 from public.vendors v
    where v.id = new.vendor_id
      and v.organisation_id = new.organisation_id
      and v.status = 'active'
  ) then
    raise exception 'the vendor is not active in this organisation'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger maintenance_requests_validate_assignment
before insert or update of assignee_user_id,
coordinator_user_id,
vendor_id on public.maintenance_requests for each row
execute function app.validate_maintenance_assignment ();
