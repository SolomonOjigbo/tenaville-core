import { describe, expect, it } from 'vitest';

import {
  mapTenantLeaseHeaders,
  validateTenantLeaseRows,
  type TenantLeaseContext,
} from '../domain/tenant-lease';

const headers = [
  'Tenant Name',
  'Tenant Email',
  'Lease Reference',
  'Property Name',
  'Unit',
  'Start Date',
  'End Date',
  'Rent',
  'Frequency',
  'Deposit',
];

const context: TenantLeaseContext = {
  units: [{ propertyName: 'Bola Court', unitLabel: 'Flat 1' }],
  leaseReferences: ['OLD/001'],
};

const validRow = [
  'Grace Udo',
  'grace@example.com',
  'BOLA/001',
  'Bola Court',
  'Flat 1',
  '01/02/2026',
  '31/01/2027',
  '1,200,000',
  'annual',
  '200,000',
];

describe('tenant/lease import validation', () => {
  it('maps the headers agencies actually use', () => {
    const mapping = mapTenantLeaseHeaders(headers);
    expect(mapping.missing).toEqual([]);
    expect(mapping.columns.tenantName).toBe(0);
    expect(mapping.columns.rent).toBe(7);
  });

  it('parses a complete row and normalises dates and amounts', () => {
    const [result] = validateTenantLeaseRows(headers, [validRow], context);
    expect(result?.status).toBe('valid');
    if (result?.status !== 'valid') return;
    expect(result.row.startsOn).toBe('2026-02-01');
    expect(result.row.endsOn).toBe('2027-01-31');
    expect(result.row.rentKobo).toBe('120000000');
    expect(result.row.depositKobo).toBe('20000000');
  });

  it('reports every problem in the row', () => {
    const [result] = validateTenantLeaseRows(
      headers,
      [
        [
          '',
          'not-an-email',
          'OLD/001',
          'Bola Court',
          'Flat 9',
          '31/02/2026',
          '2026-01-01',
          '-5',
          'weekly',
          '',
        ],
      ],
      context,
    );
    expect(result?.status).toBe('invalid');
    if (result?.status !== 'invalid') return;
    expect(result.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining([
        'tenantName',
        'tenantEmail',
        'leaseReference',
        'unitLabel',
        'startsOn',
        'rent',
        'rentFrequency',
      ]),
    );
  });

  it('rejects a duplicate lease reference within the file', () => {
    const results = validateTenantLeaseRows(headers, [validRow, validRow], context);
    expect(results[0]?.status).toBe('valid');
    expect(results[1]?.status).toBe('invalid');
    if (results[1]?.status === 'invalid') {
      expect(results[1].issues.some((issue) => issue.code === 'duplicate')).toBe(true);
    }
  });
});
