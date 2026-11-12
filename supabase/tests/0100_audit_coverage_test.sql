-- Audit coverage (ORG-5, PRD §10.7).
--
-- Written over the catalogue rather than table by table, like the RLS coverage
-- test, so a table added in a later release cannot ship unaudited by accident.
-- A new table fails this until somebody decides which list it belongs in —
-- which is the point: the decision should be made, not defaulted.

begin;
select plan(5);

-- Tables that deliberately carry no audit trigger, each with its reason.
-- Adding a row here is a decision; forgetting to is a failure.
create temporary table audit_exempt (table_name text primary key, reason text not null);
insert into audit_exempt values
  ('audit_events',      'is the trail itself, and append-only'),
  ('nigerian_states',   'reference data, not organisation-scoped'),
  ('plans',             'global price list, changed by deployment not by users'),
  ('features',          'as plans: the feature catalogue, and it has no organisation to attribute a change to'),
  ('plan_features',     'as plans: the published feature matrix as reference data'),
  ('plan_roles',        'as plans: which roles a plan may assign. A *membership* role change is audited, which is the act ORG-5 names'),
  ('users',             'a person editing their own name or phone; ORG-5 does not name it'),
  ('import_rows',       'rows within a batch; the batch itself is audited'),
  ('device_sessions',   'ORG-9: revocation auditing arrives with the device list API (TV-006)'),
  ('branches',          'ORG-6 is R2; audit when branch features ship'),
  ('subscriptions',     'changed only by verified billing events; auditing arrives with BILL-2'),
  ('landlords',         'the sensitive part, remittance details, is audited separately'),
  ('properties',        'ORG-5 names lease, financial, screening, document and permission changes, not property records'),
  ('units',             'as properties; occupancy follows the lease, which is audited'),
  ('tenants',           'contact details; the tenancy itself is audited through leases'),
  ('tenant_contacts',   'third-party contact details, collected and removed freely by design'),
  ('property_photos',   'DOC-7 audits access; the row is a path, not a decision'),
  ('lease_handovers',   'evidence recorded once at move-in or move-out; the lease status change is audited'),
  ('maintenance_events','the maintenance timeline itself, append-only; approvals and costs are audited separately'),
  ('receipt_counters',  'internal gapless allocator; the receipt that consumes a number is audited');

-- Every base table is either audited or explicitly exempt.
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname not in (select table_name from audit_exempt)
      and not exists (
        select 1
        from pg_trigger t
        join pg_proc p on p.oid = t.tgfoid
        join pg_namespace pn on pn.oid = p.pronamespace
        where t.tgrelid = c.oid
          and not t.tgisinternal
          and pn.nspname = 'app'
          and p.proname like 'audit%'
      )
  $$,
  'ORG-5: every table is audited or explicitly exempt, with a reason'
);

-- The exempt list must not name tables that no longer exist, or it quietly
-- stops covering the thing it was written for.
select is_empty(
  $$
    select table_name from audit_exempt e
    where not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relname = e.table_name
    )
  $$,
  'the exemption list names only tables that exist'
);

-- The categories ORG-5 names, for the entities that exist today.
select is_empty(
  $$
    select t.name
    from (values ('leases'), ('lease_parties'), ('lease_deposits'), ('deposit_deductions')) as t(name)
    where not exists (
      select 1
      from pg_trigger tr
      join pg_class c on c.oid = tr.tgrelid
      join pg_proc p on p.oid = tr.tgfoid
      join pg_namespace pn on pn.oid = p.pronamespace
      where c.relname = t.name and not tr.tgisinternal
        and pn.nspname = 'app' and p.proname like 'audit%'
    )
  $$,
  'ORG-5: lease changes are audited'
);

select is_empty(
  $$
    select t.name
    from (values ('memberships'), ('assignments')) as t(name)
    where not exists (
      select 1
      from pg_trigger tr
      join pg_class c on c.oid = tr.tgrelid
      join pg_proc p on p.oid = tr.tgfoid
      join pg_namespace pn on pn.oid = p.pronamespace
      where c.relname = t.name and not tr.tgisinternal
        and pn.nspname = 'app' and p.proname like 'audit%'
    )
  $$,
  'ORG-5: permission changes are audited, including scoped access'
);

select is_empty(
  $$
    select t.name
    from (values ('management_mandates'), ('landlord_remittance_details')) as t(name)
    where not exists (
      select 1
      from pg_trigger tr
      join pg_class c on c.oid = tr.tgrelid
      join pg_proc p on p.oid = tr.tgfoid
      join pg_namespace pn on pn.oid = p.pronamespace
      where c.relname = t.name and not tr.tgisinternal
        and pn.nspname = 'app' and p.proname like 'audit%'
    )
  $$,
  'ORG-5: the financial terms that exist today are audited'
);

select * from finish();
rollback;
