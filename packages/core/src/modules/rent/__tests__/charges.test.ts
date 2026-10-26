import { kobo } from '@tenaville/money';
import { describe, expect, it } from 'vitest';

import {
  ChargeScheduleError,
  buildIrregularCharges,
  buildPeriodicCharges,
  buildTermCharges,
  scheduleTotal,
  toPayload,
} from '../domain/charges';

const RENT = kobo(250_000_00n); // ₦250,000

describe('buildPeriodicCharges', () => {
  it('raises one charge for an annual rent, due the day the term starts', () => {
    const rows = buildPeriodicCharges({
      startsOn: '2026-04-01',
      endsOn: '2027-03-31',
      frequency: 'annual',
      rentKobo: RENT,
      partPeriod: 'charge_in_full',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      sequence: 1,
      periodStart: '2026-04-01',
      periodEnd: '2027-03-31',
      dueOn: '2026-04-01',
      amountKobo: RENT,
      coversPartialPeriod: false,
    });
  });

  it('charges every full period the lease rent, not a share of it', () => {
    // The commonest misreading of "quarterly rent of ₦250,000" is that the
    // year costs ₦250,000. rent_kobo is the amount per period, and the
    // database holds this function to it.
    const rows = buildPeriodicCharges({
      startsOn: '2026-01-01',
      endsOn: '2026-12-31',
      frequency: 'quarterly',
      rentKobo: RENT,
      partPeriod: 'charge_in_full',
    });

    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.amountKobo === RENT)).toBe(true);
    expect(scheduleTotal(rows)).toBe(kobo(1_000_000_00n));
  });

  it('covers the term with no gap and no overlap', () => {
    const rows = buildPeriodicCharges({
      startsOn: '2026-01-15',
      endsOn: '2026-07-14',
      frequency: 'monthly',
      rentKobo: RENT,
      partPeriod: 'charge_in_full',
    });

    expect(rows).toHaveLength(6);
    expect(rows[0]?.periodStart).toBe('2026-01-15');
    expect(rows.at(-1)?.periodEnd).toBe('2026-07-14');
    for (const [index, row] of rows.entries()) {
      expect(row.sequence).toBe(index + 1);
      if (index === 0) continue;
      const previousEnd = new Date(`${rows[index - 1]?.periodEnd ?? ''}T00:00:00Z`);
      const start = new Date(`${row.periodStart}T00:00:00Z`);
      expect(start.getTime() - previousEnd.getTime()).toBe(86_400_000);
    }
  });

  it('charges a part period in full and flags it', () => {
    // 14 months of monthly rent is 14 periods; 14 months of quarterly rent is
    // four full quarters and a two-month tail. The tail is charged in full
    // because pro-rating needs a rounding rule nobody has decided yet, and an
    // agency that means to charge less can credit the difference.
    const rows = buildPeriodicCharges({
      startsOn: '2026-01-01',
      endsOn: '2027-02-28',
      frequency: 'quarterly',
      rentKobo: RENT,
      partPeriod: 'charge_in_full',
    });

    expect(rows).toHaveLength(5);
    expect(rows.slice(0, 4).every((row) => !row.coversPartialPeriod)).toBe(true);
    expect(rows[4]?.coversPartialPeriod).toBe(true);
    expect(rows[4]?.periodEnd).toBe('2027-02-28');
    expect(rows[4]?.amountKobo).toBe(RENT);
  });

  it('puts a due day inside the period it covers', () => {
    // Rent due on the 5th, for a lease starting on the 20th: the first charge
    // is due 5 February, the 5th that falls inside the period — not 5 January,
    // which is before the tenancy began.
    const rows = buildPeriodicCharges({
      startsOn: '2026-01-20',
      endsOn: '2026-04-19',
      frequency: 'monthly',
      rentKobo: RENT,
      dueDay: 5,
      partPeriod: 'charge_in_full',
    });

    expect(rows.map((row) => row.dueOn)).toEqual(['2026-02-05', '2026-03-05', '2026-04-05']);
    for (const row of rows) expect(row.dueOn >= row.periodStart).toBe(true);
  });

  it('does not let month-end clamping walk the rent day forward', () => {
    const rows = buildPeriodicCharges({
      startsOn: '2026-01-31',
      endsOn: '2026-05-30',
      frequency: 'monthly',
      rentKobo: RENT,
      partPeriod: 'charge_in_full',
    });

    // 31 Jan, 28 Feb, 31 Mar, 30 Apr — not 28 March and 28 April, which is
    // what computing each period from the previous one would give.
    expect(rows.map((row) => row.periodStart)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
    expect(rows.every((row) => !row.coversPartialPeriod)).toBe(true);
  });

  it('bills a one-day tail at the full rent, which is the sharp edge of the rule', () => {
    // A lease from 31 January to 30 April is three months and a day short of a
    // fourth. The fourth period exists, covers one day, and is charged in
    // full — ₦250,000 for a day. That is what 'charge_in_full' means, and it
    // is pinned here rather than discovered by an agency.
    //
    // The flag is the mitigation: a caller showing the schedule before
    // committing sees a one-day period, and can fix the end date or agree an
    // irregular schedule instead. Pro-rating it properly needs the rounding
    // rule in open decision 20.
    const rows = buildPeriodicCharges({
      startsOn: '2026-01-31',
      endsOn: '2026-04-30',
      frequency: 'monthly',
      rentKobo: RENT,
      partPeriod: 'charge_in_full',
    });

    expect(rows).toHaveLength(4);
    const tail = rows[3];
    expect(tail?.periodStart).toBe('2026-04-30');
    expect(tail?.periodEnd).toBe('2026-04-30');
    expect(tail?.coversPartialPeriod).toBe(true);
    expect(tail?.amountKobo).toBe(RENT);
  });

  it('refuses a rent of nothing', () => {
    expect(() =>
      buildPeriodicCharges({
        startsOn: '2026-01-01',
        endsOn: '2026-12-31',
        frequency: 'annual',
        rentKobo: kobo(0n),
        partPeriod: 'charge_in_full',
      }),
    ).toThrow(ChargeScheduleError);
  });
});

