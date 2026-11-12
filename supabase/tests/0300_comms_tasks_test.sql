-- Communications and tasks (COMMS-1 … COMMS-4, COMMS-6, COMMS-8).

begin;

select plan(23);

select tests.as_owner();

select tests.create_user('comms-owner@yabalets.ng') as owner \gset
select tests.create_user('comms-manager@yabalets.ng') as manager \gset
select tests.create_user('comms-tenant@yabalets.ng') as tenant_user \gset
select tests.create_user('comms-other@yabalets.ng') as other_tenant_user \gset
select tests.create_user('comms-outsider@other.ng') as outsider \gset

select tests.authenticate(:'owner'::uuid, 'comms-owner@yabalets.ng');
select public.create_organisation_with_owner('Comms Lettings', 'agency', 'Comms Owner') as org \gset

select tests.as_owner();
insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
values
  (:'org'::uuid, :'manager'::uuid, 'property_manager', 'active', now()),
  (:'org'::uuid, :'tenant_user'::uuid, 'tenant', 'active', now()),
  (:'org'::uuid, :'other_tenant_user'::uuid, 'tenant', 'active', now());

insert into public.landlords (organisation_id, display_name)
values (:'org'::uuid, 'Comms Landlord')
returning id as landlord \gset

insert into public.properties (
  organisation_id, landlord_id, name, property_type, address_line, state_code
)
values (:'org'::uuid, :'landlord'::uuid, 'Comms Court', 'residential', '1 Message Road', 'LA')
returning id as property \gset

insert into public.units (organisation_id, property_id, label, unit_type)
values (:'org'::uuid, :'property'::uuid, 'Flat C1', 'flat')
returning id as unit \gset

insert into public.tenants (organisation_id, display_name, user_id, email)
values
  (:'org'::uuid, 'Comms Tenant', :'tenant_user'::uuid, 'tenant@comms.ng'),
  (:'org'::uuid, 'Other Tenant', :'other_tenant_user'::uuid, 'other@comms.ng');

select id as tenant from public.tenants where user_id = :'tenant_user'::uuid \gset
select id as other_tenant from public.tenants where user_id = :'other_tenant_user'::uuid \gset

select tests.authenticate(:'owner'::uuid, 'comms-owner@yabalets.ng');
select public.create_lease_with_tenant(
  :'org'::uuid, :'unit'::uuid, :'tenant'::uuid,
  (current_date - 30), (current_date + 15), 30000000::bigint,
  'annual', 'CM/2026/01', null, 'agency', true,
  jsonb_build_array(
    jsonb_build_object(
      'sequence', 1,
      'period_start', current_date - 30,
      'period_end', current_date + 15,
      'due_on', current_date + 3,
      'amount_kobo', '30000000'
    )
  )
);

-- ---------------------------------------------------------------------------
-- Templates
-- ---------------------------------------------------------------------------
select is(
  (select count(*) from public.message_templates),
  15::bigint,
  'COMMS-1: every organisation gets five templates on three channels'
);

select is(
  (select count(*) from public.message_templates where channel = 'whatsapp' and approval_status = 'draft'),
  5::bigint,
  'COMMS-8: WhatsApp templates start unapproved'
);

select tests.authenticate(:'tenant_user'::uuid, 'comms-tenant@yabalets.ng');

select is(
  (select count(*) from public.message_templates),
  0::bigint,
  'a tenant cannot read agency message templates'
);

-- ---------------------------------------------------------------------------
-- Tasks and reminder generation
-- ---------------------------------------------------------------------------
select tests.authenticate(:'owner'::uuid, 'comms-owner@yabalets.ng');

select public.generate_reminder_tasks(:'org'::uuid);

select is(
  (select count(*) from public.tasks where related_type = 'charge'),
  1::bigint,
  'RENT-6: an open charge due soon becomes a rent reminder task'
);

select is(
  (select count(*) from public.tasks where related_type = 'lease'),
  1::bigint,
  'COMMS-4: an expiring lease becomes a follow-up task'
);

select is(
  public.generate_reminder_tasks(:'org'::uuid),
  0,
  'running the reminder generator twice creates no duplicates'
);

insert into public.tasks (organisation_id, title, owner_user_id, due_on, priority, created_by)
values (:'org'::uuid, 'Call the landlord about the roof', :'owner'::uuid, current_date + 5, 'high', :'owner'::uuid)
returning id as manual_task \gset

