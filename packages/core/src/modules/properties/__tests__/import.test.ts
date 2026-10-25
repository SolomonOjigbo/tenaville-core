import { describe, expect, it } from 'vitest';

import {
  mapHeaders,
  normaliseKey,
  summarise,
  validateRows,
  type RowResult,
  type ValidationContext,
} from '../domain/import';

const context: ValidationContext = {
  stateCodes: ['LA', 'FC', 'RI', 'KN'],
  stateNames: {
    lagos: 'LA',
    'federal capital territory': 'FC',
    rivers: 'RI',
    kano: 'KN',
  },
};

const valid = (r: RowResult) => {
  if (r.status !== 'valid')
    throw new Error(`row ${r.rowNumber} invalid: ${JSON.stringify(r.issues)}`);
  return r.row;
};
const issuesOf = (r: RowResult) => (r.status === 'invalid' ? r.issues : []);

describe('header mapping', () => {
  it('matches headers regardless of case, spacing and punctuation', () => {
    const m = mapHeaders([
      'Property Name',
      'property_type',
      'ADDRESS',
      'State',
      'Flat No',
      'Unit Type',
    ]);
    expect(m.columns).toMatchObject({
      propertyName: 0,
      propertyType: 1,
      addressLine: 2,
      stateCode: 3,
      unitLabel: 4,
      unitType: 5,
    });
    expect(m.unmapped).toEqual([]);
  });

  it('accepts the wordings agency spreadsheets actually use', () => {
    const m = mapHeaders(['Building', 'Rent p.a.', 'No of Bedrooms', 'Local Government', 'Owner']);
    expect(m.columns.propertyName).toBe(0);
    expect(m.columns.askingRentKobo).toBe(1);
    expect(m.columns.bedrooms).toBe(2);
    expect(m.columns.lga).toBe(3);
    expect(m.columns.landlordName).toBe(4);
  });

  it('reports headers it cannot place rather than dropping them silently', () => {
    const m = mapHeaders(['Property Name', 'Service Charge', 'Agent Commission']);
    expect(m.unmapped).toEqual(['Service Charge', 'Agent Commission']);
  });

  it('keeps the first of a duplicated header and reports the second', () => {
    const m = mapHeaders(['Property Name', 'Property']);
    expect(m.columns.propertyName).toBe(0);
    expect(m.unmapped).toEqual(['Property']);
  });

  it('records the agency original header for error messages', () => {
    const m = mapHeaders(['Rent p.a.']);
    expect(m.sourceHeaders.askingRentKobo).toBe('Rent p.a.');
  });
});

describe('normaliseKey', () => {
  it('turns separators into spaces and drops other punctuation', () => {
    expect(normaliseKey('Rent P.A.')).toBe('rent p a');
    expect(normaliseKey('Rent p.a.')).toBe('rent p a');
    expect(normaliseKey('  Self-Contained ')).toBe('self contained');
    expect(normaliseKey('No_of/Bedrooms')).toBe('no of bedrooms');
    expect(normaliseKey('Rent (₦)')).toBe('rent');
  });

  it('does not unify spellings that differ by more than punctuation', () => {
    // "rent pa" and "rent p a" stay distinct, which is why the synonym lists
    // carry both rather than trusting normalisation to merge them.
    expect(normaliseKey('Rent pa')).not.toBe(normaliseKey('Rent p.a.'));
  });
});

const headers = [
  'Property Name',
  'Property Type',
  'Address',
  'State',
  'LGA',
  'Landlord',
  'Flat No',
  'Unit Type',
  'Status',
  'Bedrooms',
  'Rent p.a.',
];

