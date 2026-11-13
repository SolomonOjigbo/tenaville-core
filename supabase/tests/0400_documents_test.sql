-- Document registry (DOC-1, DOC-2, DOC-5, DOC-7).

begin;

select plan(12);

select tests.as_owner();

select tests.create_user('doc-owner@yabalets.ng') as owner \gset
select tests.create_user('doc-manager@yabalets.ng') as manager \gset
select tests.create_user('doc-landlord@yabalets.ng') as landlord_user \gset
select tests.create_user('doc-tenant@yabalets.ng') as tenant_user \gset
select tests.create_user('doc-outsider@other.ng') as outsider \gset

select tests.authenticate(:'owner'::uuid, 'doc-owner@yabalets.ng');
select public.create_organisation_with_owner('Document Lets', 'agency', 'Doc Owner') as org \gset

select tests.as_owner();
insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
values
  (:'org'::uuid, :'manager'::uuid, 'property_manager', 'active', now()),
  (:'org'::uuid, :'landlord_user'::uuid, 'landlord', 'active', now()),
  (:'org'::uuid, :'tenant_user'::uuid, 'tenant', 'active', now());

insert into public.landlords (organisation_id, display_name, user_id)
values (:'org'::uuid, 'Doc Landlord', :'landlord_user'::uuid)
returning id as landlord \gset

insert into public.properties (
  organisation_id, landlord_id, name, property_type, address_line, state_code
)
values (:'org'::uuid, :'landlord'::uuid, 'Doc Court', 'residential', '1 File Road', 'LA')
returning id as property \gset

insert into public.units (organisation_id, property_id, label, unit_type)
values (:'org'::uuid, :'property'::uuid, 'Flat D1', 'flat')
returning id as unit \gset

insert into public.tenants (organisation_id, display_name, user_id)
values (:'org'::uuid, 'Doc Tenant', :'tenant_user'::uuid);
select id as tenant from public.tenants where user_id = :'tenant_user'::uuid \gset

select tests.authenticate(:'owner'::uuid, 'doc-owner@yabalets.ng');
select public.create_lease_with_tenant(
  :'org'::uuid, :'unit'::uuid, :'tenant'::uuid,
  date '2026-01-01', date '2026-12-31', 30000000::bigint,
  'annual', 'DOC/2026/01', null, 'agency', true,
  '[{"sequence":1,"period_start":"2026-01-01","period_end":"2026-12-31","due_on":"2026-01-01","amount_kobo":"30000000"}]'::jsonb
) as lease \gset

-- Three documents with different audiences.
select tests.as_owner();
insert into public.documents (
  organisation_id, entity_type, entity_id, storage_path, file_name, size_bytes,
  document_type, title, issue_date, expiry_date, uploaded_by
)
values
  (
    :'org'::uuid, 'property', :'property'::uuid,
    :'org'::uuid || '/property/' || :'property'::uuid || '/1-deed.pdf',
    'deed.pdf', 1200, 'proof_of_ownership', 'Property deed',
    current_date - 100, current_date + 10, :'owner'::uuid
  ),
  (
    :'org'::uuid, 'lease', :'lease'::uuid,
    :'org'::uuid || '/lease/' || :'lease'::uuid || '/1-agreement.pdf',
    'agreement.pdf', 800, 'tenancy_agreement', 'Signed tenancy agreement',
    current_date - 10, null, :'owner'::uuid
  ),
  (
    :'org'::uuid, 'tenant', :'tenant'::uuid,
    :'org'::uuid || '/tenant/' || :'tenant'::uuid || '/1-id.pdf',
    'id.pdf', 400, 'identification', 'Tenant identification',
    current_date - 20, null, :'owner'::uuid
  );

select tests.authenticate(:'tenant_user'::uuid, 'doc-tenant@yabalets.ng');

select is(
  (select count(*) from public.documents),
  2::bigint,
  'DOC-2: a tenant sees documents on their tenancy and their own record, not the property deed'
);

select throws_ok(
  format(
    $$insert into public.documents (
        organisation_id, entity_type, entity_id, storage_path, file_name, document_type
      ) values (%L::uuid, 'tenant', %L::uuid, %L, 'x.pdf', 'other')$$,
    :'org', :'tenant', 'not-allowed'
  ),
  '42501',
  null,
  'a tenant cannot add a document to the registry'
);

select tests.authenticate(:'landlord_user'::uuid, 'doc-landlord@yabalets.ng');

select is(
  (select count(*) from public.documents),
  2::bigint,
  'DOC-2: a landlord sees documents on their property and the lease, not the tenant identity document'
);

select tests.authenticate(:'manager'::uuid, 'doc-manager@yabalets.ng');

select is(
  (select count(*) from public.documents),
  3::bigint,
  'staff see every document in the organisation'
);

select tests.authenticate(:'outsider'::uuid, 'doc-outsider@other.ng');

select is(
  (select count(*) from public.documents),
  0::bigint,
  'someone outside the organisation sees no documents'
);

-- ---------------------------------------------------------------------------
-- Expiry alerts (DOC-5)
-- ---------------------------------------------------------------------------
select tests.authenticate(:'owner'::uuid, 'doc-owner@yabalets.ng');

select is(
  public.generate_document_expiry_tasks(:'org'::uuid),
  1,
  'DOC-5: a document expiring inside the window becomes a task'
);

select is(
  (select count(*) from public.tasks where related_type = 'document'),
  1::bigint,
  'the task is linked to the document'
);

select is(
  public.generate_document_expiry_tasks(:'org'::uuid),
  0,
  'running the expiry check twice creates no duplicate task'
);

select is(
  (select priority from public.tasks where related_type = 'document'),
  'normal'::public.task_priority,
  'a document expiring in ten days is normal priority'
);

-- ---------------------------------------------------------------------------
-- Metadata and status
-- ---------------------------------------------------------------------------
select lives_ok(
  format(
    $$update public.documents set title = 'Deed (copy)' where entity_type = 'property'$$ 
  ),
  'a staff member can correct document metadata'
);

select tests.authenticate(:'tenant_user'::uuid, 'doc-tenant@yabalets.ng');

update public.documents set title = 'Mine now' where entity_type = 'tenant';

select is(
  (select count(*) from public.documents where title = 'Mine now'),
  0::bigint,
  'a tenant cannot edit document metadata'
);

select is(
  (select count(*) from public.audit_events where action = 'document.accessed'),
  0::bigint,
  'the registry itself does not invent access audit entries'
);

select * from finish();

rollback;
