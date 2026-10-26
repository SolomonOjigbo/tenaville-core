/**
 * Turning lease terms into charges (RENT-1).
 *
 * The periods come from the leases module, which owns the calendar
 * arithmetic. What is decided here is money: what each period is charged, and
 * what to do about a term that is not a whole number of periods.
 *
 * Pure, so the arithmetic can be tested without a database. The database
 * validates the *shape* of what this produces — coverage, contiguity,
 * numbering and amounts — and deliberately does not recompute the dates.
 */

import { type Kobo, add, kobo } from '@tenaville/money';
import {
  type CalendarDate,
  type PeriodicRentFrequency,
  generateRentPeriods,
} from '../../leases/application/index';

/**
 * How a final part period is charged.
 *
 * Only one value today. Pro-rating a part period needs a documented rounding
 * rule — half-up, banker's, always-down, and who absorbs the stray kobo — and
 * that rule is an open product decision, not something to guess inside a
 * schedule generator. Guessing it would mean reissuing receipts later.
 *
 * It is a required argument rather than a default so that the choice is
 * visible at the call site, and so that adding 'pro_rata' is additive.
 */
export type PartPeriodTreatment = 'charge_in_full';

export interface ChargeRow {
  readonly sequence: number;
  readonly periodStart: CalendarDate;
  readonly periodEnd: CalendarDate;
  readonly dueOn: CalendarDate;
  readonly amountKobo: Kobo;
  readonly coversPartialPeriod: boolean;
}

export class ChargeScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChargeScheduleError';
  }
}

export interface PeriodicChargeTerms {
  readonly startsOn: CalendarDate;
  readonly endsOn: CalendarDate;
  /** Everything but 'irregular': those schedules are supplied, not derived. */
  readonly frequency: PeriodicRentFrequency;
  /** The rent for one period of `frequency`, in kobo. */
  readonly rentKobo: Kobo;
  readonly dueDay?: number | undefined;
  readonly firstDueOn?: CalendarDate | undefined;
  readonly partPeriod: PartPeriodTreatment;
}

/**
 * The charges for a lease with a periodic rent.
 *
 * Every full period is charged the lease rent. A final part period is charged
 * in full and flagged, which is the conservative choice: an agency that means
 * to charge less can credit the difference, and a credit leaves a trail. The
 * reverse — under-charging and later asking for more — is the conversation no
 * agency wants with a tenant.
 */
export const buildPeriodicCharges = (terms: PeriodicChargeTerms): ChargeRow[] => {
  if (terms.rentKobo <= 0n) {
    throw new ChargeScheduleError('the rent must be more than nothing');
  }

  const periods = generateRentPeriods({
    startsOn: terms.startsOn,
    endsOn: terms.endsOn,
    frequency: terms.frequency,
    dueDay: terms.dueDay,
    firstDueOn: terms.firstDueOn,
  });

  return periods.map((period) => ({
    sequence: period.sequence,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    dueOn: period.dueOn,
    amountKobo: terms.rentKobo,
    coversPartialPeriod: period.isPartial,
  }));
};

export interface Instalment {
  readonly periodStart: CalendarDate;
  readonly periodEnd: CalendarDate;
  readonly dueOn: CalendarDate;
  readonly amountKobo: Kobo;
}

export interface IrregularChargeTerms {
  readonly startsOn: CalendarDate;
  readonly endsOn: CalendarDate;
  /** The total rent for the term. The instalments must add up to it. */
  readonly totalKobo: Kobo;
  readonly instalments: readonly Instalment[];
}

/**
 * The charges for a bespoke schedule.
 *
 * Staged payments for an expensive unit, or a single payment covering a whole
 * term: common enough in Nigeria that refusing to represent them would push an
 * agency back to a spreadsheet for its best tenancies.
 *
 * Nothing is derived. The instalments are checked against the term and the
 * total, because an irregular schedule has no pattern to fall back on and a
 * typo in one date is otherwise invisible until a tenant is chased for rent
 * they were never billed.
 */
