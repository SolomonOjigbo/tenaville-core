-- Pricing plans (BILL-1, and the decisions in
-- docs/requirements/sprint-4-decisions-and-pricing.md).
--
-- Prices are a product decision, but several properties of them are rules that
-- can rot quietly: an annual plan that stops being a discount, a tier whose
-- two billing rows disagree about what you get, a price stored in naira
-- instead of kobo. These assert the rules, not the numbers, except where the
-- number is the decision.

begin;
select plan(11);

-- --- every price is integer kobo (PRD §10.1) -------------------------------
select is_empty(
  $$ select id from public.plans where price_kobo % 100 <> 0 and price_kobo > 0 $$,
  'PRD §10.1: published prices are whole naira, stored as kobo'
);

select is(
  (select price_kobo from public.plans where id = 'landlord_monthly'),
  999900::bigint,
  'the Landlord plan is ₦9,999.00, stored as kobo'
);

-- --- the annual discount is between 10% and 15% ----------------------------
--
-- The decision was a graduated discount in that range. A later price change
-- that quietly makes annual *more* expensive than paying monthly, or more
-- generous than intended, fails here.
select is_empty(
  $$
    select a.tier::text
    from public.plans a
    join public.plans m
      on m.tier = a.tier and m.billing_period = 'monthly' and m.is_public
    where a.billing_period = 'annual'
      and a.is_public
      and a.price_kobo > 0
      and (
        a.price_kobo >= m.price_kobo * 12 * 90 / 100
        or a.price_kobo <= m.price_kobo * 12 * 85 / 100
      )
  $$,
  'every annual plan is discounted between 10% and 15% against twelve monthly payments'
);

select is(
  (select round(100 - (a.price_kobo * 100.0) / (m.price_kobo * 12))
     from public.plans a
     join public.plans m
      on m.tier = a.tier and m.billing_period = 'monthly' and m.is_public
    where a.id = 'growth_annual'),
  15::numeric,
  'Growth, the largest commitment, carries the largest discount at 15%'
);

-- --- the ladder keeps its shape -------------------------------------------
select is_empty(
  $$
    select tier::text from public.plans
    where billing_period = 'monthly' and unit_limit is not null
      and unit_overage_kobo is not null
      and unit_overage_kobo > (price_kobo / unit_limit)
  $$,
  'an extra unit never costs more than an included one, so growing is not punished'
);

-- Within the agency ladder, scale is rewarded. Landlord is deliberately not
-- part of that ladder: it serves owners rather than agencies and omits the
-- landlord ledger, commission and statements, so it is priced as its own
-- segment rather than as a smaller Agent. An earlier version of this test
-- assumed one continuous volume ladder and failed on exactly that.
select cmp_ok(
  (select price_kobo / unit_limit from public.plans where id = 'growth_monthly'),
  '<',
  (select price_kobo / unit_limit from public.plans where id = 'agent_monthly'),
  'Growth costs less per included unit than Agent: the agency ladder rewards scale'
);

select cmp_ok(
  (select abs(
     (select price_kobo::numeric / unit_limit from public.plans where id = 'agent_monthly')
     - (select price_kobo::numeric / unit_limit from public.plans where id = 'landlord_monthly')
   ) / (select price_kobo::numeric / unit_limit from public.plans where id = 'landlord_monthly')),
  '<',
  0.10::numeric,
  'Landlord and Agent stay within 10% per unit, so an owner is not penalised for being small'
);

-- --- the two rows of a tier agree on what you get -------------------------
select is_empty(
  $$
    select a.tier::text
    from public.plans a
    join public.plans m
      on m.tier = a.tier and m.billing_period = 'monthly' and m.is_public
    where a.billing_period = 'annual'
      and a.is_public
      and a.tier <> 'enterprise'
      and (a.unit_limit is distinct from m.unit_limit
        or a.user_limit is distinct from m.user_limit
        or a.property_limit is distinct from m.property_limit
        or a.storage_mb is distinct from m.storage_mb
        or a.included_messages is distinct from m.included_messages
        or a.unit_overage_kobo is distinct from m.unit_overage_kobo)
  $$,
  'paying annually changes the price, never the entitlements'
);

-- --- the free plan ---------------------------------------------------------
select is(
  (select price_kobo from public.plans where id = 'free'),
  0::bigint,
  'the free plan is free'
);

select is(
  (select property_limit || '/' || unit_limit from public.plans where id = 'free'),
  '1/10',
  'the free plan runs one property of up to ten units, as section 3.2 specifies'
);

-- --- signup still finds its trial ------------------------------------------
-- create_organisation_with_owner looks the trial up by id; losing it would
-- silently stop starting trials.
select is(
  (select trial_days from public.plans where id = 'trial'),
  30,
  'the trial is 30 days, long enough to reach a month-end'
);

select * from finish();
rollback;
