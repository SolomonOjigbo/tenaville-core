/**
 * Minimal CSV reader for migration imports.
 *
 * Spreadsheet exports quote fields containing commas, newlines or doubled
 * quotes; splitting on commas breaks those rows without warning. This keeps
 * the parser small and explicit so import errors point at the file, not at an
 * unexplained missing row.
 */
export interface ParsedCsv {
  readonly headers: string[];
  readonly rows: string[][];
}

export class CsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvError';
  }
}

const parseRecords = (text: string): string[][] => {
  const records: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.trim() === '') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      records.push(row);
      row = [];
      field = '';
    } else if (char === '\r') {
      if (next !== '\n') {
        row.push(field);
        records.push(row);
        row = [];
        field = '';
      }
    } else {
      field += char;
    }
  }

  if (quoted) throw new CsvError('The file has an unclosed quoted field.');
  row.push(field);
  records.push(row);
  return records;
};

export const parseCsv = (text: string): ParsedCsv => {
  const clean = text.replace(/^\uFEFF/, '');
  const records = parseRecords(clean).filter((record) =>
    record.some((value) => value.trim() !== ''),
  );

  if (records.length === 0) throw new CsvError('The file is empty.');

  const headers = (records[0] ?? []).map((header) => header.trim());
  if (headers.every((header) => header === '')) throw new CsvError('The file has no header row.');

  const rows = records.slice(1).filter((record) => record.some((value) => value.trim() !== ''));

  return { headers, rows };
};
