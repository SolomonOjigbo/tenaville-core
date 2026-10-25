-- Subscription plans (BILL-1). Priced by units under management, in naira,
-- stored as integer kobo (PRD §10.1): ₦25,000.00 is 2_500_000.
--
-- These figures are placeholders. PRD open decision 11 — tier structure and
-- unit-based price points — is unresolved, and §15 requires validating
-- willingness to pay with 5-10 Nigerian agencies before publishing prices.
insert into
  public.plans (
    id,
    name,
    description,
    unit_limit,
    price_kobo,
    billing_period,
    trial_days,
    is_public,
    sort_order
  )
values
  (
    'trial',
    'Trial',
    '14 days, up to 10 units.',
    10,
    0,
    'monthly',
    14,
    true,
    0
  ),
  (
    'starter',
    'Starter',
    'Small portfolio or individual landlord.',
    50,
    2500000,
    'monthly',
    0,
    true,
    1
  ),
  (
    'growth',
    'Growth',
    'Growing agency.',
    250,
    10000000,
    'monthly',
    0,
    true,
    2
  ),
  (
    'scale',
    'Scale',
    'Multi-branch agency.',
    1000,
    30000000,
    'monthly',
    0,
    true,
    3
  ),
  (
    'pilot',
    'Pilot',
    'Negotiated pilot terms.',
    null,
    0,
    'monthly',
    90,
    false,
    9
  )
on conflict (id) do nothing;
