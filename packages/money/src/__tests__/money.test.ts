import { describe, expect, it } from 'vitest';

import {
  MoneyParseError,
  toSafeNumber,
  ZERO,
  add,
  allocate,
  applyRate,
  compare,
  formatNaira,
  fromNaira,
  fromTransport,
  isNegative,
  kobo,
  parseNaira,
  subtract,
  toTransport,
} from '../index';

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

describe('applyRate', () => {
  it('matches the four worked examples in the Sprint 4 decision record', () => {
    // These are the examples pilot agencies will be shown, so they are tests
    // before they are documentation.
    expect(applyRate(parseNaira('1,200,000.00'), 1000)).toBe(parseNaira('120,000.00'));
    expect(applyRate(parseNaira('333,333.33'), 750)).toBe(parseNaira('25,000.00'));
    expect(applyRate(parseNaira('150,000.55'), 500)).toBe(parseNaira('7,500.03'));
    expect(applyRate(parseNaira('0.05'), 1000)).toBe(parseNaira('0.01'));
  });

  it('rounds half a kobo up, and anything below it down', () => {
    // 1 kobo at 5000 bps is exactly half a kobo.
    expect(applyRate(kobo(1n), 5000)).toBe(kobo(1n));
    // 1 kobo at 4999 bps is just under half, so it rounds to nothing.
    expect(applyRate(kobo(1n), 4999)).toBe(ZERO);
  });

  it('keeps whole-kobo amounts exact', () => {
    expect(applyRate(parseNaira('1,250,000.00'), 1000)).toBe(parseNaira('125,000.00'));
    expect(applyRate(parseNaira('1,250,000.00'), 0)).toBe(ZERO);
    expect(applyRate(ZERO, 1000)).toBe(ZERO);
  });

  it('refuses inputs that would mean recomputing a reversal', () => {
    expect(() => applyRate(parseNaira('-500'), 1000)).toThrow(MoneyParseError);
    expect(() => applyRate(parseNaira('500'), -1)).toThrow(MoneyParseError);
    expect(() => applyRate(parseNaira('500'), 12.5)).toThrow(MoneyParseError);
  });

  it('does not lose precision on an amount beyond a float', () => {
    const huge = parseNaira('99,999,999,999,999.99');
    expect(applyRate(huge, 10000)).toBe(huge);
  });
});

describe('allocate', () => {
  it('splits an amount so the parts sum back to it', () => {
    const parts = allocate(parseNaira('1,000,000.00'), [
      parseNaira('1'),
      parseNaira('1'),
      parseNaira('1'),
    ]);
    expect(parts.reduce<bigint>((sum, part) => sum + part, 0n)).toBe(parseNaira('1,000,000.00'));
    // 100,000,000 kobo / 3 leaves one kobo over, which goes to the first tie.
    expect(parts).toEqual([kobo(33_333_334n), kobo(33_333_333n), kobo(33_333_333n)]);
  });

  it('allocates in proportion to the weights, not equally', () => {
    const parts = allocate(parseNaira('1,000.00'), [
      parseNaira('600'),
      parseNaira('300'),
      parseNaira('100'),
    ]);
    expect(parts).toEqual([parseNaira('600'), parseNaira('300'), parseNaira('100')]);
  });

  it('gives leftover kobo to the largest fractional shares, ties by position', () => {
    // Total 3, amount 10: exact shares are 3.33, 3.33, 3.33 with 1 kobo spare.
    const parts = allocate(kobo(10n), [kobo(1n), kobo(1n), kobo(1n)]);
    expect(parts).toEqual([kobo(4n), kobo(3n), kobo(3n)]);
    expect(parts.reduce<bigint>((sum, part) => sum + part, 0n)).toBe(10n);
  });

  it('never awards a kobo to a zero weight', () => {
    const parts = allocate(kobo(5n), [kobo(1n), kobo(0n), kobo(1n)]);
    expect(parts).toEqual([kobo(3n), kobo(0n), kobo(2n)]);
  });

  it('handles a single weight and an amount smaller than the weight count', () => {
    expect(allocate(kobo(7n), [kobo(3n)])).toEqual([kobo(7n)]);
    expect(allocate(kobo(2n), [kobo(5n), kobo(5n), kobo(5n)])).toEqual([
      kobo(1n),
      kobo(1n),
      kobo(0n),
    ]);
  });

  it('rejects inputs it cannot split without inventing or losing money', () => {
    expect(() => allocate(parseNaira('-1'), [kobo(1n)])).toThrow(MoneyParseError);
    expect(() => allocate(kobo(1n), [])).toThrow(MoneyParseError);
    expect(() => allocate(kobo(1n), [kobo(0n)])).toThrow(MoneyParseError);
    expect(() => allocate(kobo(1n), [kobo(1n), kobo(-1n)])).toThrow(MoneyParseError);
  });

  it('sums exactly on a large split', () => {
    const amount = parseNaira('99,999,999.99');
    const weights = [kobo(1n), kobo(7n), kobo(11n), kobo(13n), kobo(17n)];
    const parts = allocate(amount, weights);
    expect(parts.reduce<bigint>((sum, part) => sum + part, 0n)).toBe(amount);
  });
});
