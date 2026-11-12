import { describe, expect, it } from 'vitest';

import { balanceFromEntries } from '../domain/balance';

describe('balanceFromEntries', () => {
  it('sums signed entries', () => {
    expect(balanceFromEntries([{ amount_kobo: 30_000_000 }, { amount_kobo: -3_000_000 }])).toBe(
      27_000_000n,
    );
  });

  it('nets a reversal to zero', () => {
    expect(balanceFromEntries([{ amount_kobo: 30_000_000 }, { amount_kobo: -30_000_000 }])).toBe(
      0n,
    );
  });

  it('accepts bigint entries and an empty ledger', () => {
    expect(balanceFromEntries([{ amount_kobo: 5n }, { amount_kobo: -2n }])).toBe(3n);
    expect(balanceFromEntries([])).toBe(0n);
  });
});
