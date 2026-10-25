-- Test helpers. Applied before the test files (the runner sorts by filename),
-- and deliberately not part of a migration: nothing here exists in production.
create schema if not exists tests;

-- Simulate a signed-in user.
--
-- Both claim forms are set on purpose. The Supabase Postgres image defines
-- auth.uid() over the older `request.jwt.claim.sub` GUC, while the hosted
-- platform reads the `request.jwt.claims` JSON. Setting both means a test
-- asserts the policy, not the image's accident of definition — and the test
-- keeps working whichever form auth.uid() uses.
create or replace function tests.authenticate (user_id uuid, user_email text default null) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  perform set_config('request.jwt.claim.email', coalesce(user_email, ''), true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', user_id::text,
      'email', coalesce(user_email, ''),
      'role', 'authenticated'
    )::text,
    true
  );
  execute 'set local role authenticated';
end;
$$;

-- Drop back to an unauthenticated caller.
create or replace function tests.deauthenticate () returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
end;
$$;

-- Return to the owner, so a test can set up fixtures that policies would block.
create or replace function tests.as_owner () returns void language plpgsql as $$
begin
  execute 'reset role';
end;
$$;

-- Create an auth user without GoTrue.
create or replace function tests.create_user (user_email text) returns uuid language plpgsql as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into auth.users (id) values (new_id);
  insert into public.users (id, email, full_name)
  values (new_id, user_email, split_part(user_email, '@', 1));
  return new_id;
end;
$$;

-- The helpers are called while impersonating anon or authenticated — switching
-- role is the whole point — so those roles need to reach this schema.
-- Test-only: nothing here is created by a migration.
grant usage on schema tests to anon,
authenticated,
service_role;

grant
execute on all functions in schema tests to anon,
authenticated,
service_role;
