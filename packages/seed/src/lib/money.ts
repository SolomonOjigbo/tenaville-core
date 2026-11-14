import { fromNaira, toSafeNumber, toTransport, type Kobo } from '@tenaville/money';

/**
 * Round a naira figure to the nearest `step` (half up), so rents look like rents.
 * Integer arithmetic throughout: the figure is truncated to whole naira, then
 * rounded in bigint. Never below one step.
 */
export const roundNaira = (value: number, step = 5_000): number => {
  const stepBig = BigInt(step);
  const whole = BigInt(Number.parseInt(String(value), 10));
  const rounded = ((whole + stepBig / 2n) / stepBig) * stepBig;
  return rounded < stepBig ? step : Number(rounded);
};

export const kobo = (naira: number): Kobo => fromNaira(BigInt(roundNaira(naira, 1)));

/** RPC arguments are JSON numbers; every amount here is far below 2^53. */
export const koboNumber = (naira: number): number => toSafeNumber(kobo(naira));

/** The string form the application layer's zod schemas take. */
export const koboString = (naira: number): string => toTransport(kobo(naira));
