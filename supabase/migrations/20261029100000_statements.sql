-- R1 step 6: landlord statements (LEDGER-2, LEDGER-7, LEDGER-8).
--
-- A statement is a frozen snapshot of the ledger for a period: opening
-- balance, the entries inside the period, and closing balance. Creating one
-- copies the lines, so re-reading it after a later adjustment still shows what
-- the landlord was sent. The workflow is draft → reviewed → issued; an issued
-- statement cannot be changed at all, and a correction is a new statement with
-- the next revision number that points at the one it replaces.
-- ---------------------------------------------------------------------------
create type public.statement_status as enum('draft', 'reviewed', 'issued');

create table public.statements (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete restrict,
  landlord_id uuid not null references public.landlords (id) on delete restrict,
  period_start date not null,
  period_end date not null,
  revision_number integer not null default 1 check (revision_number >= 1),
  supersedes_statement_id uuid references public.statements (id) on delete restrict,
  status public.statement_status not null default 'draft',
  -- Signed kobo, as in the ledger: positive is owed to the landlord.
  opening_balance_kobo bigint not null,
  closing_balance_kobo bigint not null,
  -- The lines are the snapshot. jsonb rather than joins because a statement is
  -- evidence of what was said, not a live view of the ledger.
  lines jsonb not null check (jsonb_typeof(lines) = 'array'),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  issued_at timestamptz,
  issued_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint statements_dates_ordered check (period_end >= period_start),
  constraint statements_reviewed_has_detail check (
    status = 'draft'
    or (
      reviewed_at is not null
      and reviewed_by is not null
    )
  ),
  constraint statements_issued_has_detail check (
    status <> 'issued'
    or (
      issued_at is not null
      and issued_by is not null
    )
  ),
  constraint statements_supersedes_not_self check (supersedes_statement_id is distinct from id),
  -- One revision per landlord and period. A corrected statement is a higher
  -- revision, not a second statement with the same number.
  unique (
    organisation_id,
    landlord_id,
    period_start,
    period_end,
    revision_number
  )
);

comment on table public.statements is 'LEDGER-2, LEDGER-8. A frozen period snapshot moving draft → reviewed → issued; issued statements are immutable and corrected by a numbered revision.';

create index statements_landlord_idx on public.statements (organisation_id, landlord_id, period_end desc);

-- ---------------------------------------------------------------------------
-- Immutability and the status machine
-- ---------------------------------------------------------------------------
create or replace function app.deny_statement_rewrite () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'a statement is never deleted'
      using errcode = '42501',
            hint = 'Issue a revision instead (LEDGER-8).';
  end if;

  if old.status = 'issued' then
    raise exception 'an issued statement cannot be changed'
      using errcode = '42501',
            hint = 'Issue a new revision referencing it.';
  end if;

  if new.organisation_id <> old.organisation_id
    or new.landlord_id <> old.landlord_id
    or new.period_start <> old.period_start
    or new.period_end <> old.period_end
    or new.revision_number <> old.revision_number
    or new.supersedes_statement_id is distinct from old.supersedes_statement_id
    or new.opening_balance_kobo <> old.opening_balance_kobo
    or new.closing_balance_kobo <> old.closing_balance_kobo
    or new.lines <> old.lines
    or new.created_by is distinct from old.created_by
    or new.created_at <> old.created_at then
    raise exception 'a statement''s period, balances and lines cannot be changed'
      using errcode = '42501',
            hint = 'Issue a revision instead (LEDGER-8).';
  end if;

  if new.status <> old.status then
    if not (
      (old.status = 'draft' and new.status = 'reviewed')
      or (old.status = 'reviewed' and new.status = 'issued')
    ) then
      raise exception 'a statement cannot move from % to %', old.status, new.status
        using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

create trigger statements_append_only
before update or delete on public.statements for each row
execute function app.deny_statement_rewrite ();

-- ---------------------------------------------------------------------------
-- Creating a statement
-- ---------------------------------------------------------------------------
create or replace function public.create_statement (
  target_organisation_id uuid,
  target_landlord_id uuid,
  period_starts_on date,
  period_ends_on date,
  source_statement_id uuid default null
) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  acting_user uuid := auth.uid();
  landlord_organisation uuid;
  source public.statements;
  revision integer := 1;
  opening_balance bigint;
  period_total bigint;
  line_rows jsonb;
  new_statement uuid;
