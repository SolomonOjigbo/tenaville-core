import { describe, expect, it } from 'vitest';

import {
  asPlanRefusal,
  describeAllowance,
  hasFeature,
  isPlanLimitError,
  percentageUsed,
  planRefusalMessage,
  type Allowance,
  type Entitlements,
} from '../domain/entitlements';

const allowance = (overrides: Partial<Allowance> = {}): Allowance => ({
  used: 3,
  limit: 10,
  verdict: 'within',
  overageKobo: null,
  ...overrides,
});

describe('asPlanRefusal', () => {
  it('recognises 53400 and keeps both halves of what the database said', () => {
    const refusal = asPlanRefusal({
      code: '53400',
      message: 'the Free plan includes 1 properties, and this organisation already has 1',
      hint: 'Upgrade the plan to add more properties. Nothing is removed in the meantime.',
    });

    expect(refusal?.message).toContain('Free plan includes 1 properties');
    expect(refusal?.hint).toContain('Upgrade the plan');
    expect(refusal?.feature).toBeNull();
  });

  it('picks up the feature key a gate puts in detail, under either spelling', () => {
    // supabase-js reports `details`; node-postgres reports `detail`. A client
    // swap should not quietly stop the upgrade prompt naming the feature.
    for (const error of [
      {
        code: '53400',
        message: 'Multiple landlords is not included',
        details: 'multi_landlord_ledger',
      },
      {
        code: '53400',
        message: 'Multiple landlords is not included',
        detail: 'multi_landlord_ledger',
      },
    ]) {
      expect(asPlanRefusal(error)?.feature).toBe('multi_landlord_ledger');
    }
  });

  it('ignores a detail that is not a feature key', () => {
    expect(
      asPlanRefusal({ code: '53400', message: 'x', details: 'Key (id)=(7) already exists' })
        ?.feature,
    ).toBeNull();
  });

  it('leaves other errors alone', () => {
    expect(asPlanRefusal({ code: '23505', message: 'duplicate key' })).toBeNull();
    expect(asPlanRefusal(null)).toBeNull();
    expect(asPlanRefusal('53400')).toBeNull();
    expect(isPlanLimitError(new Error('53400'))).toBe(false);
  });
});

describe('planRefusalMessage', () => {
  it('joins the refusal and the way out', () => {
    expect(
      planRefusalMessage({ message: 'No room', hint: 'Upgrade the plan.', feature: null }),
    ).toBe('No room. Upgrade the plan.');
  });

  it('does not invent a hint when the database sent none', () => {
    expect(planRefusalMessage({ message: 'No room', hint: null, feature: null })).toBe('No room');
  });
});

describe('percentageUsed', () => {
  it('reports how full an allowance is', () => {
    expect(percentageUsed(allowance({ used: 3, limit: 10 }))).toBe(30);
    expect(percentageUsed(allowance({ used: 10, limit: 10 }))).toBe(100);
  });

  it('caps at 100 so a downgraded organisation does not overflow the bar', () => {
    expect(percentageUsed(allowance({ used: 101, limit: 10 }))).toBe(100);
  });

  it('has no answer for an unlimited allowance', () => {
    // 0% next to the word "unlimited" reads as a fault, so the caller is made
    // to handle the case.
    expect(percentageUsed(allowance({ limit: null }))).toBeNull();
    expect(percentageUsed(allowance({ limit: 0 }))).toBeNull();
  });
});

describe('describeAllowance', () => {
  it('reads as a fraction, or as a plain count when unlimited', () => {
    expect(describeAllowance(allowance({ used: 3, limit: 10 }))).toBe('3 of 10');
    expect(describeAllowance(allowance({ used: 420, limit: null }))).toBe('420');
  });
});

describe('hasFeature', () => {
  const entitlements = {
    features: ['automated_messaging', 'full_reports'],
  } as unknown as Entitlements;

  it('answers from the grants the database returned', () => {
    expect(hasFeature(entitlements, 'full_reports')).toBe(true);
    expect(hasFeature(entitlements, 'multi_landlord_ledger')).toBe(false);
  });
});
