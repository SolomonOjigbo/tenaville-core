import { describe, expect, it } from 'vitest';

import {
  arrearsCsv,
  bucketForDays,
  buildArrears,
  buildCollections,
  buildLeaseExpiry,
  buildMaintenanceQueue,
  buildOccupancy,
  buildRentRoll,
  collectionsCsv,
  leaseExpiryCsv,
  maintenanceQueueCsv,
  koboToDecimal,
  monthsBack,
  occupancyCsv,
  rentRollCsv,
  summariseArrears,
  toCsv,
  totalRent,
  type ArrearsChargeSource,
  type RentRollSource,
} from '../lib/reports';

const leaseParty = (name: string) => ({ role: 'tenant', tenants: { display_name: name } });

const lease = (overrides: Partial<RentRollSource> = {}): RentRollSource => ({
  id: 'lease-1',
  reference: 'YB/2026/01',
  starts_on: '2026-01-01',
  ends_on: '2026-12-31',
  rent_kobo: 30_000_000,
  rent_frequency: 'quarterly',
  units: { label: 'Flat 1', properties: { name: 'Adeyemi Court' } },
  lease_parties: [leaseParty('Tunde Ade')],
  ...overrides,
});

const charge = (overrides: Partial<ArrearsChargeSource> = {}): ArrearsChargeSource => ({
  id: 'charge-1',
  due_on: '2026-01-01',
  period_start: '2026-01-01',
  period_end: '2026-03-31',
  amount_kobo: 30_000_000,
  payment_allocations: [],
  leases: {
    reference: 'YB/2026/01',
    units: { label: 'Flat 1', properties: { name: 'Adeyemi Court' } },
    lease_parties: [leaseParty('Tunde Ade')],
  },
  ...overrides,
});

describe('buildRentRoll', () => {
  it('names the tenant, unit and rent for each active lease', () => {
    const rows = buildRentRoll([lease()]);
    expect(rows).toEqual([
      {
        leaseId: 'lease-1',
        reference: 'YB/2026/01',
        tenant: 'Tunde Ade',
        property: 'Adeyemi Court',
        unit: 'Flat 1',
        startsOn: '2026-01-01',
        endsOn: '2026-12-31',
        rentKobo: 30_000_000n,
        frequency: 'quarterly',
      },
    ]);
    expect(totalRent(rows)).toBe(30_000_000n);
  });

  it('sorts by the lease ending soonest', () => {
    const rows = buildRentRoll([
      lease({ id: 'later', ends_on: '2027-12-31' }),
      lease({ id: 'sooner', ends_on: '2026-06-30' }),
    ]);
    expect(rows.map((row) => row.leaseId)).toEqual(['sooner', 'later']);
  });
});

describe('arrears', () => {
  it('derives the outstanding balance from allocations and sorts by due date', () => {
    const rows = buildArrears(
      [
        charge({ id: 'later', due_on: '2026-02-01' }),
        charge({
          id: 'sooner',
          due_on: '2026-01-01',
          payment_allocations: [{ amount_kobo: 10_000_000 }],
        }),
      ],
      '2026-03-15',
    );
    expect(rows.map((row) => row.chargeId)).toEqual(['sooner', 'later']);
    expect(rows[0]?.outstandingKobo).toBe(20_000_000n);
    expect(rows[0]?.daysOverdue).toBe(73);
  });

  it('leaves fully paid charges out', () => {
    const rows = buildArrears(
      [charge({ payment_allocations: [{ amount_kobo: 30_000_000 }] })],
      '2026-03-15',
    );
    expect(rows).toEqual([]);
  });

  it('puts each charge in the right ageing bucket', () => {
    expect(bucketForDays(0)).toBe('current');
    expect(bucketForDays(-5)).toBe('current');
    expect(bucketForDays(1)).toBe('days_1_30');
    expect(bucketForDays(30)).toBe('days_1_30');
    expect(bucketForDays(31)).toBe('days_31_60');
    expect(bucketForDays(60)).toBe('days_31_60');
    expect(bucketForDays(61)).toBe('days_61_90');
    expect(bucketForDays(90)).toBe('days_61_90');
    expect(bucketForDays(91)).toBe('days_90_plus');
  });

  it('summarises every bucket, including empty ones', () => {
    const rows = buildArrears(
      [
        charge({ id: 'current', due_on: '2026-03-20' }),
        charge({ id: 'old', due_on: '2025-12-01' }),
      ],
      '2026-03-15',
    );
    const buckets = summariseArrears(rows);
    expect(buckets.map((bucket) => bucket.key)).toEqual([
      'current',
      'days_1_30',
      'days_31_60',
      'days_61_90',
      'days_90_plus',
    ]);
    expect(buckets[0]).toMatchObject({ count: 1, amountKobo: 30_000_000n });
    expect(buckets[4]).toMatchObject({ count: 1, amountKobo: 30_000_000n });
    expect(buckets[1]?.count).toBe(0);
  });
});