begin
  if acting_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not app.has_role(
    target_organisation_id,
    array['owner', 'admin', 'accountant']::public.app_role[]
  ) then
    raise exception 'you may not issue statements for this organisation'
      using errcode = '42501';
  end if;

  if period_starts_on is null or period_ends_on is null or period_ends_on < period_starts_on then
    raise exception 'a statement needs a period that ends on or after it starts'
      using errcode = '22023';
  end if;

  select l.organisation_id into landlord_organisation
  from public.landlords l
  where l.id = target_landlord_id;

  if landlord_organisation is null or landlord_organisation <> target_organisation_id then
    raise exception 'landlord % does not belong to organisation %',
      target_landlord_id, target_organisation_id using errcode = '42501';
  end if;

  if source_statement_id is not null then
    select * into source
    from public.statements s
    where s.id = source_statement_id
      and s.organisation_id = target_organisation_id
      and s.landlord_id = target_landlord_id;

    if not found then
      raise exception 'statement % does not belong to this landlord', source_statement_id
        using errcode = '23503';
    end if;

    if source.status <> 'issued' then
      raise exception 'only an issued statement can be revised'
        using errcode = '23514';
    end if;

    revision := source.revision_number + 1;
  end if;

  select coalesce(sum(e.amount_kobo), 0)
  into opening_balance
  from public.landlord_ledger_entries e
  where e.landlord_id = target_landlord_id
    and e.occurred_on < period_starts_on;

  select
    coalesce(sum(e.amount_kobo), 0),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'occurredOn', e.occurred_on,
          'kind', e.entry_kind,
          'fundsClass', e.funds_class,
          'description', e.description,
          'amountKobo', e.amount_kobo,
          'paymentId', e.payment_id,
          'remittanceId', e.remittance_id
        )
        order by e.occurred_on, e.created_at
      ),
      '[]'::jsonb
    )
  into period_total, line_rows
  from public.landlord_ledger_entries e
  where e.landlord_id = target_landlord_id
    and e.occurred_on between period_starts_on and period_ends_on;

  insert into public.statements (
    organisation_id, landlord_id, period_start, period_end,
    revision_number, supersedes_statement_id, status,
    opening_balance_kobo, closing_balance_kobo, lines, created_by
  )
  values (
    target_organisation_id, target_landlord_id, period_starts_on, period_ends_on,
    revision, source_statement_id, 'draft',
    opening_balance, opening_balance + period_total, line_rows, acting_user
  )
  returning id into new_statement;

  return new_statement;
end;
$$;

comment on function public.create_statement is 'LEDGER-2, LEDGER-8. Freezes the ledger for a period into a draft statement, with an opening and closing balance.';

-- ---------------------------------------------------------------------------
-- Review and issue
-- ---------------------------------------------------------------------------
create or replace function public.review_statement (target_statement_id uuid) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  acting_user uuid := auth.uid();
  statement_organisation uuid;
begin
  if acting_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select s.organisation_id into statement_organisation
  from public.statements s
  where s.id = target_statement_id;

  if statement_organisation is null then
    raise exception 'statement % does not exist', target_statement_id using errcode = '23503';
  end if;

  if not app.has_role(
    statement_organisation,
    array['owner', 'admin', 'accountant']::public.app_role[]
  ) then
    raise exception 'you may not review statements for this organisation'
      using errcode = '42501';
  end if;

  update public.statements
  set status = 'reviewed',
      reviewed_at = now(),
      reviewed_by = acting_user
  where id = target_statement_id
    and status = 'draft';

  if not found then
    raise exception 'only a draft statement can be reviewed'
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.issue_statement (target_statement_id uuid) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  acting_user uuid := auth.uid();
  statement_organisation uuid;
begin
  if acting_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select s.organisation_id into statement_organisation
  from public.statements s
  where s.id = target_statement_id;

  if statement_organisation is null then
    raise exception 'statement % does not exist', target_statement_id using errcode = '23503';
  end if;

  if not app.has_role(
    statement_organisation,
    array['owner', 'admin', 'accountant']::public.app_role[]
  ) then
    raise exception 'you may not issue statements for this organisation'
      using errcode = '42501';
  end if;

  update public.statements
  set status = 'issued',
      issued_at = now(),
      issued_by = acting_user
  where id = target_statement_id
    and status = 'reviewed';

  if not found then
    raise exception 'a statement must be reviewed before it is issued'
      using errcode = '23514';
  end if;
end;
$$;

comment on function public.issue_statement is 'LEDGER-8. Issues a reviewed statement. From this point the row is immutable.';

-- ---------------------------------------------------------------------------
-- Auditing
-- ---------------------------------------------------------------------------
create trigger statements_audit
after insert or update on public.statements for each row
execute function app.audit_row_change ('statement');

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.statements enable row level security;

create policy statements_select_staff on public.statements for
select
  to authenticated using (
    app.has_role (
      organisation_id,
      array[
        'owner',
        'admin',
        'property_manager',
        'accountant'
      ]::public.app_role[]
    )
  );

create policy statements_select_landlord on public.statements for
select
  to authenticated using (
    landlord_id in (
      select
        app.current_landlord_ids ()
    )
  );

-- ===========================================================================
-- Grants
-- ===========================================================================
grant
select
  on public.statements to authenticated;

revoke all on function public.create_statement (uuid, uuid, date, date, uuid)
from
  public;

revoke all on function public.review_statement (uuid)
from
  public;

revoke all on function public.issue_statement (uuid)
from
  public;

grant
execute on function public.create_statement (uuid, uuid, date, date, uuid) to authenticated;

grant
execute on function public.review_statement (uuid) to authenticated;

grant
execute on function public.issue_statement (uuid) to authenticated;

revoke all on all tables in schema public
from
  anon;

revoke all on all functions in schema public
from
  anon;