export const buildIrregularCharges = (terms: IrregularChargeTerms): ChargeRow[] => {
  const instalments = [...terms.instalments].sort((a, b) =>
    a.periodStart < b.periodStart ? -1 : a.periodStart > b.periodStart ? 1 : 0,
  );

  if (instalments.length === 0) {
    throw new ChargeScheduleError('an irregular schedule needs at least one instalment');
  }

  const first = instalments[0];
  const last = instalments[instalments.length - 1];
  if (first === undefined || last === undefined) {
    throw new ChargeScheduleError('an irregular schedule needs at least one instalment');
  }

  if (first.periodStart !== terms.startsOn) {
    throw new ChargeScheduleError(
      `the first instalment starts on ${first.periodStart}, but the lease starts on ${terms.startsOn}`,
    );
  }
  if (last.periodEnd !== terms.endsOn) {
    throw new ChargeScheduleError(
      `the last instalment ends on ${last.periodEnd}, but the lease ends on ${terms.endsOn}`,
    );
  }

  const rows: ChargeRow[] = [];
  let previousEnd: CalendarDate | null = null;
  let running: Kobo = kobo(0n);

  for (const [index, instalment] of instalments.entries()) {
    if (instalment.periodEnd < instalment.periodStart) {
      throw new ChargeScheduleError(
        `instalment ${index + 1} ends on ${instalment.periodEnd}, before it starts`,
      );
    }
    if (instalment.dueOn < instalment.periodStart) {
      throw new ChargeScheduleError(
        `instalment ${index + 1} falls due on ${instalment.dueOn}, before the period it covers`,
      );
    }
    if (instalment.amountKobo <= 0n) {
      throw new ChargeScheduleError(`instalment ${index + 1} must be more than nothing`);
    }
    if (previousEnd !== null && instalment.periodStart <= previousEnd) {
      throw new ChargeScheduleError(
        `instalment ${index + 1} starts on ${instalment.periodStart}, inside the previous period`,
      );
    }

    rows.push({
      sequence: index + 1,
      periodStart: instalment.periodStart,
      periodEnd: instalment.periodEnd,
      dueOn: instalment.dueOn,
      amountKobo: instalment.amountKobo,
      // Every instalment of an irregular schedule is its own agreed amount, so
      // "part period" has nothing to mean here.
      coversPartialPeriod: false,
    });
    previousEnd = instalment.periodEnd;
    running = add(running, instalment.amountKobo);
  }

  if (running !== terms.totalKobo) {
    throw new ChargeScheduleError(
      `the instalments total ${running} kobo, but the lease rent is ${terms.totalKobo} kobo`,
    );
  }

  return rows;
};

/** What the lease is charged in total, which a UI shows before committing. */
export const scheduleTotal = (rows: readonly ChargeRow[]): Kobo =>
  add(...rows.map((row) => row.amountKobo));

/**
 * The wire form the database validator expects.
 *
 * snake_case and a string amount: kobo is a bigint, and JSON has no bigint.
 * Serialising it as a number would be safe up to ₦90 trillion and then
 * silently wrong, which is not a trade worth making in a money path.
 */
export interface ChargeRowPayload {
  /**
   * An index signature so the payload satisfies the generated `Json` type at
   * the RPC boundary. Declared here rather than cast at the call site: a cast
   * in a money path hides exactly the mistake it is covering for.
   */
  readonly [field: string]: string | number | boolean;
  readonly sequence: number;
  readonly period_start: string;
  readonly period_end: string;
  readonly due_on: string;
  readonly amount_kobo: string;
  readonly covers_partial_period: boolean;
}

export const toPayload = (rows: readonly ChargeRow[]): ChargeRowPayload[] =>
  rows.map((row) => ({
    sequence: row.sequence,
    period_start: row.periodStart,
    period_end: row.periodEnd,
    due_on: row.dueOn,
    amount_kobo: row.amountKobo.toString(),
    covers_partial_period: row.coversPartialPeriod,
  }));

/**
 * How often an agreed non-rent charge falls due (LEASE-2, TV-154).
 *
 * Mirrors the database's `charge_frequency`, which is deliberately not
 * `rent_frequency`: a lease has no "one-off rent", and putting the value there
 * would make that nonsense representable.
 */
export type ChargeFrequency = 'one_off' | PeriodicRentFrequency;

/** Service charge, utility, agreed fee — never rent, and never a deposit. */
export type NonRentChargeKind = 'service_charge' | 'utility' | 'agreed_fee';

export interface ChargeTermTerms {
  readonly kind: NonRentChargeKind;
  readonly description: string;
  /** One instalment, in kobo. For a one-off charge, the whole amount. */
  readonly amountKobo: Kobo;
  readonly frequency: ChargeFrequency;
  /** The term's own dates, which need not be the lease's. */
  readonly startsOn: CalendarDate;
  readonly endsOn: CalendarDate;
  readonly dueDay?: number | undefined;
  readonly partPeriod: PartPeriodTreatment;
}

/**
 * The instalments of an agreed charge.
 *
 * A one-off is one charge covering the term, due the day it starts. Anything
 * else is the same periodic machinery rent uses — which is the point of
 * TV-154: a service charge is a row in `charges` like any other, so
 * allocation, arrears ageing and statements handle it without knowing it is
 * not rent.
 */
export const buildTermCharges = (terms: ChargeTermTerms): ChargeRow[] => {
  if (terms.amountKobo <= 0n) {
    throw new ChargeScheduleError('an agreed charge must be more than nothing');
  }
  if (terms.endsOn < terms.startsOn) {
    throw new ChargeScheduleError('a charge term must end on or after it starts');
  }

  if (terms.frequency === 'one_off') {
    return [
      {
        sequence: 1,
        periodStart: terms.startsOn,
        periodEnd: terms.endsOn,
        dueOn: terms.startsOn,
        amountKobo: terms.amountKobo,
        coversPartialPeriod: false,
      },
    ];
  }

  return buildPeriodicCharges({
    startsOn: terms.startsOn,
    endsOn: terms.endsOn,
    frequency: terms.frequency,
    rentKobo: terms.amountKobo,
    dueDay: terms.dueDay,
    partPeriod: terms.partPeriod,
  });
};