describe('row validation', () => {
  it('parses a well-formed row', () => {
    const { results } = validateRows(
      headers,
      [
        [
          'Bola Court',
          'Residential',
          '12 Kingsway Road',
          'Lagos',
          'Eti-Osa',
          'Bola Adewale',
          'Flat 1',
          'Flat',
          'Occupied',
          '3',
          '₦1,200,000.00',
        ],
      ],
      context,
    );
    const row = valid(results[0]!);
    expect(row).toMatchObject({
      propertyName: 'Bola Court',
      propertyType: 'residential',
      stateCode: 'LA',
      lga: 'Eti-Osa',
      landlordName: 'Bola Adewale',
      unitLabel: 'Flat 1',
      unitType: 'flat',
      unitStatus: 'occupied',
      bedrooms: 3,
    });
    expect(row.askingRentKobo).toBe(120_000_000n);
  });

  it('numbers rows as the agency sees them, counting the header', () => {
    const { results } = validateRows(headers, [[], []], context);
    expect(results.map((r) => r.rowNumber)).toEqual([2, 3]);
  });

  it('accepts a state by code or by name', () => {
    const { results } = validateRows(
      headers,
      [
        ['A', 'Residential', 'Addr', 'LA', '', '', 'U1', 'Flat', '', '', ''],
        ['B', 'Residential', 'Addr', 'lagos', '', '', 'U1', 'Flat', '', '', ''],
      ],
      context,
    );
    expect(valid(results[0]!).stateCode).toBe('LA');
    expect(valid(results[1]!).stateCode).toBe('LA');
  });

  it('rejects a state that is not Nigerian', () => {
    const { results } = validateRows(
      headers,
      [['A', 'Residential', 'Addr', 'Nairobi', '', '', 'U1', 'Flat', '', '', '']],
      context,
    );
    expect(issuesOf(results[0]!)).toEqual([
      { field: 'stateCode', code: 'unknown_state', message: '"Nairobi" is not a Nigerian state.' },
    ]);
  });

  it('reports every problem in a row, not just the first', () => {
    // PROP-4 asks for row-level error reporting. Fixing a spreadsheet one error
    // per upload is how an agency gives up and goes back to the spreadsheet.
    const { results } = validateRows(
      headers,
      [['', 'Castle', 'Addr', 'Atlantis', '', '', '', 'Spaceship', 'Levitating', 'three', 'lots']],
      context,
    );
    const codes = issuesOf(results[0]!).map((i) => `${i.field}:${i.code}`);
    expect(codes).toContain('propertyName:required');
    expect(codes).toContain('unitLabel:required');
    expect(codes).toContain('propertyType:invalid_enum');
    expect(codes).toContain('unitType:invalid_enum');
    expect(codes).toContain('unitStatus:invalid_enum');
    expect(codes).toContain('stateCode:unknown_state');
    expect(codes).toContain('bedrooms:invalid_number');
    expect(codes).toContain('askingRentKobo:invalid_amount');
    expect(issuesOf(results[0]!).length).toBeGreaterThanOrEqual(8);
  });

  it('names the agency own column in the message', () => {
    const { results } = validateRows(
      headers,
      [['A', 'Residential', 'Addr', 'LA', '', '', 'U1', 'Flat', '', '', 'abc']],
      context,
    );
    expect(issuesOf(results[0]!)[0]?.message).toContain('Rent p.a.');
  });

  it('says which column to add when one is missing entirely', () => {
    const { results } = validateRows(['Property Name'], [['Bola Court']], context);
    const messages = issuesOf(results[0]!).map((i) => i.message);
    expect(messages.some((m) => m.includes('No column found for unitLabel'))).toBe(true);
    expect(messages.some((m) => m.includes('Add a "unit"'))).toBe(true);
  });

  it('flags a unit label repeated within the same property', () => {
    const rows = [
      ['Bola Court', 'Residential', 'Addr', 'LA', '', '', 'Flat 1', 'Flat', '', '', ''],
      ['Bola Court', 'Residential', 'Addr', 'LA', '', '', 'Flat 1', 'Flat', '', '', ''],
    ];
    const { results } = validateRows(headers, rows, context);
    expect(results[0]!.status).toBe('valid');
    expect(issuesOf(results[1]!).map((i) => i.code)).toEqual(['duplicate']);
  });

  it('allows the same unit label in different properties', () => {
    const rows = [
      ['Bola Court', 'Residential', 'Addr', 'LA', '', '', 'Flat 1', 'Flat', '', '', ''],
      ['Chike Plaza', 'Commercial', 'Addr', 'LA', '', '', 'Flat 1', 'Flat', '', '', ''],
    ];
    const { results } = validateRows(headers, rows, context);
    expect(results.every((r) => r.status === 'valid')).toBe(true);
  });

  it('defaults status to vacant when the column is absent', () => {
    const { results } = validateRows(
      ['Property Name', 'Property Type', 'Address', 'State', 'Unit', 'Unit Type'],
      [['A', 'Residential', 'Addr', 'LA', 'U1', 'Flat']],
      context,
    );
    expect(valid(results[0]!).unitStatus).toBe('vacant');
  });

  it('maps the informal type words agencies use', () => {
    const { results } = validateRows(
      headers,
      [
        ['A', 'Residence', 'Addr', 'LA', '', '', 'U1', 'Self Contained', 'Let', '', ''],
        ['B', 'Plot', 'Addr', 'LA', '', '', 'U2', 'Store', 'Repairs', '', ''],
      ],
      context,
    );
    expect(valid(results[0]!)).toMatchObject({
      propertyType: 'residential',
      unitType: 'self_contained',
      unitStatus: 'occupied',
    });
    expect(valid(results[1]!)).toMatchObject({
      propertyType: 'land',
      unitType: 'shop',
      unitStatus: 'under_maintenance',
    });
  });
});

describe('dry-run summary', () => {
  it('counts properties and units separately so the agency sees what will be created', () => {
    const rows = [
      ['Bola Court', 'Residential', 'Addr', 'LA', '', '', 'Flat 1', 'Flat', '', '', '1000000'],
      ['Bola Court', 'Residential', 'Addr', 'LA', '', '', 'Flat 2', 'Flat', '', '', '1000000'],
      ['Chike Plaza', 'Commercial', 'Addr', 'LA', '', '', 'Shop A', 'Shop', '', '', '450000'],
      ['', 'Residential', 'Addr', 'LA', '', '', 'Flat 9', 'Flat', '', '', ''],
    ];
    const { mapping, results } = validateRows([...headers, 'Service Charge'], rows, context);
    const summary = summarise(mapping, results);
    expect(summary).toMatchObject({
      total: 4,
      valid: 3,
      invalid: 1,
      properties: 2,
      units: 3,
      unmappedHeaders: ['Service Charge'],
    });
  });
});
