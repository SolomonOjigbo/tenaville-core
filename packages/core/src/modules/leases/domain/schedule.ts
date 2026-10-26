/**
 * Rent schedule generation from lease terms (LEASE-2, and the input to RENT-1).
 *
 * Pure: given the terms, produce the periods and their due dates. Step 4
 * persists these as charges; generating them is one act and lives in one place
 * so that the schedule a tenant sees, the charges they are billed and the
 * arrears they are chased for cannot disagree.
 *
 * Dates are handled as calendar dates throughout — `YYYY-MM-DD` strings and
 * UTC arithmetic, never a local `Date`. PRD §10.6 is explicit that contractual
 * due dates are calendar dates: rent due on 1 April is due on 1 April in Lagos
 * and in London, and a lease that rolls over at midnight local time would
 * generate the wrong due date for anyone reading it elsewhere.
 */

/**
 * A rent that falls due on a repeating interval, which is the only kind this
 * file can compute. 'irregular' is a lease term too (see RentFrequency), but a
 * bespoke schedule has no interval to count: its instalments are agreed, not
 * derived, so they are supplied rather than generated.
 */
export type PeriodicRentFrequency = 'annual' | 'half_yearly' | 'quarterly' | 'monthly';

/** Every value the database's rent_frequency enum holds. */
export type RentFrequency = PeriodicRentFrequency | 'irregular';

/** A calendar date as `YYYY-MM-DD`. */
export type CalendarDate = string;

export interface RentPeriod {
  /** 1-based, in date order. */
  readonly sequence: number;
  readonly periodStart: CalendarDate;
  readonly periodEnd: CalendarDate;
  readonly dueOn: CalendarDate;
  /**
   * True when the period is shorter than a full interval — a lease whose term
   * is not a whole number of periods ends with one. The rent for it is a
   * product decision (pro-rate or charge in full), so it is flagged rather
   * than silently assumed here.
   */
  readonly isPartial: boolean;
}

export class ScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScheduleError';
  }
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

interface Ymd {
  readonly y: number;
  readonly m: number;
  readonly d: number;
}

export const parseDate = (value: CalendarDate): Ymd => {
  const match = DATE_PATTERN.exec(value);
  if (match === null) throw new ScheduleError(`"${value}" is not a YYYY-MM-DD date`);
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12) throw new ScheduleError(`"${value}" has an invalid month`);
  if (d < 1 || d > daysInMonth(y, m)) throw new ScheduleError(`"${value}" is not a real date`);
  return { y, m, d };
};

