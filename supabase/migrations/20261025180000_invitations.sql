-- TV-143: staff invitations (ORG-2).
--
-- An agency with one owner and no way to add a property manager cannot
-- operate. The membership row already carries everything an invitation needs —
-- status, invited_by, invited_at, accepted_at — so this migration adds the one
-- thing policies cannot express: letting an invitee accept their own
-- invitation without being able to touch anything else about it.
-- ---------------------------------------------------------------------------
-- Accepting an invitation
--
-- security definer, because the invitee must change their own membership from
-- 'invited' to 'active' and the memberships write policy is admin-only. A
-- policy cannot restrict *which columns* change, so widening it would let an
-- invitee set their own role — which is the whole thing being guarded.
--
-- The function is therefore deliberately narrow: it only ever moves 'invited'
-- to 'active' for the calling user, and touches nothing else.
-- ---------------------------------------------------------------------------
create or replace function public.accept_invitation (target_organisation_id uuid) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  invited public.memberships;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into invited
  from public.memberships m
  where m.organisation_id = target_organisation_id
    and m.user_id = auth.uid()
    and m.status = 'invited';

  if invited.id is null then
    -- Covers "no such invitation", "already accepted" and "not yours" with one
    -- message: distinguishing them would tell a caller which organisations
    -- exist and who has been invited to them.
    raise exception 'no pending invitation for this account'
      using errcode = 'P0002';
  end if;

  -- Read by the membership audit trigger, so the trail says why the status
  -- changed rather than leaving a bare transition (ORG-5).
  perform set_config('app.audit_reason', 'Invitation accepted by the invitee', true);

  update public.memberships
  set status = 'active',
      accepted_at = now()
  where id = invited.id;
end;
$$;

comment on function public.accept_invitation is 'ORG-2. Moves the calling user''s own invitation from invited to active. Never changes the role.';

grant
execute on function public.accept_invitation (uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- An invitee must be able to see the organisation they were invited to.
--
-- app.current_organisation_ids() counts only *active* memberships, by design:
-- an invited user should not yet read the organisation's data. But they do need
-- its name, or the acceptance screen cannot say what they are joining.
-- ---------------------------------------------------------------------------
create or replace function app.invited_organisation_ids () returns setof uuid language sql stable security definer
set
  search_path = '' as $$
  select m.organisation_id
  from public.memberships m
  where m.user_id = auth.uid()
    and m.status = 'invited'
$$;

grant
execute on function app.invited_organisation_ids () to authenticated;

create policy organisations_select_invited on public.organisations for
select
  to authenticated using (
    id in (
      select
        app.invited_organisation_ids ()
    )
  );

comment on policy organisations_select_invited on public.organisations is 'An invitee sees the name of the organisation inviting them, and nothing else about it, until they accept.';

-- ---------------------------------------------------------------------------
-- Only an owner may invite an owner.
--
-- change_membership_role enforces this for *changes*; without the same rule at
-- insert time an admin could simply invite a new owner instead.
-- ---------------------------------------------------------------------------
create or replace function app.assert_owner_assigned_by_owner () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  actor_role public.app_role;
begin
  if new.role <> 'owner' then
    return new;
  end if;

  select m.role into actor_role
  from public.memberships m
  where m.organisation_id = new.organisation_id
    and m.user_id = auth.uid()
    and m.status = 'active';

  -- No actor at all means this is the signup path creating the first owner,
  -- which runs as the definer inside create_organisation_with_owner.
  if actor_role is null then
    return new;
  end if;

  if actor_role <> 'owner' then
    raise exception 'only an owner may invite another owner'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger memberships_owner_assigned_by_owner
before insert on public.memberships for each row
execute function app.assert_owner_assigned_by_owner ();

-- Pending invitations are listed per organisation on the people screen.
create index memberships_invited_idx on public.memberships (organisation_id, invited_at desc)
where
  status = 'invited';

-- ---------------------------------------------------------------------------
-- Audit ordering
--
-- occurred_at defaults to now(), which is the *transaction* timestamp: every
-- event written inside one transaction shares it. A trail ordered by timestamp
-- alone therefore cannot distinguish a create from the delete that followed it
-- in the same transaction — which a test in this ticket demonstrated by
-- reading them back in the wrong order.
--
-- id is a monotonic identity, so (occurred_at desc, id desc) is the ordering
-- any list should use. Added here rather than by editing the original
-- migration, which has already been applied: migrations are forward-only.
-- ---------------------------------------------------------------------------
comment on column public.audit_events.occurred_at is 'Transaction timestamp. Events from one transaction share it — order by (occurred_at, id), never occurred_at alone.';

create index audit_events_organisation_sequence_idx on public.audit_events (organisation_id, occurred_at desc, id desc);
