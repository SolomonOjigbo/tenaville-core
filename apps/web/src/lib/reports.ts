/**
 * Reporting arithmetic (AN-1, AN-4, RENT-5).
 *
 * The screens and the CSV exports both read from these functions, so a figure
 * in a downloaded spreadsheet cannot differ from the one on screen. Money is
 * bigint kobo until the last step; the only formatting here is the decimal
 * text a spreadsheet expects, which is a display concern, not arithmetic.
 */

export interface LeasePartySource {
  readonly role: string;
  readonly tenants: { readonly display_name: string } | null;
}

export interface RentRollSource {
  readonly id: string;
  readonly reference: string | null;
  readonly starts_on: string;
  readonly ends_on: string;
  readonly rent_kobo: number;
  readonly rent_frequency: string;
  readonly units: {
    readonly label: string;
    readonly properties: { readonly name: string } | null;
  } | null;
  readonly lease_parties: readonly LeasePartySource[];
}

export interface RentRollRow {
  readonly leaseId: string;
  readonly reference: string;
  readonly tenant: string;
  readonly property: string;
  readonly unit: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly rentKobo: bigint;
  readonly frequency: string;
}

const tenantOf = (parties: readonly LeasePartySource[]): string =>
  parties.find((party) => party.role === 'tenant')?.tenants?.display_name ?? 'Tenant';

export const buildRentRoll = (rows: readonly RentRollSource[]): RentRollRow[] =>
  rows
    .map((lease) => ({
      leaseId: lease.id,
      reference: lease.reference ?? 'No reference',
      tenant: tenantOf(lease.lease_parties),
      property: lease.units?.properties?.name ?? 'Property',
      unit: lease.units?.label ?? 'Unit',
      startsOn: lease.starts_on,
      endsOn: lease.ends_on,
      rentKobo: BigInt(lease.rent_kobo),
      frequency: lease.rent_frequency,
    }))
    .sort((a, b) => a.endsOn.localeCompare(b.endsOn));

export const totalRent = (rows: readonly RentRollRow[]): bigint =>
  rows.reduce((total, row) => total + row.rentKobo, 0n);

export interface ArrearsChargeSource {
  readonly id: string;
  readonly due_on: string;
  readonly period_start: string;
  readonly period_end: string;
  readonly amount_kobo: number;
  readonly payment_allocations: readonly { readonly amount_kobo: number }[];
  readonly leases: {
    readonly reference: string | null;
    readonly units: {
      readonly label: string;
      readonly properties: { readonly name: string } | null;
    } | null;
    readonly lease_parties: readonly LeasePartySource[];
  } | null;
}

export interface ArrearsRow {
  readonly chargeId: string;
  readonly leaseReference: string;
  readonly tenant: string;
  readonly property: string;
  readonly unit: string;
  readonly period: string;
  readonly dueOn: string;
  readonly daysOverdue: number;
  readonly outstandingKobo: bigint;
}

export const buildArrears = (rows: readonly ArrearsChargeSource[], today: string): ArrearsRow[] =>
  rows
    .map((charge) => {
      const paid = charge.payment_allocations.reduce(
        (total, allocation) => total + BigInt(allocation.amount_kobo),
        0n,
      );
      const outstandingKobo = BigInt(charge.amount_kobo) - paid;
      const due = Date.parse(`${charge.due_on}T00:00:00Z`);
      const now = Date.parse(`${today}T00:00:00Z`);
      const daysOverdue =
        Number.isNaN(due) || Number.isNaN(now) ? 0 : Math.floor((now - due) / 86_400_000);

      return {
        chargeId: charge.id,
        leaseReference: charge.leases?.reference ?? 'No reference',
        tenant: charge.leases === null ? 'Tenant' : tenantOf(charge.leases.lease_parties),
        property: charge.leases?.units?.properties?.name ?? 'Property',
        unit: charge.leases?.units?.label ?? 'Unit',
        period: `${charge.period_start} to ${charge.period_end}`,
        dueOn: charge.due_on,
        daysOverdue,
        outstandingKobo,
      };
    })
    .filter((row) => row.outstandingKobo > 0n)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));

export type ArrearsBucketKey =
  'current' | 'days_1_30' | 'days_31_60' | 'days_61_90' | 'days_90_plus';

export interface ArrearsBucket {
  readonly key: ArrearsBucketKey;
  readonly label: string;
  readonly count: number;
  readonly amountKobo: bigint;
}

export const bucketForDays = (daysOverdue: number): ArrearsBucketKey => {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return 'days_1_30';
  if (daysOverdue <= 60) return 'days_31_60';
  if (daysOverdue <= 90) return 'days_61_90';
  return 'days_90_plus';
};

const BUCKET_LABELS: ReadonlyArray<readonly [ArrearsBucketKey, string]> = [
  ['current', 'Not yet due'],
  ['days_1_30', '1–30 days'],
  ['days_31_60', '31–60 days'],
  ['days_61_90', '61–90 days'],
  ['days_90_plus', 'Over 90 days'],
];

