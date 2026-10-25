/**
 * Display formatting for derived figures.
 *
 * Money is not here — it goes through @tenaville/money, which owns the one
 * rounding rule that matters (ADR 0003). This file exists for the same reason
 * at a smaller scale: percentages are rounded for display in several places,
 * and centralising it means the rounding happens once, consistently, and the
 * money-rounding lint rule has exactly one place to be told that this is not
 * money.
 */

/**
 * A derived percentage for display, or null when there is nothing to divide by.
 *
 * Returns null rather than 0 for an empty denominator: "0% occupancy" and "no
 * lettable units" are different statements, and showing the first for the
 * second misleads (AN-3 makes the occupancy denominator configurable precisely
 * because what it excludes matters).
 */
export const percent = (numerator: number, denominator: number): number | null => {
  if (denominator <= 0) return null;

  /*
   * Not a monetary value. The money-rounding rule directs rounding into
   * @tenaville/money; this is a display percentage derived from two counts, and
   * this is the only place in the codebase that rounds one. The directive below
   * is on its own line because Prettier reflows prose comments, and a wrapped
   * one puts the directive on the wrong line.
   */
  // eslint-disable-next-line no-restricted-syntax
  return Math.round((numerator / denominator) * 100);
};

/** A percentage with its sign, or an em dash when it cannot be computed. */
export const percentLabel = (numerator: number, denominator: number): string => {
  const value = percent(numerator, denominator);
  return value === null ? '—' : `${value}%`;
};
