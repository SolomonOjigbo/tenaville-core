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
  return Math.round((numerator / denominator) * 100);
};

/** A percentage with its sign, or an em dash when it cannot be computed. */
export const percentLabel = (numerator: number, denominator: number): string => {
  const value = percent(numerator, denominator);
  return value === null ? '—' : `${value}%`;
};

const DISPLAY_DATE = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const DISPLAY_DATE_TIME = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

/**
 * A contractual date for display: `2026-11-01` becomes `1 Nov 2026`.
 *
 * Parsed and formatted as UTC because these are date-only values (PRD §10.6):
 * an operator in Lagos and one in London must read the same day, and a
 * `Date` built from the local timezone shifts it for one of them. Inputs that
 * arrive malformed are returned unchanged rather than rendered as "Invalid
 * Date" — a wrong string is easier to trace than a plausible-looking one.
 */
export const formatDate = (isoDate: string): string => {
  const parsed = Date.parse(`${isoDate}T00:00:00Z`);
  return Number.isNaN(parsed) ? isoDate : DISPLAY_DATE.format(parsed);
};

/** A timestamp for a timeline: display in UTC, matching the date helper. */
export const formatDateTime = (isoTimestamp: string): string => {
  const parsed = Date.parse(isoTimestamp);
  return Number.isNaN(parsed) ? isoTimestamp : DISPLAY_DATE_TIME.format(parsed);
};

/** The first and last day of the month containing a date, as `YYYY-MM-DD`. */
export const monthBounds = (isoDate: string): { start: string; end: string } => {
  const [yearString, monthString] = isoDate.split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return { start: isoDate, end: isoDate };
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}`;
  return { start: `${prefix}-01`, end: `${prefix}-${lastDay.toString().padStart(2, '0')}` };
};
