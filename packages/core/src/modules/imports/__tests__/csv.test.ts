import { describe, expect, it } from 'vitest';

import { CsvError, parseCsv } from '../domain/csv';

describe('parseCsv', () => {
  it('handles quoted commas, doubled quotes and embedded newlines', () => {
    const csv =
      '\uFEFFname,address,notes\r\n"Bola Court","12 Kingsway, Ikoyi","He said ""hello""\nsecond line"\r\n';
    const parsed = parseCsv(csv);
    expect(parsed.headers).toEqual(['name', 'address', 'notes']);
    expect(parsed.rows).toEqual([
      ['Bola Court', '12 Kingsway, Ikoyi', 'He said "hello"\nsecond line'],
    ]);
  });

  it('drops blank records and trims headers', () => {
    const parsed = parseCsv(' Property Name , Unit \n\n Bola Court , Flat 1 \n');
    expect(parsed.headers).toEqual(['Property Name', 'Unit']);
    expect(parsed.rows).toEqual([[' Bola Court ', ' Flat 1 ']]);
  });

  it('rejects an unclosed quote', () => {
    expect(() => parseCsv('name,address\n"Bola Court,12 Kingsway')).toThrow(CsvError);
  });

  it('rejects an empty file', () => {
    expect(() => parseCsv(' \r\n ')).toThrow(CsvError);
  });
});
