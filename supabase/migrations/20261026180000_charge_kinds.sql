-- TV-154: the charge kinds a tenancy agrees besides rent (LEASE-2).
--
-- Alone in its own migration for the same reason as the irregular rent
-- frequency: `alter type ... add value` commits a label, but the transaction
-- that adds one may not also use it, and the Supabase CLI applies each
-- migration file inside a transaction. The table that names these in a
-- constraint is the next file.
--
-- The kinds come from the PRD's own glossary, which defines a charge as an
-- "Amount owed, such as rent, service charge, caution deposit, utility or
-- agreed fee". Caution deposits are absent on purpose: they are client money
-- with a custody lifecycle of their own and live in `lease_deposits`
-- (LEASE-13). A deposit is not a charge — it is money held, not money earned,
-- and folding it in here would put client funds in the same table as agency
-- income, which invariant 3 forbids.
--
-- Recharged repairs are also absent: MAINT-11 allocates a repair cost to a
-- payer and TV-050 owns that, including the tenant charge it creates. It will
-- use one of these kinds or add its own.
alter type public.charge_kind
add value if not exists 'service_charge';

alter type public.charge_kind
add value if not exists 'utility';

alter type public.charge_kind
add value if not exists 'agreed_fee';

comment on type public.charge_kind is 'What a charge is for (LEASE-2, RENT-1). Caution deposits are not here: they are client money in lease_deposits, not agency income.';

-- ---------------------------------------------------------------------------
-- How often a non-rent charge falls due
--
-- Not `rent_frequency`, which cannot express a one-off: a lease has no
-- "one-off rent", and adding the value there would make that nonsense
-- representable. A service charge billed once a year and a legal fee billed
-- once are both ordinary, so this enum carries both.
-- ---------------------------------------------------------------------------
create type public.charge_frequency as enum(
  'one_off',
  'monthly',
  'quarterly',
  'half_yearly',
  'annual'
);

comment on type public.charge_frequency is 'How often an agreed non-rent charge falls due (LEASE-2). ''one_off'' is a single charge for the whole term.';
