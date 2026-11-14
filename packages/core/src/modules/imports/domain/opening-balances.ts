import { MoneyParseError, parseNaira, toTransport } from '@tenaville/money';

import type { ImportIssue } from './tenant-lease';

export type OpeningAccountType =
  'tenant_arrears' | 'tenant_credit' | 'landlord_credit' | 'landlord_debit';

export interface OpeningBalanceRow {
  readonly accountType: OpeningAccountType;
  readonly leaseReference: string | null;
  readonly tenantName: string | null;
  readonly landlordName: string | null;
  readonly amountKobo: string;
  readonly notes: string | null;
}

export type OpeningBalanceResult =
  | { readonly rowNumber: number; readonly status: 'valid'; readonly row: OpeningBalanceRow }
  | { readonly rowNumber: number; readonly status: 'invalid'; readonly issues: ImportIssue[] };

export interface OpeningBalanceContext {
  readonly leaseReferences: readonly string[];
  readonly landlords: readonly string[];
}

const key = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[._/\\-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const HEADERS: Record<string, readonly string[]> = {
  accountType: ['account type', 'type', 'balance type', 'account'],
  leaseReference: ['lease reference', 'lease ref', 'lease number', 'tenancy ref'],
  tenantName: ['tenant name', 'tenant'],
  landlordName: ['landlord name', 'landlord', 'owner'],
  amount: ['amount', 'balance', 'opening balance', 'arrears', 'credit'],
  notes: ['notes', 'note', 'reference'],
};

export const mapOpeningBalanceHeaders = (
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
    missing: ['accountType', 'amount'].filter((field) => columns[field] === undefined),
  };
};

const accountType = (value: string): OpeningAccountType | null => {
  const normalised = key(value);
  if (normalised === 'tenant arrears' || normalised === 'arrears' || normalised === 'tenant debt')
    return 'tenant_arrears';
  if (
    normalised === 'tenant credit' ||
    normalised === 'credit' ||
    normalised === 'tenant overpayment'
  )
    return 'tenant_credit';
  if (normalised === 'landlord credit' || normalised === 'agency owes landlord')
    return 'landlord_credit';
  if (normalised === 'landlord debit' || normalised === 'landlord owes agency')
    return 'landlord_debit';
  return null;
};

export const validateOpeningBalanceRows = (
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  context: OpeningBalanceContext,
): OpeningBalanceResult[] => {
  const { columns } = mapOpeningBalanceHeaders(headers);
  const cell = (row: readonly string[], field: string): string => {
    const index = columns[field];
    return index === undefined ? '' : (row[index] ?? '').trim();
  };
  const leaseReferences = new Set(
    context.leaseReferences.map((reference) => reference.toLowerCase()),
  );
  const landlords = new Set(context.landlords.map((name) => key(name)));

  return rows.map((cells, index) => {
    const rowNumber = index + 2;
    const issues: ImportIssue[] = [];
    const type = accountType(cell(cells, 'accountType'));
    const leaseReference = cell(cells, 'leaseReference');
    const landlordName = cell(cells, 'landlordName');
    const amountText = cell(cells, 'amount');

    if (type === null) {
      issues.push({
        field: 'accountType',
        code: 'invalid',
        message: 'Use tenant arrears, tenant credit, landlord credit or landlord debit.',
      });
    }

    let amountKobo: string | null = null;
    try {
      amountKobo = amountText === '' ? null : toTransport(parseNaira(amountText));
    } catch (error) {
      if (!(error instanceof MoneyParseError)) throw error;
    }
    if (amountKobo === null || BigInt(amountKobo) <= 0n) {
      issues.push({ field: 'amount', code: 'invalid', message: 'Enter a positive amount.' });
    }

    if (type === 'tenant_arrears' || type === 'tenant_credit') {
      if (leaseReference === '')
        issues.push({
          field: 'leaseReference',
          code: 'required',
          message: 'Lease reference is required.',
        });
      else if (!leaseReferences.has(leaseReference.toLowerCase()))
        issues.push({
          field: 'leaseReference',
          code: 'not_found',
          message: 'No lease with that reference exists.',
        });
    }

    if (type === 'landlord_credit' || type === 'landlord_debit') {
      if (landlordName === '')
        issues.push({
          field: 'landlordName',
          code: 'required',
          message: 'Landlord name is required.',
        });
      else if (!landlords.has(key(landlordName)))
        issues.push({
          field: 'landlordName',
          code: 'not_found',
          message: 'No landlord with that name exists.',
        });
    }

    if (issues.length > 0 || type === null || amountKobo === null)
      return { rowNumber, status: 'invalid', issues };

    return {
      rowNumber,
      status: 'valid',
      row: {
        accountType: type,
        leaseReference: leaseReference === '' ? null : leaseReference,
        tenantName: cell(cells, 'tenantName') === '' ? null : cell(cells, 'tenantName'),
        landlordName: landlordName === '' ? null : landlordName,
        amountKobo,
        notes: cell(cells, 'notes') === '' ? null : cell(cells, 'notes'),
      },
    };
  });
};
