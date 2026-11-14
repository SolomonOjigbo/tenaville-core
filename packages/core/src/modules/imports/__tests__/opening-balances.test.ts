import { describe, expect, it } from 'vitest';

import {
  mapOpeningBalanceHeaders,
  validateOpeningBalanceRows,
  type OpeningBalanceContext,
} from '../domain/opening-balances';

const headers = ['Account Type', 'Lease Reference', 'Landlord Name', 'Amount', 'Notes'];
const context: OpeningBalanceContext = {
  leaseReferences: ['BOLA/001'],
  landlords: ['Mrs Bola'],
};

describe('opening balance import validation', () => {
  it('maps the template columns', () => {
    expect(mapOpeningBalanceHeaders(headers).missing).toEqual([]);
  });

  it('accepts tenant arrears against an existing lease', () => {
    const [result] = validateOpeningBalanceRows(
      headers,
      [['tenant arrears', 'BOLA/001', '', '250,000', 'Cutover arrears']],
      context,
    );
    expect(result?.status).toBe('valid');
    if (result?.status === 'valid') expect(result.row.amountKobo).toBe('25000000');
  });

  it('accepts both landlord directions', () => {
    const results = validateOpeningBalanceRows(
      headers,
      [
        ['landlord credit', '', 'Mrs Bola', '500,000', ''],
        ['landlord debit', '', 'Mrs Bola', '75,000', ''],
      ],
      context,
    );
    expect(results.map((result) => result.status)).toEqual(['valid', 'valid']);
  });

  it('rejects unknown accounts, entities and non-positive amounts', () => {
    const [result] = validateOpeningBalanceRows(
      headers,
      [['something else', 'NOPE/999', 'Unknown', '0', '']],
      context,
    );
    expect(result?.status).toBe('invalid');
    if (result?.status === 'invalid') {
      expect(result.issues.map((issue) => issue.field)).toEqual(
        expect.arrayContaining(['accountType', 'amount']),
      );
    }
  });
});