export const summariseArrears = (rows: readonly ArrearsRow[]): ArrearsBucket[] =>
  BUCKET_LABELS.map(([key, label]) => {
    const bucketRows = rows.filter((row) => bucketForDays(row.daysOverdue) === key);
    return {
      key,
      label,
      count: bucketRows.length,
      amountKobo: bucketRows.reduce((total, row) => total + row.outstandingKobo, 0n),
    };
  });

export interface CollectionSource {
  readonly amount_kobo: number;
  readonly paid_on: string;
}

export interface MonthSummary {
  readonly month: string;
  readonly count: number;
  readonly grossKobo: bigint;
  readonly reversalKobo: bigint;
  readonly netKobo: bigint;
}

/** Money in and out by business month, newest first (AN-4). */
export const buildCollections = (rows: readonly CollectionSource[]): MonthSummary[] => {
  const byMonth = new Map<string, MonthSummary>();

  for (const row of rows) {
    const month = row.paid_on.slice(0, 7);
    const amount = BigInt(row.amount_kobo);
    const current = byMonth.get(month) ?? {
      month,
      count: 0,
      grossKobo: 0n,
      reversalKobo: 0n,
      netKobo: 0n,
    };

    byMonth.set(month, {
      month,
      count: current.count + 1,
      grossKobo: current.grossKobo + (amount > 0n ? amount : 0n),
      reversalKobo: current.reversalKobo + (amount < 0n ? amount : 0n),
      netKobo: current.netKobo + amount,
    });
  }

  return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month));
};

export interface OccupancySource {
  readonly property_id: string;
  readonly property: string;
  readonly unit_id: string;
  readonly unit: string;
  readonly status: string;
  readonly lease_id: string | null;
  readonly ends_on: string | null;
}

export interface OccupancyRow {
  readonly propertyId: string;
  readonly property: string;
  readonly total: number;
  readonly occupied: number;
  readonly vacant: number;
  readonly reserved: number;
  readonly underMaintenance: number;
  readonly inactive: number;
  readonly occupancyRate: number;
}

export const buildOccupancy = (rows: readonly OccupancySource[]): OccupancyRow[] => {
  const byProperty = new Map<string, OccupancyRow>();

  for (const row of rows) {
    const current = byProperty.get(row.property_id) ?? {
      propertyId: row.property_id,
      property: row.property,
      total: 0,
      occupied: 0,
      vacant: 0,
      reserved: 0,
      underMaintenance: 0,
      inactive: 0,
      occupancyRate: 0,
    };

    const occupied = row.status === 'occupied' || row.lease_id !== null;
    byProperty.set(row.property_id, {
      ...current,
      total: current.total + 1,
      occupied: current.occupied + (occupied ? 1 : 0),
      vacant: current.vacant + (row.status === 'vacant' && !occupied ? 1 : 0),
      reserved: current.reserved + (row.status === 'reserved' ? 1 : 0),
      underMaintenance:
        current.underMaintenance + (row.status === 'under_maintenance' ? 1 : 0),
      inactive: current.inactive + (row.status === 'inactive' ? 1 : 0),
    });
  }

  return [...byProperty.values()]
    .map((row) => ({
      ...row,
      occupancyRate: row.total === 0 ? 0 : Math.round((row.occupied / row.total) * 100),
    }))
    .sort((a, b) => a.property.localeCompare(b.property));
};

export interface LeaseExpirySource {
  readonly lease_id: string;
  readonly reference: string | null;
  readonly ends_on: string;
  readonly days_to_expiry: number | null;
  readonly rent_kobo: number;
  readonly unit: string;
  readonly property: string;
  readonly tenant: string;
}

export interface LeaseExpiryRow {
  readonly leaseId: string;
  readonly reference: string;
  readonly tenant: string;
  readonly property: string;
  readonly unit: string;
  readonly endsOn: string;
  readonly daysToExpiry: number;
  readonly rentKobo: bigint;
  readonly window: '0–30 days' | '31–60 days' | '61–90 days' | 'Over 90 days' | 'Expired';
}

const expiryWindow = (days: number): LeaseExpiryRow['window'] => {
  if (days < 0) return 'Expired';
  if (days <= 30) return '0–30 days';
  if (days <= 60) return '31–60 days';
  if (days <= 90) return '61–90 days';
  return 'Over 90 days';
};

export const buildLeaseExpiry = (rows: readonly LeaseExpirySource[]): LeaseExpiryRow[] =>
  rows
    .map((row) => {
      const daysToExpiry = row.days_to_expiry ?? 0;
      return {
        leaseId: row.lease_id,
        reference: row.reference ?? 'No reference',
        tenant: row.tenant,
        property: row.property,
        unit: row.unit,
        endsOn: row.ends_on,
        daysToExpiry,
        rentKobo: BigInt(row.rent_kobo),
        window: expiryWindow(daysToExpiry),
      };
    })
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);

