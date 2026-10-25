import { describe, expect, it } from 'vitest';

import {
  MoneyParseError,
  toSafeNumber,
  ZERO,
  add,
  compare,
  formatNaira,
  fromNaira,
  fromTransport,
  isNegative,
  kobo,
  parseNaira,
  subtract,
  toTransport,
} from '../index.js';

describe('parseNaira', () => {
  it('parses the forms an agency actually types', () => {
    // These are the variations that appear in real spreadsheets.
    expect(parseNaira('1250000')).toBe(125_000_000n);
    expect(parseNaira('1,250,000')).toBe(125_000_000n);
    expect(parseNaira('₦1,250,000.00')).toBe(125_000_000n);
    expect(parseNaira('NGN 1250000')).toBe(125_000_000n);
    expect(parseNaira('  1 250 000  ')).toBe(125_000_000n);
    expect(parseNaira('1250000.5')).toBe(125_000_050n);
    expect(parseNaira('1250000.05')).toBe(125_000_005n);
    expect(parseNaira('-500')).toBe(-50_000n);
  });

  it('rejects precision finer than one kobo instead of rounding it away', () => {
    // Silently rounding an agency's figure is how a statement stops matching
    // their own records.
    expect(() => parseNaira('100.123')).toThrow(MoneyParseError);
    expect(() => parseNaira('100.999')).toThrow(/two decimal places/);
  });

  it('rejects what is not a number', () => {
    for (const bad of ['', '   ', 'abc', '1.2.3', '₦', '12-34', '1e6']) {
      expect(() => parseNaira(bad), `"${bad}" should be rejected`).toThrow(MoneyParseError);
    }
  });

  it('keeps full precision on amounts beyond a float', () => {
    // An annual rent roll for a large agency exceeds Number.MAX_SAFE_INTEGER
    // once expressed in kobo, which is the whole reason for bigint.
    const huge = parseNaira('99,999,999,999,999.99');
    expect(huge).toBe(9_999_999_999_999_999n);
    expect(formatNaira(huge)).toBe('₦99,999,999,999,999.99');
  });
});

describe('formatNaira', () => {
  it('formats with thousands separators and two minor digits', () => {
    expect(formatNaira(kobo(125_000_000n))).toBe('₦1,250,000.00');
    expect(formatNaira(kobo(5n))).toBe('₦0.05');
    expect(formatNaira(ZERO)).toBe('₦0.00');
    expect(formatNaira(kobo(-50_000n))).toBe('-₦500.00');
  });

  it('can omit the symbol for documents that supply their own', () => {
    expect(formatNaira(kobo(125_000_000n), { symbol: false })).toBe('1,250,000.00');
  });

  it('round-trips through parse', () => {
    for (const input of ['0.01', '1', '999.99', '1,250,000.00', '87,654,321.09']) {
      expect(formatNaira(parseNaira(input), { symbol: false })).toBe(
        input.includes('.') ? input : `${input}.00`,
      );
    }
  });
});

describe('arithmetic', () => {
  it('adds and subtracts exactly', () => {
    // 0.1 + 0.2 in floating point is the canonical example; in kobo it is exact.
    const a = parseNaira('0.10');
    const b = parseNaira('0.20');
    expect(add(a, b)).toBe(parseNaira('0.30'));
    expect(subtract(parseNaira('1000'), parseNaira('999.99'))).toBe(parseNaira('0.01'));
  });

  it('sums an empty list to zero', () => {
    expect(add()).toBe(ZERO);
  });

  it('compares and reports sign', () => {
    expect(compare(parseNaira('1'), parseNaira('2'))).toBe(-1);
    expect(compare(parseNaira('2'), parseNaira('2'))).toBe(0);
    expect(isNegative(subtract(parseNaira('1'), parseNaira('2')))).toBe(true);
  });
});

describe('fromNaira', () => {
  it('accepts whole and two-decimal values', () => {
    expect(fromNaira(1250)).toBe(125_000n);
    expect(fromNaira(0.01)).toBe(1n);
    expect(fromNaira(99.99)).toBe(9999n);
  });

  it('rejects finer precision and non-finite input', () => {
    expect(() => fromNaira(0.001)).toThrow(MoneyParseError);
    expect(() => fromNaira(Number.NaN)).toThrow(MoneyParseError);
    expect(() => fromNaira(Number.POSITIVE_INFINITY)).toThrow(MoneyParseError);
  });
});

describe('transport', () => {
  it('crosses JSON as a string, because bigint cannot be serialised', () => {
    const amount = parseNaira('1,250,000.00');
    expect(toTransport(amount)).toBe('125000000');
    expect(fromTransport(toTransport(amount))).toBe(amount);
    const roundTripped = JSON.parse(JSON.stringify({ rent: toTransport(amount) })) as {
      rent: string;
    };
    expect(roundTripped.rent).toBe('125000000');
  });

  it('rejects a malformed transport value', () => {
    for (const bad of ['1.5', '', 'abc', '1e3']) {
      expect(() => fromTransport(bad)).toThrow(MoneyParseError);
    }
  });
});

describe('kobo', () => {
  it('rejects fractional and unsafe numbers', () => {
    expect(() => kobo(1.5)).toThrow(MoneyParseError);
    expect(() => kobo(Number.MAX_SAFE_INTEGER + 2)).toThrow(MoneyParseError);
  });
});

describe('toSafeNumber', () => {
  it('converts amounts a database write can represent', () => {
    expect(toSafeNumber(parseNaira('1,250,000.00'))).toBe(125_000_000);
    expect(toSafeNumber(ZERO)).toBe(0);
  });

  it('throws rather than silently losing precision beyond the safe range', () => {
    // Supabase's generated types expose bigint columns as `number`. That is
    // fine up to about ₦90 trillion, and only because this check exists.
    const justOver = kobo(BigInt(Number.MAX_SAFE_INTEGER) + 1n);
    expect(() => toSafeNumber(justOver)).toThrow(MoneyParseError);
    expect(() => toSafeNumber(justOver)).toThrow(/safe integer range/);
  });

  it('accepts the largest safe amount', () => {
    expect(toSafeNumber(kobo(BigInt(Number.MAX_SAFE_INTEGER)))).toBe(Number.MAX_SAFE_INTEGER);
  });
});
