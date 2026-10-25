-- Lease-change and scoped-access auditing, finishing what ORG-5 can cover today.
--
-- ORG-5 names six categories: financial changes, lease changes, screening
-- decisions, sensitive document access, maintenance approvals and permission
-- changes. Before this migration two were covered — permission changes through
-- memberships, and document access from TV-014 — while leases existed and were
-- not audited at all. A tenancy whose rent or end date changed left no trace of
-- who changed it, which is precisely the question a dispute asks.
--
-- Also audited here: assignments. Scoped access *is* a permission change
-- (ORG-4) — granting someone a property is the same kind of act as giving them
-- a role, and only one of the two was recorded.
--
-- The remaining three categories have no tables yet: payments and the ledger
-- arrive in R1 steps 4 and 6, maintenance approvals in step 8, screening in R2.
-- The coverage test in supabase/tests/0100_audit_coverage_test.sql makes a new
-- table fail until somebody says whether it is audited.
-- ---------------------------------------------------------------------------
-- One generic row auditor
--
-- Four near-identical trigger functions would drift. This takes the entity
-- name as a trigger argument and records the whole row before and after, which
-- is what §10.7 asks for: actor, time, action, before and after values, and
-- the reason for a sensitive override.
--
-- A status change gets its own action, because "the lease moved to terminated"
-- and "the rent changed" are different questions and a reader should not have
-- to diff two json blobs to tell them apart.
-- ---------------------------------------------------------------------------
create or replace function app.audit_row_change () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  entity text := tg_argv[0];
  before_row jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  after_row jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  action_name text;
  organisation uuid;
begin
  if tg_op = 'INSERT' then
    action_name := entity || '.created';
  elsif tg_op = 'DELETE' then
    action_name := entity || '.removed';
  elsif (before_row ->> 'status') is distinct from (after_row ->> 'status') then
    action_name := entity || '.status_changed';
  else
    -- Nothing changed at all: an update that rewrites a row with identical
    -- values is noise, not history.
    if before_row = after_row then
      return coalesce(new, old);
    end if;
    action_name := entity || '.updated';
  end if;

  organisation := coalesce(after_row ->> 'organisation_id', before_row ->> 'organisation_id')::uuid;

  insert into public.audit_events (
    organisation_id, actor_user_id, actor_label, action, entity_type, entity_id,
    before, after, reason
  )
  values (
    organisation,
    auth.uid(),
    auth.email(),
    action_name,
    entity,
    coalesce(after_row ->> 'id', before_row ->> 'id'),
    before_row,
    after_row,
    -- Set for the transaction by a caller that has one, as
    -- change_membership_role and accept_invitation do.
    nullif(btrim(coalesce(current_setting('app.audit_reason', true), '')), '')
  );

  return coalesce(new, old);
end;
$$;

comment on function app.audit_row_change is 'ORG-5, §10.7. Generic row auditor: pass the entity name as a trigger argument.';

-- ---------------------------------------------------------------------------
-- Lease changes (ORG-5)
-- ---------------------------------------------------------------------------
create trigger leases_audit
after insert or update or delete on public.leases for each row
execute function app.audit_row_change ('lease');

-- Who is liable under a tenancy is part of the tenancy.
create trigger lease_parties_audit
after insert or update or delete on public.lease_parties for each row
execute function app.audit_row_change ('lease_party');

-- A deposit is client money, so every movement is recorded (LEASE-13, §10.17).
create trigger lease_deposits_audit
after insert or update or delete on public.lease_deposits for each row
execute function app.audit_row_change ('lease_deposit');

-- Deductions are already append-only; auditing records who approved one and
-- when, which the row itself does not say for a reversal.
create trigger deposit_deductions_audit
after insert or update on public.deposit_deductions for each row
execute function app.audit_row_change ('deposit_deduction');

-- ---------------------------------------------------------------------------
-- Scoped access (ORG-4, and the permission-changes clause of ORG-5)
-- ---------------------------------------------------------------------------
create trigger assignments_audit
after insert or update or delete on public.assignments for each row
execute function app.audit_row_change ('assignment');

-- ---------------------------------------------------------------------------
-- Organisation settings
--
-- lease_expiry_alert_days decides when renewal reminders go out (LEASE-6), so
-- a quiet change to it is a change to whether an agency chases its renewals.
-- ---------------------------------------------------------------------------
create trigger organisations_audit
after update on public.organisations for each row
execute function app.audit_row_change ('organisation');

-- ---------------------------------------------------------------------------
-- Management mandates
--
-- A mandate carries the commission rate and the permitted deductions. Changing
-- either changes what an agency takes from a landlord's rent, which is a
-- financial change in every sense ORG-5 means — and the landlord is the party
-- least able to notice it happening.
-- ---------------------------------------------------------------------------
create trigger management_mandates_audit
after insert or update or delete on public.management_mandates for each row
execute function app.audit_row_change ('management_mandate');