describe('buildIrregularCharges', () => {
  const terms = {
    startsOn: '2026-01-01',
    endsOn: '2026-12-31',
    totalKobo: kobo(3_000_000_00n),
  };

  it('takes staged instalments as agreed and numbers them in date order', () => {
    const rows = buildIrregularCharges({
      ...terms,
      instalments: [
        {
          periodStart: '2026-07-01',
          periodEnd: '2026-12-31',
          dueOn: '2026-07-01',
          amountKobo: kobo(1_000_000_00n),
        },
        {
          periodStart: '2026-01-01',
          periodEnd: '2026-06-30',
          dueOn: '2026-01-01',
          amountKobo: kobo(2_000_000_00n),
        },
      ],
    });

    expect(rows.map((row) => [row.sequence, row.periodStart, row.amountKobo])).toEqual([
      [1, '2026-01-01', kobo(2_000_000_00n)],
      [2, '2026-07-01', kobo(1_000_000_00n)],
    ]);
    expect(scheduleTotal(rows)).toBe(terms.totalKobo);
  });

  it('accepts a single payment covering the whole term', () => {
    const rows = buildIrregularCharges({
      ...terms,
      instalments: [
        {
          periodStart: '2026-01-01',
          periodEnd: '2026-12-31',
          dueOn: '2026-01-01',
          amountKobo: terms.totalKobo,
        },
      ],
    });

    expect(rows).toHaveLength(1);
  });

  it('refuses instalments that do not add up to the rent', () => {
    // The whole point of the total: an irregular schedule has no pattern, so a
    // mistyped instalment is invisible unless it is checked against something.
    expect(() =>
      buildIrregularCharges({
        ...terms,
        instalments: [
          {
            periodStart: '2026-01-01',
            periodEnd: '2026-12-31',
            dueOn: '2026-01-01',
            amountKobo: kobo(2_900_000_00n),
          },
        ],
      }),
    ).toThrow(/total 290000000 kobo, but the lease rent is 300000000/);
  });

  it('refuses a schedule that does not cover the term', () => {
    expect(() =>
      buildIrregularCharges({
        ...terms,
        instalments: [
          {
            periodStart: '2026-02-01',
            periodEnd: '2026-12-31',
            dueOn: '2026-02-01',
            amountKobo: terms.totalKobo,
          },
        ],
      }),
    ).toThrow(/starts on 2026-02-01, but the lease starts on 2026-01-01/);

    expect(() =>
      buildIrregularCharges({
        ...terms,
        instalments: [
          {
            periodStart: '2026-01-01',
            periodEnd: '2026-11-30',
            dueOn: '2026-01-01',
            amountKobo: terms.totalKobo,
          },
        ],
      }),
    ).toThrow(/ends on 2026-11-30, but the lease ends on 2026-12-31/);
  });

  it('refuses overlapping instalments', () => {
    expect(() =>
      buildIrregularCharges({
        ...terms,
        instalments: [
          {
            periodStart: '2026-01-01',
            periodEnd: '2026-07-31',
            dueOn: '2026-01-01',
            amountKobo: kobo(1_500_000_00n),
          },
          {
            periodStart: '2026-07-01',
            periodEnd: '2026-12-31',
            dueOn: '2026-07-01',
            amountKobo: kobo(1_500_000_00n),
          },
        ],
      }),
    ).toThrow(/inside the previous period/);
  });

  it('refuses an instalment due before the period it covers', () => {
    expect(() =>
      buildIrregularCharges({
        ...terms,
        instalments: [
          {
            periodStart: '2026-01-01',
            periodEnd: '2026-12-31',
            dueOn: '2025-12-01',
            amountKobo: terms.totalKobo,
          },
        ],
      }),
    ).toThrow(/before the period it covers/);
  });

  it('refuses an empty schedule', () => {
    expect(() => buildIrregularCharges({ ...terms, instalments: [] })).toThrow(
      /at least one instalment/,
    );
  });
});

