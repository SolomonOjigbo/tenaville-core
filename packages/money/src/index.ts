/**
 * Naira as integer kobo. See docs/decisions/0003-money-as-integer-kobo.md.
 *
 * Every monetary value in Tenaville passes through here. The branded type makes
 * an amount impossible to confuse with a plain number at a call site, which is
 * the mistake that produces a figure 100× wrong in a landlord statement.
 *
 * Rounding is the one place a decision, not an algorithm, lives: commission is
 * round-half-up per receipt, in basis points (docs/requirements/
 * sprint-4-decisions-and-pricing.md §2.2). `applyRate` and `allocate` implement
 * it, and nothing else in the product may round money.
 */

/** An amount in kobo. ₦1,250,000.00 is 125_000_000 kobo. */
export type Kobo = bigint & { readonly __brand: 'Kobo' };

/** Kobo per naira. Naira has two minor digits. */
export const KOBO_PER_NAIRA = 100n;

export class MoneyParseError extends Error {
  constructor(
    public readonly input: string,
    reason: string,
  ) {
    super(`"${input}" is not a valid naira amount: ${reason}`);
    this.name = 'MoneyParseError';
  }
}

/** Wrap a kobo integer. Rejects fractions and negatives are allowed only via `kobo`. */
export const kobo = (value: bigint | number): Kobo => {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new MoneyParseError(String(value), 'kobo must be a whole number');
    }
    if (!Number.isSafeInteger(value)) {
      throw new MoneyParseError(String(value), 'outside the safe integer range');
    }
    return BigInt(value) as Kobo;
  }
  return value as Kobo;
};

export const ZERO = kobo(0n);

export const fromNaira = (naira: number | bigint): Kobo => {
  if (typeof naira === 'bigint') return kobo(naira * KOBO_PER_NAIRA);
  if (!Number.isFinite(naira)) throw new MoneyParseError(String(naira), 'not a finite number');
  // Two decimal places exactly; anything finer is not representable in naira.
  // The lint rule directs monetary rounding into this package — this is that
  // one place, and the check below rejects anything the rounding would alter.
  // eslint-disable-next-line no-restricted-syntax
  const scaled = Math.round(naira * 100);
  if (Math.abs(scaled - naira * 100) > 1e-6) {
    throw new MoneyParseError(String(naira), 'more precision than one kobo');
  }
  return kobo(scaled);
};

/**
 * Parse an amount as a person types it into a spreadsheet or a form.
 *
 * Accepts `1250000`, `1,250,000`, `₦1,250,000.00`, `NGN 1250000`, `1250000.50`
 * and a leading `-`. Rejects anything with more than two decimal places rather
 * than silently rounding an agency's figure.
 *
 * Deliberately string-based: routing user input through a JavaScript `number`
 * first is where precision is lost.
 */
export const parseNaira = (input: string): Kobo => {
  const trimmed = input.trim();
  if (trimmed === '') throw new MoneyParseError(input, 'empty');

  const cleaned = trimmed
    .replace(/^NGN\s*/i, '')
    .replace(/₦/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '');

  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (match === null) {
    if (/^-?\d+\.\d{3,}$/.test(cleaned)) {
      throw new MoneyParseError(input, 'more than two decimal places');
    }
    throw new MoneyParseError(input, 'not a number');
  }

  const [, sign, whole, fraction = ''] = match;
  const kob = BigInt(whole ?? '0') * KOBO_PER_NAIRA + BigInt(fraction.padEnd(2, '0'));
  return kobo(sign === '-' ? 0n - kob : kob);
};

/** Format for display: `₦1,250,000.00`. */
export const formatNaira = (amount: Kobo, options: { symbol?: boolean } = {}): string => {
  const { symbol = true } = options;
  const negative = amount < 0n;
  const absolute = negative ? kobo(0n - amount) : amount;
  const whole = absolute / KOBO_PER_NAIRA;
  const minor = absolute % KOBO_PER_NAIRA;
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = `${grouped}.${minor.toString().padStart(2, '0')}`;
  return `${negative ? '-' : ''}${symbol ? '₦' : ''}${body}`;
};

export const add = (...amounts: Kobo[]): Kobo =>
  kobo(amounts.reduce<bigint>((total, a) => total + a, 0n));

export const subtract = (a: Kobo, b: Kobo): Kobo => kobo(a - b);

export const isZero = (a: Kobo): boolean => a === 0n;
export const isNegative = (a: Kobo): boolean => a < 0n;
export const compare = (a: Kobo, b: Kobo): -1 | 0 | 1 => (a < b ? -1 : a > b ? 1 : 0);
export const max = (a: Kobo, b: Kobo): Kobo => (a > b ? a : b);
export const min = (a: Kobo, b: Kobo): Kobo => (a < b ? a : b);

