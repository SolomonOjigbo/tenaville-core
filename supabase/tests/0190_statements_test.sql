-- Landlord statements (LEDGER-2, LEDGER-8).
--
-- A statement freezes the ledger for a period. It moves draft → reviewed →
-- issued; once issued it cannot change, and a correction is a new revision.

begin;

select plan(22);

select tests.as_owner();

select tests.create_user('statement-owner@yabalets.ng') as owner \gset
select tests.create_user('statement-landlord@yabalets.ng') as landlord_user \gset
select tests.create_user('statement-outsider@other.ng') as outsider \gset

select tests.authenticate(:'owner'::uuid, 'statement-owner@yabalets.ng');
select public.create_organisation_with_owner('Statement Lets', 'agency', 'Statement Owner') as org \gset

select tests.as_owner();
insert into public.landlords (organisation_id, display_name, user_id)
values (:'org'::uuid, 'Mrs Statement', :'landlord_user'::uuid)
returning id as landlord \gset

-- Ledger entries: an opening balance before the period and two movements
-- inside it. Adjustments keep the setup free of a lease/payment fixture; the
-- statement only reads amounts, kinds and funds classes.
insert into public.landlord_ledger_entries (
  organisation_id, landlord_id, entry_kind, funds_class, amount_kobo,
  occurred_on, description
)
values
  (
    :'org'::uuid, :'landlord'::uuid, 'opening_balance', 'client_funds',
    100000000, date '2025-12-31', 'Opening balance'
  ),
  (
    :'org'::uuid, :'landlord'::uuid, 'adjustment', 'client_funds',
    30000000, date '2026-01-10', 'Rent collected in January'
  ),
  (
    :'org'::uuid, :'landlord'::uuid, 'adjustment', 'agency_income',
    -3000000, date '2026-01-10', 'Commission in January'
  );

-- ---------------------------------------------------------------------------
-- Creating a draft
-- ---------------------------------------------------------------------------
select tests.authenticate(:'owner'::uuid, 'statement-owner@yabalets.ng');

select public.create_statement(
  :'org'::uuid, :'landlord'::uuid, date '2026-01-01', date '2026-01-31'
) as january \gset

select is(
  (select status from public.statements where id = :'january'::uuid),
  'draft'::public.statement_status,
  'LEDGER-8: a new statement is a draft'
);

select is(
  (select opening_balance_kobo from public.statements where id = :'january'::uuid),
  100000000::bigint,
  'LEDGER-2: the opening balance is everything before the period'
);

select is(
  (select closing_balance_kobo from public.statements where id = :'january'::uuid),
  127000000::bigint,
  'LEDGER-2: the closing balance includes the period movements'
);

select is(
  (select jsonb_array_length(lines) from public.statements where id = :'january'::uuid),
  2,
  'LEDGER-2: the lines are the entries inside the period'
);

select is(
  (select revision_number from public.statements where id = :'january'::uuid),
  1,
  'LEDGER-8: the first statement is revision 1'
);

select throws_ok(
  format($$select public.issue_statement(%L::uuid)$$, :'january'),
  '23514',
  null,
  'LEDGER-8: a draft cannot be issued without review'
);

select public.review_statement(:'january'::uuid);

select is(
  (select status from public.statements where id = :'january'::uuid),
  'reviewed'::public.statement_status,
  'LEDGER-8: review moves the statement forward'
);

select public.issue_statement(:'january'::uuid);

select is(
  (select status from public.statements where id = :'january'::uuid),
  'issued'::public.statement_status,
  'LEDGER-8: issuing is the final transition'
);

-- ---------------------------------------------------------------------------
-- An issued statement is immutable
-- ---------------------------------------------------------------------------
select tests.as_owner();

select throws_ok(
  format($$update public.statements set closing_balance_kobo = 1 where id = %L::uuid$$, :'january'),
  '42501',
  null,
  'an issued statement cannot be corrected in place'
);

select throws_ok(
  format($$delete from public.statements where id = %L::uuid$$, :'january'),
  '42501',
  null,
  'nor deleted'
);

-- ---------------------------------------------------------------------------
-- A correction is a new revision
-- ---------------------------------------------------------------------------
select tests.authenticate(:'owner'::uuid, 'statement-owner@yabalets.ng');

select public.create_statement(
  :'org'::uuid, :'landlord'::uuid, date '2026-02-01', date '2026-02-28', :'january'::uuid
) as february \gset

select is(
  (select revision_number from public.statements where id = :'february'::uuid),
  2,
  'LEDGER-8: a revision takes the next number'
);

select is(
  (select supersedes_statement_id from public.statements where id = :'february'::uuid),
  :'january'::uuid,
  'LEDGER-8: and points at the statement it replaces'
);

select is(
  (select opening_balance_kobo from public.statements where id = :'february'::uuid),
  127000000::bigint,
  'LEDGER-2: the revision opens at the previous closing balance'
);

select is(
  (select closing_balance_kobo from public.statements where id = :'february'::uuid),
  127000000::bigint,
  'LEDGER-2: and closes with no February movements'
);

select is(
  (select jsonb_array_length(lines) from public.statements where id = :'february'::uuid),
  0,
  'LEDGER-2: an empty period has no lines'
);

select public.create_statement(
  :'org'::uuid, :'landlord'::uuid, date '2026-03-01', date '2026-03-31'
) as march \gset

select throws_ok(
  format(
    $$select public.create_statement(%L::uuid, %L::uuid, date '2026-04-01', date '2026-04-30', %L::uuid)$$,
    :'org', :'landlord', :'march'
  ),
  '23514',
  null,
  'LEDGER-8: a draft cannot be superseded, only an issued statement'
);

select throws_ok(
  format($$select public.review_statement(%L::uuid)$$, :'january'),
  '23514',
  null,
  'LEDGER-8: an issued statement cannot be reviewed again'
);

-- ---------------------------------------------------------------------------
-- Who can see statements (LEDGER-5)
-- ---------------------------------------------------------------------------
select tests.authenticate(:'outsider'::uuid, 'statement-outsider@other.ng');

select is(
  (select count(*) from public.statements),
  0::bigint,
  'LEDGER-5: someone outside the organisation sees no statements'
);

select throws_ok(
  format(
    $$select public.create_statement(%L::uuid, %L::uuid, date '2026-05-01', date '2026-05-31')$$,
    :'org', :'landlord'
  ),
  '42501',
  null,
  'LEDGER-5: and cannot create one'
);

select tests.authenticate(:'landlord_user'::uuid, 'statement-landlord@yabalets.ng');

select is(
  (select count(*) from public.statements),
  3::bigint,
  'LEDGER-5: the landlord sees their own statements'
);

select tests.authenticate(:'owner'::uuid, 'statement-owner@yabalets.ng');

select is(
  (select count(*) from public.statements),
  3::bigint,
  'LEDGER-5: staff see them too'
);

select ok(
  exists (select 1 from public.audit_events where entity_type = 'statement'),
  'ORG-5: statements are audited'
);

select * from finish();

rollback;
