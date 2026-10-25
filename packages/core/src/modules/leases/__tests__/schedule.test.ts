import { describe, expect, it } from 'vitest';

import {
  ScheduleError,
  addDays,
  addMonths,
  daysBetween,
  daysInMonth,
  expiryAlertThreshold,
  formatDate,
  generateRentPeriods,
  parseDate,
} from '../domain/schedule.js';

describe('calendar arithmetic', () => {
  it('clamps a month addition to the shorter month', () => {
    // 31 January plus one month is the end of February, not 3 March. This is
    // what a tenancy agreement means by "monthly".
    expect(formatDate(addMonths(parseDate('2026-01-31'), 1))).toBe('2026-02-28');
    expect(formatDate(addMonths(parseDate('2028-01-31'), 1))).toBe('2028-02-29');
    expect(formatDate(addMonths(parseDate('2026-03-31'), 1))).toBe('2026-04-30');
  });

  it('rolls over years correctly', () => {
    expect(formatDate(addMonths(parseDate('2026-12-01'), 1))).toBe('2027-01-01');
    expect(formatDate(addMonths(parseDate('2026-01-01'), 12))).toBe('2027-01-01');
    expect(formatDate(addMonths(parseDate('2026-06-15'), -7))).toBe('2025-11-15');
  });

  it('knows month lengths including leap years', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    // 2100 is not a leap year; 2000 was.
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
  });

  it('adds days across month and year boundaries', () => {
    expect(formatDate(addDays(parseDate('2026-02-28'), 1))).toBe('2026-03-01');
    expect(formatDate(addDays(parseDate('2028-02-28'), 1))).toBe('2028-02-29');
    expect(formatDate(addDays(parseDate('2026-12-31'), 1))).toBe('2027-01-01');
    expect(formatDate(addDays(parseDate('2026-01-01'), -1))).toBe('2025-12-31');
  });

  it('rejects dates that are not real', () => {
    for (const bad of ['2026-02-30', '2026-13-01', '2026-00-10', '26-01-01', '2026-1-1', '']) {
      expect(() => parseDate(bad), `"${bad}" should be rejected`).toThrow(ScheduleError);
    }
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
    expect(daysBetween('2026-01-31', '2026-01-01')).toBe(-30);
    // A leap year is 366 days.
    expect(daysBetween('2028-01-01', '2029-01-01')).toBe(366);
  });
});