describe('buildCollections', () => {
  it('groups by business month, keeping gross and reversals apart', () => {
    const months = buildCollections([
      { amount_kobo: 10_000_000, paid_on: '2026-11-02' },
      { amount_kobo: 5_000_000, paid_on: '2026-11-10' },
      { amount_kobo: -5_000_000, paid_on: '2026-11-11' },
      { amount_kobo: 7_000_000, paid_on: '2026-10-01' },
    ]);
    expect(months.map((month) => month.month)).toEqual(['2026-11', '2026-10']);
    expect(months[0]).toMatchObject({
      count: 3,
      grossKobo: 15_000_000n,
      reversalKobo: -5_000_000n,
      netKobo: 10_000_000n,
    });
  });
});

describe('AN-1 report views', () => {
  it('summarises occupancy by property and calculates the rate', () => {
    const rows = buildOccupancy([
      { property_id: 'p1', property: 'Court', unit_id: 'u1', unit: '1', status: 'occupied', lease_id: 'l1', ends_on: '2027-01-01' },
      { property_id: 'p1', property: 'Court', unit_id: 'u2', unit: '2', status: 'vacant', lease_id: null, ends_on: null },
      { property_id: 'p1', property: 'Court', unit_id: 'u3', unit: '3', status: 'under_maintenance', lease_id: null, ends_on: null },
    ]);
    expect(rows[0]).toMatchObject({
      total: 3,
      occupied: 1,
      vacant: 1,
      underMaintenance: 1,
      occupancyRate: 33,
    });
  });

  it('buckets lease expiry and maintenance overdue work', () => {
    const expiry = buildLeaseExpiry([
      { lease_id: 'l1', reference: 'L1', ends_on: '2026-12-01', days_to_expiry: 17, rent_kobo: 100, unit: '1', property: 'Court', tenant: 'T' },
      { lease_id: 'l2', reference: 'L2', ends_on: '2027-03-01', days_to_expiry: 107, rent_kobo: 100, unit: '2', property: 'Court', tenant: 'U' },
    ]);
    expect(expiry.map((row) => row.window)).toEqual(['0–30 days', 'Over 90 days']);

    const queue = buildMaintenanceQueue([
      { request_id: 'm1', status: 'assigned', priority: 'high', urgency: 'normal', category: 'plumbing', reported_on: '2026-11-01', due_on: '2026-11-10', property: 'Court', unit: '1', days_overdue: 5 },
    ]);
    expect(queue[0]?.overdue).toBe(true);
    expect(queue[0]?.daysOverdue).toBe(5);
  });

  it('exports the new report sheets', () => {
    const occupancy = buildOccupancy([
      { property_id: 'p1', property: 'Court', unit_id: 'u1', unit: '1', status: 'occupied', lease_id: 'l1', ends_on: '2027-01-01' },
    ]);
    expect(occupancyCsv(occupancy)).toContain('Occupancy %');
    expect(
      leaseExpiryCsv(
        buildLeaseExpiry([
          { lease_id: 'l1', reference: 'L1', ends_on: '2026-12-01', days_to_expiry: 17, rent_kobo: 100, unit: '1', property: 'Court', tenant: 'T' },
        ]),
      ),
    ).toContain('Days to expiry');
    expect(
      maintenanceQueueCsv(
        buildMaintenanceQueue([
          { request_id: 'm1', status: 'assigned', priority: 'high', urgency: 'normal', category: 'plumbing', reported_on: '2026-11-01', due_on: '2026-11-10', property: 'Court', unit: null, days_overdue: 5 },
        ]),
      ),
    ).toContain('Days overdue');
  });
});

describe('monthsBack', () => {
  it('returns the first day of the month n-1 months earlier', () => {
    expect(monthsBack('2026-11-15', 6)).toBe('2026-06-01');
    expect(monthsBack('2026-01-05', 6)).toBe('2025-08-01');
    expect(monthsBack('2026-03-31', 1)).toBe('2026-03-01');
  });
});

describe('koboToDecimal', () => {
  it('formats without grouping so a spreadsheet reads it as a number', () => {
    expect(koboToDecimal(120_000_000n)).toBe('1200000.00');
    expect(koboToDecimal(5n)).toBe('0.05');
    expect(koboToDecimal(-100_000_000n)).toBe('-1000000.00');
    expect(koboToDecimal(0)).toBe('0.00');
  });
});

describe('CSV output', () => {
  it('quotes commas, quotes and newlines', () => {
    const csv = toCsv(
      ['Name', 'Note'],
      [
        ['Adeyemi, Court', 'He said "pay"'],
        ['line', 'one\ntwo'],
      ],
    );
    expect(csv).toBe('Name,Note\r\n"Adeyemi, Court","He said ""pay"""\r\nline,"one\ntwo"\r\n');
  });

  it('writes a rent roll, arrears and collections sheet', () => {
    const roll = buildRentRoll([lease()]);
    expect(rentRollCsv(roll).split('\r\n')[0]).toContain('Rent (NGN)');

    const rows = buildArrears([charge()], '2026-03-15');
    expect(arrearsCsv(rows)).toContain('Tunde Ade');

    const months = buildCollections([{ amount_kobo: 10_000_000, paid_on: '2026-11-02' }]);
    expect(collectionsCsv(months)).toContain('100000.00');
  });
});
