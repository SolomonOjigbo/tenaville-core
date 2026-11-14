import { MoneyParseError, parseNaira, toTransport } from '@tenaville/money';

export interface ImportIssue {
  readonly field: string;
  readonly code: 'required' | 'invalid' | 'duplicate' | 'not_found' | 'too_long';
  readonly message: string;
}

export interface TenantLeaseRow {
  readonly tenantName: string;
  readonly tenantEmail: string | null;
  readonly tenantPhone: string | null;
  readonly leaseReference: string;
  readonly propertyName: string;
  readonly unitLabel: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly rentKobo: string;
  readonly rentFrequency: 'annual' | 'half_yearly' | 'quarterly' | 'monthly' | 'irregular';
  readonly depositKobo: string | null;
  readonly depositCustodian: 'agency' | 'landlord';
}

export type TenantLeaseResult =
  | { readonly rowNumber: number; readonly status: 'valid'; readonly row: TenantLeaseRow }
  | { readonly rowNumber: number; readonly status: 'invalid'; readonly issues: ImportIssue[] };

export interface TenantLeaseContext {
  readonly units: readonly { readonly propertyName: string; readonly unitLabel: string }[];
  readonly leaseReferences: readonly string[];
}

const key = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[._/\\-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const HEADERS: Record<string, readonly string[]> = {
  tenantName: ['tenant name', 'tenant', 'name', 'occupant'],
  tenantEmail: ['tenant email', 'email', 'e mail'],
  tenantPhone: ['tenant phone', 'phone', 'telephone', 'mobile'],
  leaseReference: ['lease reference', 'lease ref', 'lease number', 'tenancy ref', 'agreement'],
  propertyName: ['property name', 'property', 'building', 'estate'],
  unitLabel: ['unit', 'unit label', 'flat', 'flat no', 'shop no', 'room no'],
  startsOn: ['start date', 'starts on', 'lease start', 'commencement', 'from'],
  endsOn: ['end date', 'ends on', 'lease end', 'expiry', 'to'],
  rent: ['rent', 'annual rent', 'rent p a', 'rent pa', 'amount'],
  rentFrequency: ['frequency', 'rent frequency', 'payment frequency', 'period'],
  deposit: ['deposit', 'caution deposit', 'security deposit'],
  depositCustodian: ['custodian', 'deposit holder', 'deposit custodian'],
};

export const mapTenantLeaseHeaders = (
  headers: readonly string[],
): { columns: Record<string, number>; missing: string[] } => {
  const columns: Record<string, number> = {};
  for (const [field, synonyms] of Object.entries(HEADERS)) {
    const index = headers.findIndex((header) =>
      synonyms.some((synonym) => key(synonym) === key(header)),
    );
    if (index !== -1) columns[field] = index;
  }
  return {
    columns,
    missing: [
      'tenantName',
      'leaseReference',
      'propertyName',
      'unitLabel',
      'startsOn',
      'endsOn',
      'rent',
    ].filter((field) => columns[field] === undefined),
  };
};

const parseDate = (value: string): string | null => {
  const text = value.trim();
  let iso: string | null = null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    iso = text;
  } else {
    const british = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    if (british !== null) {
      const [, day, month, year] = british;
      iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  if (iso === null) return null;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso ? null : iso;
};

const frequency = (value: string): TenantLeaseRow['rentFrequency'] | null => {
  const normalised = key(value);
  if (normalised === '' || normalised === 'annual' || normalised === 'yearly') return 'annual';
  if (normalised === 'half yearly' || normalised === 'biannual') return 'half_yearly';
  if (normalised === 'quarterly') return 'quarterly';
  if (normalised === 'monthly') return 'monthly';
  if (normalised === 'irregular') return 'irregular';
  return null;
};

const kobo = (value: string): string | null => {
  if (value.trim() === '') return null;
  try {
    return toTransport(parseNaira(value));
  } catch (error) {
    if (error instanceof MoneyParseError) return null;
    return null;
  }
};

export const validateTenantLeaseRows = (
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  context: TenantLeaseContext,
): TenantLeaseResult[] => {
  const { columns } = mapTenantLeaseHeaders(headers);
  const cell = (row: readonly string[], field: string): string => {
    const index = columns[field];
    return index === undefined ? '' : (row[index] ?? '').trim();
  };
  const seen = new Set<string>();
  const unitKeys = new Set(
    context.units.map((unit) => `${key(unit.propertyName)}|${key(unit.unitLabel)}`),
  );
  const existingReferences = new Set(
    context.leaseReferences.map((reference) => reference.toLowerCase()),
  );

  return rows.map((cells, index) => {
    const rowNumber = index + 2;
    const issues: ImportIssue[] = [];
    const tenantName = cell(cells, 'tenantName');
    const leaseReference = cell(cells, 'leaseReference');
    const propertyName = cell(cells, 'propertyName');
    const unitLabel = cell(cells, 'unitLabel');
    const startsOn = parseDate(cell(cells, 'startsOn'));
    const endsOn = parseDate(cell(cells, 'endsOn'));
    const rentKobo = kobo(cell(cells, 'rent'));
    const rentFrequency = frequency(cell(cells, 'rentFrequency'));
    const depositKobo = kobo(cell(cells, 'deposit'));
    const custodian = key(cell(cells, 'depositCustodian')) === 'landlord' ? 'landlord' : 'agency';

    if (tenantName === '')
      issues.push({ field: 'tenantName', code: 'required', message: 'Tenant name is required.' });
    else if (tenantName.length > 200)
      issues.push({ field: 'tenantName', code: 'too_long', message: 'Tenant name is too long.' });

    if (leaseReference === '')
      issues.push({
        field: 'leaseReference',
        code: 'required',
        message: 'Lease reference is required.',
      });
    else if (existingReferences.has(leaseReference.toLowerCase())) {
      issues.push({
        field: 'leaseReference',
        code: 'duplicate',
        message: 'That lease reference already exists in this organisation.',
      });
    } else if (seen.has(leaseReference.toLowerCase())) {
      issues.push({
        field: 'leaseReference',
        code: 'duplicate',
        message: 'That lease reference appears more than once in this file.',
      });
    } else {
      seen.add(leaseReference.toLowerCase());
    }

    if (propertyName === '')
      issues.push({
        field: 'propertyName',
        code: 'required',
        message: 'Property name is required.',
      });
    if (unitLabel === '')
      issues.push({ field: 'unitLabel', code: 'required', message: 'Unit is required.' });
    if (
      propertyName !== '' &&
      unitLabel !== '' &&
      !unitKeys.has(`${key(propertyName)}|${key(unitLabel)}`)
    ) {
      issues.push({
        field: 'unitLabel',
        code: 'not_found',
        message: 'No unit with that label exists under the property.',
      });
    }

    if (startsOn === null)
      issues.push({
        field: 'startsOn',
        code: 'invalid',
        message: 'Use a date like 2026-01-31 or 31/01/2026.',
      });
    if (endsOn === null)
      issues.push({
        field: 'endsOn',
        code: 'invalid',
        message: 'Use a date like 2026-12-31 or 31/12/2026.',
      });
    if (startsOn !== null && endsOn !== null && endsOn <= startsOn) {
      issues.push({
        field: 'endsOn',
        code: 'invalid',
        message: 'The end date must be after the start date.',
      });
    }

    if (rentKobo === null || BigInt(rentKobo) <= 0n)
      issues.push({ field: 'rent', code: 'invalid', message: 'Enter a positive rent amount.' });
    if (rentFrequency === null)
      issues.push({
        field: 'rentFrequency',
        code: 'invalid',
        message: 'Use annual, half yearly, quarterly, monthly or irregular.',
      });
    if (depositKobo === null && cell(cells, 'deposit') !== '')
      issues.push({ field: 'deposit', code: 'invalid', message: 'Enter a valid deposit amount.' });

    const email = cell(cells, 'tenantEmail');
    if (email !== '' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      issues.push({
        field: 'tenantEmail',
        code: 'invalid',
        message: 'Enter a valid email address.',
      });
    }
    const phone = cell(cells, 'tenantPhone');
    if (phone !== '' && !/^\+[1-9][0-9]{7,14}$/.test(phone)) {
      issues.push({
        field: 'tenantPhone',
        code: 'invalid',
        message: 'Use an international phone number, e.g. +2348012345678.',
      });
    }

    if (issues.length > 0) return { rowNumber, status: 'invalid', issues };

    return {
      rowNumber,
      status: 'valid',
      row: {
        tenantName,
        tenantEmail: email === '' ? null : email,
        tenantPhone: phone === '' ? null : phone,
        leaseReference,
        propertyName,
        unitLabel,
        startsOn: startsOn as string,
        endsOn: endsOn as string,
        rentKobo: rentKobo as string,
        rentFrequency: rentFrequency as TenantLeaseRow['rentFrequency'],
        depositKobo,
        depositCustodian: custodian,
      },
    };
  });
};