describe('toPayload', () => {
  it('sends kobo as a string, because JSON has no bigint', () => {
    const rows = buildPeriodicCharges({
      startsOn: '2026-01-01',
      endsOn: '2026-12-31',
      frequency: 'annual',
      rentKobo: kobo(9_007_199_254_740_993n), // past Number.MAX_SAFE_INTEGER
      partPeriod: 'charge_in_full',
    });

    expect(toPayload(rows)[0]).toEqual({
      sequence: 1,
      period_start: '2026-01-01',
      period_end: '2026-12-31',
      due_on: '2026-01-01',
      amount_kobo: '9007199254740993',
      covers_partial_period: false,
    });
  });
});

describe('buildTermCharges', () => {
  const base = {
    kind: 'service_charge' as const,
    description: 'Estate service charge',
    startsOn: '2026-01-01',
    endsOn: '2026-12-31',
    partPeriod: 'charge_in_full' as const,
  };

  it('raises one charge for a one-off fee, due the day the term starts', () => {
    const rows = buildTermCharges({
      ...base,
      kind: 'agreed_fee',
      description: 'Legal fee',
      amountKobo: kobo(50_000_00n),
      frequency: 'one_off',
    });

    expect(rows).toEqual([
      {
        sequence: 1,
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31',
        dueOn: '2026-01-01',
        amountKobo: kobo(50_000_00n),
        coversPartialPeriod: false,
      },
    ]);
  });

  it('spreads a quarterly service charge across the term', () => {
    const rows = buildTermCharges({
      ...base,
      amountKobo: kobo(30_000_00n),
      frequency: 'quarterly',
    });

    expect(rows).toHaveLength(4);
    expect(scheduleTotal(rows)).toBe(kobo(120_000_00n));
    expect(rows.map((row) => row.periodStart)).toEqual([
      '2026-01-01',
      '2026-04-01',
      '2026-07-01',
      '2026-10-01',
    ]);
  });

  it('starts where the agreement does, not where the tenancy does', () => {
    // A service charge agreed halfway through a tenancy starts halfway
    // through it. The database checks the term sits inside the lease; the
    // schedule just follows the term.
    const rows = buildTermCharges({
      ...base,
      startsOn: '2026-07-01',
      amountKobo: kobo(10_000_00n),
      frequency: 'monthly',
    });

    expect(rows[0]?.periodStart).toBe('2026-07-01');
    expect(rows).toHaveLength(6);
  });

  it('refuses a charge of nothing, or one that ends before it starts', () => {
    expect(() => buildTermCharges({ ...base, amountKobo: kobo(0n), frequency: 'one_off' })).toThrow(
      ChargeScheduleError,
    );
    expect(() =>
      buildTermCharges({
        ...base,
        startsOn: '2026-12-31',
        endsOn: '2026-01-01',
        amountKobo: kobo(100n),
        frequency: 'one_off',
      }),
    ).toThrow(/end on or after it starts/);
  });
});
