-- Adds 'irregular' to rent_frequency (RENT-1, TV-018).
--
-- Alone in its own migration on purpose. `alter type ... add value` commits a
-- new label, but the transaction that adds it may not also *use* it: Postgres
-- rejects "unsafe use of new value of enum type". The charges migration names
-- 'irregular' in a check constraint, so the two cannot share a file — the
-- Supabase CLI applies each migration inside one transaction.
--
-- An irregular rent is a bespoke schedule: two instalments of unequal size, or
-- a single payment for the whole term, which is common where a landlord has
-- agreed staged payments for an expensive unit. The dates and amounts live on
-- the charges rather than being derivable from a frequency, so for an
-- irregular lease `leases.rent_kobo` is the total for the term and not the
-- amount per period.
alter type public.rent_frequency
add value if not exists 'irregular';

comment on type public.rent_frequency is 'How often rent falls due (RENT-1). For every value but ''irregular'', leases.rent_kobo is the amount due each period; for ''irregular'' it is the total for the term and the charges carry the instalments.';