export interface MaintenanceQueueSource {
  readonly request_id: string;
  readonly status: string;
  readonly priority: string;
  readonly urgency: string;
  readonly category: string;
  readonly reported_on: string;
  readonly due_on: string | null;
  readonly property: string;
  readonly unit: string | null;
  readonly days_overdue: number | null;
}

export interface MaintenanceQueueRow {
  readonly requestId: string;
  readonly status: string;
  readonly priority: string;
  readonly urgency: string;
  readonly category: string;
  readonly reportedOn: string;
  readonly dueOn: string | null;
  readonly property: string;
  readonly unit: string;
  readonly daysOverdue: number;
  readonly overdue: boolean;
}

export const buildMaintenanceQueue = (
  rows: readonly MaintenanceQueueSource[],
): MaintenanceQueueRow[] =>
  rows
    .map((row) => {
      const daysOverdue = Math.max(row.days_overdue ?? 0, 0);
      return {
        requestId: row.request_id,
        status: row.status,
        priority: row.priority,
        urgency: row.urgency,
        category: row.category,
        reportedOn: row.reported_on,
        dueOn: row.due_on,
        property: row.property,
        unit: row.unit ?? 'Whole property',
        daysOverdue,
        overdue: row.due_on !== null && daysOverdue > 0,
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

/** The first day of the month `count` months before the month containing `today`. */
export const monthsBack = (today: string, count: number): string => {
  const [yearString, monthString] = today.split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  if (!Number.isInteger(year) || !Number.isInteger(month) || count < 1) return today;

  const total = year * 12 + (month - 1) - (count - 1);
  const targetYear = Math.floor(total / 12);
  const targetMonth = (((total % 12) + 12) % 12) + 1;
  return `${targetYear.toString().padStart(4, '0')}-${targetMonth.toString().padStart(2, '0')}-01`;
};

/** Kobo as a plain decimal string, the numeric form a spreadsheet wants. */
export const koboToDecimal = (amount: bigint | number): string => {
  const value = typeof amount === 'bigint' ? amount : BigInt(amount);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 100n;
  const minor = (absolute % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole.toString()}.${minor}`;
};

const csvCell = (value: string | number | bigint): string => {
  const text = typeof value === 'bigint' ? value.toString() : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const toCsv = (
  headers: readonly string[],
  rows: readonly (readonly (string | number | bigint)[])[],
): string => [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';

export const rentRollCsv = (rows: readonly RentRollRow[]): string =>
  toCsv(
    ['Lease', 'Tenant', 'Property', 'Unit', 'Starts', 'Ends', 'Rent (NGN)', 'Frequency'],
    rows.map((row) => [
      row.reference,
      row.tenant,
      row.property,
      row.unit,
      row.startsOn,
      row.endsOn,
      koboToDecimal(row.rentKobo),
      row.frequency,
    ]),
  );

export const arrearsCsv = (rows: readonly ArrearsRow[]): string =>
  toCsv(
    ['Lease', 'Tenant', 'Property', 'Unit', 'Period', 'Due', 'Days overdue', 'Outstanding (NGN)'],
    rows.map((row) => [
      row.leaseReference,
      row.tenant,
      row.property,
      row.unit,
      row.period,
      row.dueOn,
      row.daysOverdue,
      koboToDecimal(row.outstandingKobo),
    ]),
  );

export const collectionsCsv = (rows: readonly MonthSummary[]): string =>
  toCsv(
    ['Month', 'Payments', 'Gross (NGN)', 'Reversals (NGN)', 'Net (NGN)'],
    rows.map((row) => [
      row.month,
      row.count,
      koboToDecimal(row.grossKobo),
      koboToDecimal(row.reversalKobo),
      koboToDecimal(row.netKobo),
    ]),
  );

export const occupancyCsv = (rows: readonly OccupancyRow[]): string =>
  toCsv(
    ['Property', 'Units', 'Occupied', 'Vacant', 'Reserved', 'Under maintenance', 'Inactive', 'Occupancy %'],
    rows.map((row) => [
      row.property,
      row.total,
      row.occupied,
      row.vacant,
      row.reserved,
      row.underMaintenance,
      row.inactive,
      row.occupancyRate,
    ]),
  );

export const leaseExpiryCsv = (rows: readonly LeaseExpiryRow[]): string =>
  toCsv(
    ['Lease', 'Tenant', 'Property', 'Unit', 'Ends', 'Days to expiry', 'Window', 'Rent (NGN)'],
    rows.map((row) => [
      row.reference,
      row.tenant,
      row.property,
      row.unit,
      row.endsOn,
      row.daysToExpiry,
      row.window,
      koboToDecimal(row.rentKobo),
    ]),
  );

export const maintenanceQueueCsv = (rows: readonly MaintenanceQueueRow[]): string =>
  toCsv(
    ['Property', 'Unit', 'Category', 'Status', 'Priority', 'Urgency', 'Reported', 'Due', 'Days overdue'],
    rows.map((row) => [
      row.property,
      row.unit,
      row.category,
      row.status,
      row.priority,
      row.urgency,
      row.reportedOn,
      row.dueOn ?? '',
      row.daysOverdue,
    ]),
  );
