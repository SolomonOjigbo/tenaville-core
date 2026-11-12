import { describe, expect, it } from 'vitest';

import {
  daysOverdue,
  isPaymentMethod,
  monthStartIso,
  outstandingKobo,
  PAYMENT_METHODS,
  paymentMethodLabel,
  sumKobo,
  todayIso,
} from '../lib/payments';

describe('outstandingKobo', () => {
  it('subtracts what has been allocated', () => {
    expect(outstandingKobo(30_000_000, [{ amount_kobo: 10_000_000 }])).toBe(20_000_000n);
    expect(
      outstandingKobo(30_000_000, [{ amount_kobo: 10_000_000 }, { amount_kobo: 20_000_000 }]),
    ).toBe(0n);
  });

  it('puts money back when a reversal is allocated', () => {
    // A reversal is a negative allocation, so the same subtraction restores the
    // balance without special-casing history (RENT-4).
    expect(
      outstandingKobo(30_000_000, [{ amount_kobo: 30_000_000 }, { amount_kobo: -30_000_000 }]),
    ).toBe(30_000_000n);
  });

  it('treats an unallocated charge as fully owed', () => {
    expect(outstandingKobo(12_345, [])).toBe(12_345n);
  });
});

describe('sumKobo', () => {
  it('sums without passing through a float', () => {
    expect(sumKobo([1, 2, 3])).toBe(6n);
    expect(sumKobo([])).toBe(0n);
    expect(sumKobo([null, undefined, 5])).toBe(5n);
  });

  it('keeps full precision on a large total', () => {
    expect(sumKobo([Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER])).toBe(
      18_014_398_509_481_982n,
    );
  });
});

describe('daysOverdue', () => {
  it('counts whole days late', () => {
    expect(daysOverdue('2026-01-10', '2026-01-15')).toBe(5);
  });

  it('is zero on the due date and negative before it', () => {
    expect(daysOverdue('2026-01-15', '2026-01-15')).toBe(0);
    expect(daysOverdue('2026-01-20', '2026-01-15')).toBe(-5);
  });

  it('is not shifted by the machine timezone', () => {
    // Date-only values are parsed as UTC, so an operator in Lagos and one in
    // London get the same answer for a contractual due date.
    expect(daysOverdue('2026-03-31', '2026-04-01')).toBe(1);
  });

  it('returns zero rather than NaN for a malformed date', () => {
    expect(daysOverdue('not-a-date', '2026-01-15')).toBe(0);
  });
});

describe('payment methods', () => {
  it('offers the methods in a stable order', () => {
    expect(PAYMENT_METHODS[0]).toBe('cash');
    expect(PAYMENT_METHODS).toContain('bank_transfer');
    expect(PAYMENT_METHODS).toContain('mobile_money');
  });

  it('recognises only what the database enum allows', () => {
    expect(isPaymentMethod('bank_transfer')).toBe(true);
    expect(isPaymentMethod('crypto')).toBe(false);
    expect(isPaymentMethod('')).toBe(false);
  });

  it('labels a known method and passes through an unknown one', () => {
    expect(paymentMethodLabel('pos')).toBe('POS');
    expect(paymentMethodLabel('bank_transfer')).toBe('Bank transfer');
    expect(paymentMethodLabel('crypto')).toBe('crypto');
  });
});

describe('date helpers', () => {
  it('starts the month on the first', () => {
    expect(monthStartIso('2026-03-18')).toBe('2026-03-01');
  });

  it('produces an ISO date', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
