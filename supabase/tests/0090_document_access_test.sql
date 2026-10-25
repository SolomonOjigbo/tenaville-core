-- Document access (TV-014, DOC-7, ORG-5).
--
-- The storage policies themselves cannot be tested here: storage.objects is
-- created by the Storage service and does not exist in a bare Postgres image.
-- What is testable, and what actually carries DOC-7, is the path convention
-- and the access record.

begin;
select plan(12);

select tests.as_owner();

insert into public.plans (id, name, unit_limit, price_kobo, billing_period, trial_days)
values ('trial', 'Trial', 10, 0, 'monthly', 14)
on conflict (id) do nothing;

select tests.create_user('owner@maryland.ng')  as md_owner \gset
select tests.create_user('agent@maryland.ng')  as md_agent \gset
select tests.create_user('owner@elsewhere.ng') as other    \gset

select tests.authenticate(:'md_owner'::uuid, 'owner@maryland.ng');
select public.create_organisation_with_owner('Maryland Homes', 'agency', 'Maryland Owner') as md_org \gset

select tests.authenticate(:'other'::uuid, 'owner@elsewhere.ng');
select public.create_organisation_with_owner('Elsewhere Ltd', 'agency', 'Other Owner') as other_org \gset

select tests.as_owner();
insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
values (:'md_org'::uuid, :'md_agent'::uuid, 'letting_agent', 'active', now());

-- --- the path convention decides which organisation owns an object ---------
select is(
  app.storage_organisation_id(format('%s/property/abc/photo.jpg', :'md_org'::uuid)),
  :'md_org'::uuid,
  'DOC-7: the organisation is the first path segment'
);

select is(
  app.storage_organisation_id('not-a-uuid/property/abc/photo.jpg'),
  null::uuid,
  'DOC-7: a path that does not start with a uuid belongs to no organisation'
);

select is(
  app.storage_organisation_id(''),
  null::uuid,
  'DOC-7: an empty path belongs to no organisation'
);

-- A path crafted to look like it escapes its prefix still resolves to the
-- organisation in the first segment, which is the one the policy checks.
select is(
  app.storage_organisation_id(format('%s/../%s/secret.pdf', :'md_org'::uuid, :'other_org'::uuid)),
  :'md_org'::uuid,
  'DOC-7: only the first segment decides ownership, so a traversal-looking path cannot claim another organisation'
);

-- --- recording access (ORG-5) ---------------------------------------------
select tests.authenticate(:'md_agent'::uuid, 'agent@maryland.ng');

select lives_ok(
  format($$select public.record_document_access(%L, 'maintenance', '%s/deduction/d1/basin.jpg', 'deposit_deduction', 'd1')$$,
         :'md_org'::uuid, :'md_org'::uuid),
  'ORG-5: a member can record that they opened a document'
);

select tests.as_owner();
select is(
  (select action from public.audit_events order by id desc limit 1),
  'document.accessed',
  'ORG-5: the access is audited'
);
select is(
  (select actor_user_id from public.audit_events order by id desc limit 1),
  :'md_agent'::uuid,
  'ORG-5: attributed to the person who opened it, not to whoever called the function'
);
select is(
  (select after->>'bucket' from public.audit_events order by id desc limit 1),
  'maintenance',
  'ORG-5: the trail records which document'
);

-- --- an outsider cannot write into another organisation's trail -----------
select tests.authenticate(:'other'::uuid, 'owner@elsewhere.ng');

select throws_ok(
  format($$select public.record_document_access(%L, 'documents', '%s/lease/l1/agreement.pdf', 'lease', 'l1')$$,
         :'md_org'::uuid, :'md_org'::uuid),
  '42501',
  null,
  'ORG-5: a non-member cannot record access against another organisation'
);

select tests.as_owner();
select is(
  (select count(*)::int from public.audit_events
    where organisation_id = :'md_org'::uuid and action = 'document.accessed'),
  1,
  'ORG-5: and no entry was written'
);

-- --- the audit trail is still append-only ---------------------------------
select throws_ok(
  $$update public.audit_events set action = 'document.hidden' where action = 'document.accessed'$$,
  '42501',
  null,
  'PRD §10.2: an access record cannot be rewritten'
);

select throws_ok(
  $$delete from public.audit_events where action = 'document.accessed'$$,
  '42501',
  null,
  'PRD §10.2: nor deleted'
);

select * from finish();
rollback;