select is(
  (select status from public.tasks where id = :'manual_task'::uuid),
  'open'::public.task_status,
  'COMMS-4: a staff member can create a task with owner, due date and priority'
);

select tests.authenticate(:'manager'::uuid, 'comms-manager@yabalets.ng');

select is(
  (select count(*) from public.tasks),
  3::bigint,
  'a manager sees the shared task queue'
);

select lives_ok(
  format($$update public.tasks set status = 'done', completed_at = now(), completed_by = auth.uid() where id = %L::uuid$$, :'manual_task'::uuid),
  'a staff member can complete a task'
);

select tests.authenticate(:'tenant_user'::uuid, 'comms-tenant@yabalets.ng');

select is(
  (select count(*) from public.tasks),
  0::bigint,
  'a tenant cannot see staff tasks'
);

select tests.authenticate(:'outsider'::uuid, 'comms-outsider@other.ng');

select is(
  (select count(*) from public.tasks),
  0::bigint,
  'someone outside the organisation sees no tasks'
);

-- ---------------------------------------------------------------------------
-- Messages, deliveries and preferences
-- ---------------------------------------------------------------------------
select tests.authenticate(:'owner'::uuid, 'comms-owner@yabalets.ng');

insert into public.messages (
  organisation_id, channel, template_id, recipient_type, recipient_id,
  recipient_user_id, recipient_name, recipient_address, subject, body, created_by
)
select
  :'org'::uuid, 'email', template.id, 'tenant', :'tenant'::uuid,
  :'tenant_user'::uuid, 'Comms Tenant', 'tenant@comms.ng',
  template.subject, template.body, :'owner'::uuid
from public.message_templates template
where template.organisation_id = :'org'::uuid
  and template.key = 'rent_reminder'
  and template.channel = 'email'
returning id as message \gset

select is(
  (select status from public.messages where id = :'message'::uuid),
  'queued'::public.message_status,
  'COMMS-3: a message is logged before the provider is called'
);

select public.record_message_result(
  :'message'::uuid, 'email', 'sent', 'log', 'log-1', null, 0
);

select is(
  (select status from public.messages where id = :'message'::uuid),
  'sent'::public.message_status,
  'COMMS-3: the provider result updates the message status'
);

select is(
  (select sent_channel from public.messages where id = :'message'::uuid),
  'email'::public.message_channel,
  'the channel that actually delivered is recorded'
);

select is(
  (select count(*) from public.message_deliveries where message_id = :'message'::uuid),
  1::bigint,
  'one delivery attempt is kept for the log'
);

select tests.authenticate(:'tenant_user'::uuid, 'comms-tenant@yabalets.ng');

select is(
  (select count(*) from public.messages),
  1::bigint,
  'COMMS-3: the recipient sees their own message'
);

select is(
  (select count(*) from public.message_deliveries),
  1::bigint,
  'the recipient sees the delivery status of their own message'
);

select tests.authenticate(:'other_tenant_user'::uuid, 'comms-other@yabalets.ng');

select is(
  (select count(*) from public.messages),
  0::bigint,
  'another tenant sees no messages'
);

select tests.authenticate(:'tenant_user'::uuid, 'comms-tenant@yabalets.ng');

insert into public.notification_preferences (
  organisation_id, user_id, purpose, channel, opted_in
)
values (:'org'::uuid, :'tenant_user'::uuid, 'operational', 'email', false);

select is(
  (select count(*) from public.notification_preferences where user_id = :'tenant_user'::uuid),
  1::bigint,
  'COMMS-6: a tenant can record a channel preference'
);

select throws_ok(
  format(
    $$insert into public.messages (
        organisation_id, channel, recipient_type, recipient_name,
        recipient_address, body
      ) values (%L::uuid, 'email', 'tenant', 'Comms Tenant', 'tenant@comms.ng', 'nope')$$,
    :'org'
  ),
  '42501',
  null,
  'a tenant cannot create a message through the staff log'
);

select tests.authenticate(:'manager'::uuid, 'comms-manager@yabalets.ng');

select is(
  (select count(*) from public.notification_preferences),
  1::bigint,
  'staff can see a preference when coordinating a send'
);

select is(
  (select count(*) from public.messages),
  1::bigint,
  'staff see the message log'
);

select tests.authenticate(:'other_tenant_user'::uuid, 'comms-other@yabalets.ng');

select is(
  (select count(*) from public.notification_preferences),
  0::bigint,
  'a tenant sees only their own preferences'
);

select * from finish();

rollback;