export const formatDate = ({ y, m, d }: Ymd): CalendarDate =>
  `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

export const daysInMonth = (year: number, month: number): number =>
  // Day 0 of the next month is the last day of this one. UTC so the result
  // does not depend on where the code runs.
  new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Add whole months, clamping the day to the target month's length. */
export const addMonths = (date: Ymd, months: number): Ymd => {
  const total = date.y * 12 + (date.m - 1) + months;
  // Integer floor division written out, because Math.floor rounds toward
  // negative infinity for negative operands in a way that is easy to misread:
  // addMonths(date, -7) has to land in the previous year, and this makes that
  // visible rather than implied.
  const monthIndex = ((total % 12) + 12) % 12;
  const y = (total - monthIndex) / 12;
  const m = monthIndex + 1;
  // 31 January plus one month is 28 or 29 February, not 3 March. Clamping is
  // what a tenancy agreement means by "monthly".
  const d = Math.min(date.d, daysInMonth(y, m));
  return { y, m, d };
};

export const addDays = (date: Ymd, days: number): Ymd => {
  const ms = Date.UTC(date.y, date.m - 1, date.d) + days * 86_400_000;
  const utc = new Date(ms);
  return { y: utc.getUTCFullYear(), m: utc.getUTCMonth() + 1, d: utc.getUTCDate() };
};

export const compareDates = (a: CalendarDate, b: CalendarDate): -1 | 0 | 1 =>
  a < b ? -1 : a > b ? 1 : 0;

/**
 * The first date on or after `from` whose day of month is `day`.
 *
 * "Rent due on the 5th" for a period running 20 February to 19 March means
 * 5 March — the 5th that falls inside the period — not 5 February, which is
 * before the period began. Taking the day in the period's opening month would
 * produce a due date in the past for any lease that does not start on the 1st.
 */
const firstDayOfMonthOnOrAfter = (from: Ymd, day: number): Ymd => {
  const thisMonth = { y: from.y, m: from.m, d: Math.min(day, daysInMonth(from.y, from.m)) };
  if (compareDates(formatDate(thisMonth), formatDate(from)) >= 0) return thisMonth;
  const next = addMonths({ y: from.y, m: from.m, d: 1 }, 1);
  return { y: next.y, m: next.m, d: Math.min(day, daysInMonth(next.y, next.m)) };
};

const MONTHS_PER_PERIOD: Record<PeriodicRentFrequency, number> = {
  annual: 12,
  half_yearly: 6,
  quarterly: 3,
  monthly: 1,
};

export interface ScheduleTerms {
  readonly startsOn: CalendarDate;
  /** Inclusive: a lease to 2026-12-31 covers that day. */
  readonly endsOn: CalendarDate;
  readonly frequency: PeriodicRentFrequency;
  /**
   * Day of month rent falls due, for periodic rents. Capped at 28 by the
   * database so that every month has the day — a "due on the 31st" term would
   * silently become the 28th in February and read as a different agreement.
   */
  readonly dueDay?: number | undefined;
  /** Overrides the first due date, for a lease with rent paid up front. */
  readonly firstDueOn?: CalendarDate | undefined;
}

/**
 * Generate the rent periods for a lease.
 *
 * Periods run from the start date in whole intervals. The last one is truncated
 * at the lease end and flagged `isPartial`, because whether a part period is
 * pro-rated or charged in full is an agency's commercial decision and not
 * something to bury in a scheduling function.
 */
export const generateRentPeriods = (terms: ScheduleTerms): RentPeriod[] => {
  const start = parseDate(terms.startsOn);
  const end = parseDate(terms.endsOn);

  if (compareDates(terms.startsOn, terms.endsOn) >= 0) {
    throw new ScheduleError('a lease must end after it starts');
  }
  if (terms.dueDay !== undefined && (terms.dueDay < 1 || terms.dueDay > 28)) {
    throw new ScheduleError('the rent due day must be between 1 and 28');
  }
  if (terms.firstDueOn !== undefined) {
    parseDate(terms.firstDueOn);
    if (compareDates(terms.firstDueOn, terms.endsOn) > 0) {
      throw new ScheduleError('the first due date cannot fall after the lease ends');
    }
  }

  const step = MONTHS_PER_PERIOD[terms.frequency];
  const periods: RentPeriod[] = [];
  let sequence = 1;

  // A guard against a terms combination producing an unbounded loop: 50 years
  // of monthly rent is 600 periods, so this cannot be hit by a real lease.
  const MAX_PERIODS = 1_000;

  for (;;) {
    if (sequence > MAX_PERIODS) {
      throw new ScheduleError('the terms produce more periods than a lease can plausibly have');
    }

    // Each period start is computed from the *original* start date rather than
    // from the previous period, so month-end clamping does not accumulate. A
    // tenancy beginning on 31 January runs 31 Jan, 28 Feb, 31 Mar — not
    // 31 Jan, 28 Feb, 28 Mar, which would quietly move the rent day forever.
    const cursor = addMonths(start, step * (sequence - 1));
    if (compareDates(formatDate(cursor), terms.endsOn) > 0) break;

    const nextStart = addMonths(start, step * sequence);
    const naturalEnd = addDays(nextStart, -1);
    const isPartial = compareDates(formatDate(naturalEnd), terms.endsOn) > 0;
    const periodEnd = isPartial ? end : naturalEnd;

    const dueOn =
      sequence === 1 && terms.firstDueOn !== undefined
        ? parseDate(terms.firstDueOn)
        : terms.dueDay === undefined
          ? cursor
          : firstDayOfMonthOnOrAfter(cursor, terms.dueDay);

    periods.push({
      sequence,
      periodStart: formatDate(cursor),
      periodEnd: formatDate(periodEnd),
      dueOn: formatDate(dueOn),
      isPartial,
    });

    sequence += 1;
  }

  return periods;
};

/**
 * Which alert threshold a lease has crossed, if any (LEASE-6).
 *
 * Mirrors the `lease_overview` view so the same answer is available without a
 * round trip. The thresholds come from the organisation's configuration, not
 * from a constant — the PRD's 90/60/30 is a default, not a rule.
 */
export const expiryAlertThreshold = (
  endsOn: CalendarDate,
  today: CalendarDate,
  thresholdDays: readonly number[],
): number | null => {
  const days = daysBetween(today, endsOn);
  const crossed = thresholdDays.filter((d) => days <= d);
  return crossed.length === 0 ? null : Math.max(...crossed);
};

export const daysBetween = (from: CalendarDate, to: CalendarDate): number => {
  const a = parseDate(from);
  const b = parseDate(to);
  // Both endpoints are UTC midnights, so the difference is an exact multiple
  // of a day. No rounding is needed — and none belongs here, because UTC has
  // no daylight-saving discontinuity to absorb.
  return (Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000;
};
