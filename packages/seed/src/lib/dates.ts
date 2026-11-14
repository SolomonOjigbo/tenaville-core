/**
 * Calendar-date arithmetic on ISO `YYYY-MM-DD` strings. Contractual dates are
 * calendar dates, never timestamps (CLAUDE.md invariant 9), so nothing here
 * touches a time zone beyond choosing what "today" means.
 */

export const lagosToday = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date());

const toDate = (iso: string): Date => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date): string => date.toISOString().slice(0, 10);

export const addDays = (iso: string, days: number): string => {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
};

/** Adds months, clamping to the month's last day (31 Jan + 1 month = 28/29 Feb). */
export const addMonths = (iso: string, months: number): string => {
  const date = toDate(iso);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return toIso(date);
};

/** The last day of a term that starts on `start` and runs `months` months. */
export const termEnd = (start: string, months: number): string =>
  addDays(addMonths(start, months), -1);

export const daysBetween = (from: string, to: string): number =>
  Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);

export const monthStart = (iso: string): string => `${iso.slice(0, 7)}-01`;

export const monthEnd = (iso: string): string => addDays(addMonths(monthStart(iso), 1), -1);

export const minDate = (a: string, b: string): string => (a < b ? a : b);
export const maxDate = (a: string, b: string): string => (a > b ? a : b);
