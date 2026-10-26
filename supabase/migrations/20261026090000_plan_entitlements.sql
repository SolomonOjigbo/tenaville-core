-- Pricing plans as decided in docs/requirements/sprint-4-decisions-and-pricing.md.
--
-- The plans table held a price and a unit limit, which was enough for a
-- placeholder. The agreed pricing needs more: a tier that monthly and annual
-- rows share, the per-unit charge above the included band, the extra-user
-- price, and the limits that the entitlements service (TV-147) will enforce.
--
-- Prices stay integer kobo (PRD §10.1). ₦9,999.00 is 999900.
create type public.plan_tier as enum(
  'free',
  'landlord',
  'agent',
  'growth',
  'enterprise'
);

alter table public.plans
add column tier public.plan_tier,
-- Charged for each unit above unit_limit. Null where there is no overage:
-- the free plan blocks instead, and enterprise is negotiated.
add column unit_overage_kobo bigint check (unit_overage_kobo >= 0),
add column extra_user_kobo bigint check (extra_user_kobo >= 0),
add column property_limit integer check (
  property_limit is null
  or property_limit > 0
),
add column user_limit integer check (
  user_limit is null
  or user_limit > 0
),
add column storage_mb integer check (
  storage_mb is null
  or storage_mb > 0
),
-- Automated WhatsApp and SMS included per month. Manual sharing is
-- unmetered because it costs nothing to send.
add column included_messages integer check (
  included_messages is null
  or included_messages >= 0
);

comment on column public.plans.unit_overage_kobo is 'Per unit above unit_limit, integer kobo. The bill is capped at the next tier price; the cap lives in the billing logic, not here.';

comment on column public.plans.tier is 'Groups the monthly and annual rows of the same plan. Both carry the same entitlements; a test asserts they agree.';

-- A tier is *offered* at most once per billing period. Scoped to public plans
-- because the trial carries Growth's entitlements at no charge, and a
-- negotiated enterprise plan is not on the price list either — neither is a
-- second offer of the same tier.
create unique index plans_tier_period_idx on public.plans (tier, billing_period)
where
  tier is not null
  and is_public;

-- ---------------------------------------------------------------------------
-- Replace the placeholder plans
--
-- The seeded placeholders (starter, growth, scale, pilot) were invented to
-- have something to reference. These are the agreed prices. The trial plan
-- keeps its id because create_organisation_with_owner looks it up by name.
-- ---------------------------------------------------------------------------
delete from public.plans
where
  id in ('starter', 'growth', 'scale', 'pilot');

insert into
  public.plans (
    id,
    tier,
    name,
    description,
    billing_period,
    price_kobo,
    unit_limit,
    unit_overage_kobo,
    extra_user_kobo,
    property_limit,
    user_limit,
    storage_mb,
    included_messages,
    trial_days,
    is_public,
    sort_order
  )
values
  (
    'free',
    'free',
    'Free',
    'One property, up to 10 units. Enough for a landlord to run one building end to end.',
    'monthly',
    0,
    10,
    null,
    null,
    1,
    2,
    200,
    0,
    0,
    true,
    0
  ),
  (
    'landlord_monthly',
    'landlord',
    'Landlord',
    'Owners with a few properties.',
    'monthly',
    999900,
    30,
    30000,
    250000,
    5,
    3,
    2048,
    150,
    0,
    true,
    10
  ),
  -- ₦107,900, not ₦107,999: the latter works out at 9.99%, a hair under the
  -- 10% floor the pricing decision sets. A test enforces the band.
  (
    'landlord_annual',
    'landlord',
    'Landlord, annual',
    'Owners with a few properties. Paid annually in advance, 10% off.',
    'annual',
    10790000,
    30,
    30000,
    250000,
    5,
    3,
    2048,
    150,
    0,
    true,
    11
  ),
  (
    'agent_monthly',
    'agent',
    'Agent',
    'Agencies managing for landlords.',
    'monthly',
    3399900,
    100,
    27500,
    250000,
    null,
    5,
    10240,
    500,
    0,
    true,
    20
  ),
  (
    'agent_annual',
    'agent',
    'Agent, annual',
    'Agencies managing for landlords. Paid annually in advance, 12% off.',
    'annual',
    35899900,
    100,
    27500,
    250000,
    null,
    5,
    10240,
    500,
    0,
    true,
    21
  ),
  (
    'growth_monthly',
    'growth',
    'Growth',
    'Larger agencies with several offices.',
    'monthly',
    9299900,
    350,
    23000,
    250000,
    null,
    15,
    51200,
    1750,
    0,
    true,
    30
  ),
  (
    'growth_annual',
    'growth',
    'Growth, annual',
    'Larger agencies with several offices. Paid annually in advance, 15% off.',
    'annual',
    94899900,
    350,
    23000,
    250000,
    null,
    15,
    51200,
    1750,
    0,
    true,
    31
  ),
  (
    'enterprise',
    'enterprise',
    'Enterprise',
    'Large portfolios. Priced on application.',
    'annual',
    0,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    0,
    false,
    40
  )
on conflict (id) do update
set
  tier = excluded.tier,
  name = excluded.name,
  description = excluded.description,
  billing_period = excluded.billing_period,
  price_kobo = excluded.price_kobo,
  unit_limit = excluded.unit_limit,
  unit_overage_kobo = excluded.unit_overage_kobo,
  extra_user_kobo = excluded.extra_user_kobo,
  property_limit = excluded.property_limit,
  user_limit = excluded.user_limit,
  storage_mb = excluded.storage_mb,
  included_messages = excluded.included_messages,
  is_public = excluded.is_public,
  sort_order = excluded.sort_order;

-- The trial keeps Growth's limits, as section 3.6 specifies: an agency only
-- sees the value after a full month-end, and that needs the paid features.
insert into
  public.plans (
    id,
    tier,
    name,
    description,
    billing_period,
    price_kobo,
    unit_limit,
    property_limit,
    user_limit,
    storage_mb,
    included_messages,
    trial_days,
    is_public,
    sort_order
  )
values
  (
    'trial',
    'growth',
    'Trial',
    '30 days with Growth features. No card required.',
    'monthly',
    0,
    350,
    null,
    15,
    51200,
    1750,
    30,
    false,
    1
  )
on conflict (id) do update
set
  tier = excluded.tier,
  name = excluded.name,
  description = excluded.description,
  unit_limit = excluded.unit_limit,
  property_limit = excluded.property_limit,
  user_limit = excluded.user_limit,
  storage_mb = excluded.storage_mb,
  included_messages = excluded.included_messages,
  trial_days = excluded.trial_days,
  is_public = excluded.is_public,
  sort_order = excluded.sort_order;