describe('generateRentPeriods', () => {
  it('produces one period for a one-year annual lease', () => {
    const periods = generateRentPeriods({
      startsOn: '2026-01-01',
      endsOn: '2026-12-31',
      frequency: 'annual',
    });
    expect(periods).toEqual([
      {
        sequence: 1,
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31',
        dueOn: '2026-01-01',
        isPartial: false,
      },
    ]);
  });

  it('produces two periods for a two-year annual lease', () => {
    const periods = generateRentPeriods({
      startsOn: '2026-01-01',
      endsOn: '2027-12-31',
      frequency: 'annual',
    });
    expect(periods).toHaveLength(2);
    expect(periods[1]).toMatchObject({
      periodStart: '2027-01-01',
      periodEnd: '2027-12-31',
      dueOn: '2027-01-01',
      isPartial: false,
    });
  });

  it('produces twelve monthly periods for a one-year lease', () => {
    const periods = generateRentPeriods({
      startsOn: '2026-01-01',
      endsOn: '2026-12-31',
      frequency: 'monthly',
    });
    expect(periods).toHaveLength(12);
    expect(periods[0]).toMatchObject({ periodStart: '2026-01-01', periodEnd: '2026-01-31' });
    expect(periods[1]).toMatchObject({ periodStart: '2026-02-01', periodEnd: '2026-02-28' });
    expect(periods[11]).toMatchObject({ periodStart: '2026-12-01', periodEnd: '2026-12-31' });
    expect(periods.every((p) => !p.isPartial)).toBe(true);
  });

  it('produces four quarterly periods and six half-yearly over three years', () => {
    expect(
      generateRentPeriods({ startsOn: '2026-01-01', endsOn: '2026-12-31', frequency: 'quarterly' }),
    ).toHaveLength(4);
    expect(
      generateRentPeriods({
        startsOn: '2026-01-01',
        endsOn: '2028-12-31',
        frequency: 'half_yearly',
      }),
    ).toHaveLength(6);
  });

  it('flags a final period shorter than a full interval', () => {
    // An 18-month lease on annual rent: the second year is only half there.
    const periods = generateRentPeriods({
      startsOn: '2026-01-01',
      endsOn: '2027-06-30',
      frequency: 'annual',
    });
    expect(periods).toHaveLength(2);
    expect(periods[0]!.isPartial).toBe(false);
    expect(periods[1]).toMatchObject({
      periodStart: '2027-01-01',
      periodEnd: '2027-06-30',
      isPartial: true,
    });
  });

  it('does not decide what a partial period costs', () => {
    // Flagging rather than pro-rating is deliberate: whether a part period is
    // pro-rated or charged in full is the agency's commercial decision.
    const periods = generateRentPeriods({
      startsOn: '2026-01-01',
      endsOn: '2026-02-14',
      frequency: 'monthly',
    });
    expect(periods).toHaveLength(2);
    expect(periods[1]).toMatchObject({ periodEnd: '2026-02-14', isPartial: true });
    expect(periods[1]).not.toHaveProperty('amountKobo');
  });

  it('applies a due day within each period', () => {
    const periods = generateRentPeriods({
      startsOn: '2026-01-10',
      endsOn: '2026-04-09',
      frequency: 'monthly',
      dueDay: 15,
    });
    expect(periods.map((p) => p.dueOn)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15']);
  });

  it('takes the due day that falls inside the period, not the one before it', () => {
    // A lease starting on the 20th with rent due on the 5th: the period
    // 20 Jan - 19 Feb is due on 5 February, which is inside it. Using the 5th
    // of the opening month would produce a due date before the period began.
    const periods = generateRentPeriods({
      startsOn: '2026-01-20',
      endsOn: '2026-03-19',
      frequency: 'monthly',
      dueDay: 5,
    });
    expect(periods.map((p) => `${p.periodStart}..${p.periodEnd} due ${p.dueOn}`)).toEqual([
      '2026-01-20..2026-02-19 due 2026-02-05',
      '2026-02-20..2026-03-19 due 2026-03-05',
    ]);
  });

  it('keeps every due date inside its own period', () => {
    // The property that matters: a due date outside its period would bill a
    // tenant for time they had not yet occupied, or after they had left.
    for (const dueDay of [1, 5, 15, 28]) {
      const periods = generateRentPeriods({
        startsOn: '2026-01-20',
        endsOn: '2027-01-19',
        frequency: 'monthly',
        dueDay,
      });
      for (const p of periods) {
        expect(
          p.dueOn >= p.periodStart && p.dueOn <= p.periodEnd,
          `due ${p.dueOn} outside ${p.periodStart}..${p.periodEnd} for day ${dueDay}`,
        ).toBe(true);
      }
    }
  });

  it('honours an explicit first due date for rent paid up front', () => {
    const periods = generateRentPeriods({
      startsOn: '2026-03-01',
      endsOn: '2027-02-28',
      frequency: 'annual',
      firstDueOn: '2026-03-01',
    });
    expect(periods[0]!.dueOn).toBe('2026-03-01');
  });

  it('does not let month-end clamping drift the rent day', () => {
    // 31 January, then 28 February, then back to 31 March. Computing each
    // period from the previous one would clamp to the 28th and keep it there,
    // quietly moving the rent day for the rest of the tenancy.
    const periods = generateRentPeriods({
      startsOn: '2026-01-31',
      endsOn: '2026-04-29',
      frequency: 'monthly',
    });
    expect(periods.map((p) => p.periodStart)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    // 31 March to 29 April is a whole period, not a partial one: the next
    // anniversary is 30 April, so the day before it is 29 April.
    expect(periods.at(-1)).toMatchObject({ periodEnd: '2026-04-29', isPartial: false });
  });

  it('keeps an annual rent day stable across a leap year', () => {
    const periods = generateRentPeriods({
      startsOn: '2027-02-28',
      endsOn: '2029-02-27',
      frequency: 'annual',
    });
    expect(periods.map((p) => p.periodStart)).toEqual(['2027-02-28', '2028-02-28']);
  });

  it('rejects impossible terms', () => {
    expect(() =>
      generateRentPeriods({ startsOn: '2026-12-31', endsOn: '2026-01-01', frequency: 'annual' }),
    ).toThrow(/must end after it starts/);
    expect(() =>
      generateRentPeriods({
        startsOn: '2026-01-01',
        endsOn: '2026-12-31',
        frequency: 'monthly',
        dueDay: 31,
      }),
    ).toThrow(/between 1 and 28/);
    expect(() =>
      generateRentPeriods({
        startsOn: '2026-01-01',
        endsOn: '2026-12-31',
        frequency: 'annual',
        firstDueOn: '2027-06-01',
      }),
    ).toThrow(/cannot fall after the lease ends/);
  });

  it('covers the whole term with no gaps or overlaps', () => {
    // The property that matters: every day of the tenancy belongs to exactly
    // one period, or a tenant is billed twice or not at all.
    const periods = generateRentPeriods({
      startsOn: '2026-01-15',
      endsOn: '2029-01-14',
      frequency: 'quarterly',
    });
    expect(periods[0]!.periodStart).toBe('2026-01-15');
    expect(periods.at(-1)!.periodEnd).toBe('2029-01-14');
    for (let i = 1; i < periods.length; i += 1) {
      expect(daysBetween(periods[i - 1]!.periodEnd, periods[i]!.periodStart)).toBe(1);
    }
  });
});

describe('expiryAlertThreshold', () => {
  it('reports the largest threshold crossed, so one notice goes per threshold', () => {
    expect(expiryAlertThreshold('2026-04-01', '2026-01-01', [90, 60, 30])).toBe(90);
    expect(expiryAlertThreshold('2026-02-15', '2026-01-01', [90, 60, 30])).toBe(90);
    expect(expiryAlertThreshold('2026-01-20', '2026-01-01', [90, 60, 30])).toBe(90);
  });

  it('reports nothing outside every window', () => {
    expect(expiryAlertThreshold('2027-01-01', '2026-01-01', [90, 60, 30])).toBeNull();
  });

  it('still reports for a lease already past its end', () => {
    // An expired lease with no recorded next step is exactly what AN-5 counts.
    expect(expiryAlertThreshold('2025-12-01', '2026-01-01', [90, 60, 30])).toBe(90);
  });

  it('uses the organisation configuration rather than a fixed 90/60/30', () => {
    expect(expiryAlertThreshold('2026-03-01', '2026-01-01', [30])).toBeNull();
    expect(expiryAlertThreshold('2026-03-01', '2026-01-01', [180])).toBe(180);
  });
});
