-- Two organisations with deliberately similar data.
--
-- The similarity is the point: a cross-tenant bug against obviously different
-- fixtures is easy to miss by eye. Both agencies here have an owner, a manager
-- and a tenant, with comparable names and the same roles.
--
-- Development only. Never seed from a production extract — a real customer
-- record in a seed file is a data-protection incident, not a convenience.
do $$
declare
  lagos_org   uuid;
  abuja_org   uuid;
  u           uuid;
  seeded      record;
begin
  if exists (select 1 from public.organisations) then
    raise notice 'organisations already present; skipping demo seed';
    return;
  end if;

  insert into public.organisations (name, type)
  values ('Lagos Lettings', 'agency') returning id into lagos_org;
  insert into public.organisations (name, type)
  values ('Abuja Estates', 'agency') returning id into abuja_org;

  for seeded in
    select * from (values
      ('owner@lagoslettings.ng',   'Adaeze Okonkwo',  'owner',            lagos_org),
      ('manager@lagoslettings.ng', 'Chinedu Bello',   'property_manager', lagos_org),
      ('tenant@lagoslettings.ng',  'Fatima Aliyu',    'tenant',           lagos_org),
      ('owner@abujaestates.ng',    'Ibrahim Danjuma', 'owner',            abuja_org),
      ('manager@abujaestates.ng',  'Ngozi Eze',       'property_manager', abuja_org),
      ('tenant@abujaestates.ng',   'Segun Adeyemi',   'tenant',           abuja_org)
    ) as t(email, full_name, role, organisation_id)
  loop
    u := gen_random_uuid();
    insert into auth.users (id) values (u);
    insert into public.users (id, email, full_name) values (u, seeded.email, seeded.full_name);
    insert into public.memberships (organisation_id, user_id, role, status, accepted_at)
    values (seeded.organisation_id, u, seeded.role::public.app_role, 'active', now());

    -- Owners are organisation-wide; others are scoped when properties exist
    -- in R1 step 2 (ORG-4).
    if seeded.role = 'owner' then
      insert into public.assignments (organisation_id, user_id, scope_type)
      values (seeded.organisation_id, u, 'organisation');
    end if;
  end loop;

  insert into public.subscriptions (organisation_id, plan_id, status, trial_ends_on, units_included)
  select id, 'trial', 'trialing', (current_date + 14), 10 from public.organisations;

  raise notice 'seeded 2 organisations with 6 users';
end
$$;