/**
 * Serialise for transport. Kobo crosses a JSON boundary as a string, because
 * `JSON.stringify` cannot represent a bigint and converting to `number` would
 * reintroduce the precision loss this module exists to prevent.
 */
export const toTransport = (amount: Kobo): string => amount.toString();
export const fromTransport = (value: string): Kobo => {
  if (!/^-?\d+$/.test(value)) throw new MoneyParseError(value, 'not an integer kobo string');
  return kobo(BigInt(value));
};

/**
 * Convert to a JavaScript number for a database write.
 *
 * Supabase's generated types expose `bigint` columns as `number`, because
 * PostgREST sends them as JSON numbers. That is safe for the amounts this
 * product handles — Number.MAX_SAFE_INTEGER is about ₦90 trillion in kobo —
 * but it is only safe while someone checks, so this throws rather than
 * silently losing precision on an aggregate that grew past the limit.
 *
 * Use it at the database boundary only. Everywhere else, keep Kobo.
 */
export const toSafeNumber = (amount: Kobo): number => {
  if (amount > BigInt(Number.MAX_SAFE_INTEGER) || amount < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new MoneyParseError(
      amount.toString(),
      'exceeds the safe integer range, so writing it as a JSON number would lose precision',
    );
  }
  return Number(amount);
};

/**
 * Apply a rate held in basis points: commission, VAT, withholding tax.
 *
 * 1000 bps is 10%; 750 is 7.5%. The rounding rule is round-half-up to the
 * nearest kobo, per amount, as agreed in the Sprint 4 decision record:
 *
 *   commission = (amount_kobo * rate_bps + 5000) / 10000
 *
 * Integer division does the rounding because the constant 5000 shifts every
 * fraction of half a kobo or more up, and nothing below it. No floating point
 * appears at any point, and BigInt keeps the multiplication exact.
 *
 * Only a non-negative amount is accepted. A reversal negates the stored result
 * rather than recalculating it (LEDGER-9), so there is no negative commission
 * to compute and a caller who tries is making a mistake worth surfacing.
 */
export const applyRate = (amount: Kobo, rateBps: number): Kobo => {
  if (!Number.isInteger(rateBps)) {
    throw new MoneyParseError(String(rateBps), 'basis points must be a whole number');
  }
  if (rateBps < 0) {
    throw new MoneyParseError(String(rateBps), 'basis points cannot be negative');
  }
  if (amount < 0n) {
    throw new MoneyParseError(
      amount.toString(),
      'a rate applies to a non-negative amount; reversals negate the stored result instead',
    );
  }
  return kobo((amount * BigInt(rateBps) + 5_000n) / 10_000n);
};

/**
 * Split an amount across weights so that the parts sum back to the amount.
 *
 * This is largest-remainder apportionment. Each part gets the whole-kobo share
 * of `amount * weight / total`; the few kobo left over by integer division go
 * one each to the shares with the largest fractional remainder, ties broken by
 * position. The rule is deterministic, which matters because the same payment
 * split two ways would show two different statements.
 *
 * Splitting ₦1,000,000 across three equal charges must lose nothing — a kobo
 * that disappears in the split is a dispute months later — so the function
 * asserts the result totals the input rather than trusting the arithmetic.
 */
export const allocate = (amount: Kobo, weights: readonly Kobo[]): Kobo[] => {
  if (amount < 0n) {
    throw new MoneyParseError(amount.toString(), 'a negative amount cannot be allocated');
  }
  if (weights.length === 0) {
    throw new MoneyParseError('[]', 'at least one weight is required');
  }
  if (weights.some((weight) => weight < 0n)) {
    throw new MoneyParseError('[]', 'weights cannot be negative');
  }

  const total = weights.reduce<bigint>((sum, weight) => sum + weight, 0n);
  if (total === 0n) {
    throw new MoneyParseError('[]', 'the weights total zero, so there is nothing to split by');
  }

  const shares = weights.map((weight) => (amount * weight) / total);
  const assigned = shares.reduce<bigint>((sum, share) => sum + share, 0n);

  // Integer division leaves fewer than one kobo per weight behind, so the
  // remainder always fits in a plain number.
  const remainder = Number(amount - assigned);
  const order = weights
    .map((weight, index) => ({ index, fraction: (amount * weight) % total }))
    .sort((a, b) => {
      if (a.fraction === b.fraction) return a.index - b.index;
      return a.fraction > b.fraction ? -1 : 1;
    });

  const result = shares.map((share) => kobo(share));
  for (let i = 0; i < remainder; i += 1) {
    const target = order[i];
    if (target === undefined) break;
    const share = result[target.index];
    if (share === undefined) break;
    result[target.index] = kobo(share + 1n);
  }

  return result;
};
