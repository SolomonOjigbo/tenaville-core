/**
 * Spreadsheet import for properties and units (PROP-4).
 *
 * Agencies arrive with a spreadsheet, not an API. The PRD's activation target
 * is 10+ units imported within 7 days of signup (§4.4), and the risk table
 * names error-prone migration as the reason agencies fail to switch at all. So
 * this is a product surface, not a utility: it reports *every* problem in a
 * row, names the column the agency used, and never guesses.
 *
 * One row describes one unit, with its property's columns repeated — the shape
 * agency spreadsheets actually take. Rows are grouped by property afterwards.
 *
 * No I/O here: this layer turns raw cells into either a validated row or a
 * list of issues, so the rules are testable without a database or a file.
 */

import { MoneyParseError, parseNaira, type Kobo } from '@tenaville/money';

export interface ImportIssue {
  /** The canonical field, so the UI can highlight it. */
  readonly field: string;
  /** Stable machine code, for counting and for translation. */
  readonly code:
    | 'required'
    | 'unknown_state'
    | 'invalid_amount'
    | 'invalid_number'
    | 'invalid_enum'
    | 'too_long'
    | 'duplicate';
  /** Written for the person fixing the spreadsheet, naming their own column. */
  readonly message: string;
}

export interface ParsedPropertyRow {
  readonly propertyName: string;
  readonly propertyReference: string | null;
  readonly propertyType: PropertyType;
  readonly addressLine: string;
  readonly stateCode: string;
  readonly lga: string | null;
  readonly landlordName: string | null;
  readonly unitLabel: string;
  readonly unitType: UnitType;
  readonly unitStatus: UnitStatus;
  readonly bedrooms: number | null;
  readonly bathrooms: number | null;
  readonly askingRentKobo: Kobo | null;
}

export type RowResult =
  | { readonly rowNumber: number; readonly status: 'valid'; readonly row: ParsedPropertyRow }
  | { readonly rowNumber: number; readonly status: 'invalid'; readonly issues: ImportIssue[] };

export type PropertyType = 'residential' | 'commercial' | 'mixed_use' | 'estate' | 'land';
export type UnitType =
  | 'flat'
  | 'self_contained'
  | 'room'
  | 'duplex'
  | 'bungalow'
  | 'shop'
  | 'office'
  | 'warehouse'
  | 'other';
export type UnitStatus = 'vacant' | 'occupied' | 'reserved' | 'under_maintenance' | 'inactive';

/**
 * Accepted header spellings per canonical field.
 *
 * Headers are compared after normalising case, punctuation and spacing, so
 * "Property Name", "property_name" and "PROPERTY NAME" all match. The lists
 * cover the wordings seen in Nigerian agency spreadsheets — "flat no",
 * "shop no", "rent p.a." — because requiring an exact template is how an
 * import gets abandoned in favour of carrying on with the spreadsheet.
 */
const HEADER_SYNONYMS: Record<string, readonly string[]> = {
  propertyName: ['property name', 'property', 'building', 'building name', 'estate name'],
  propertyReference: ['property reference', 'property ref', 'property code', 'ref'],
  propertyType: ['property type', 'type of property', 'category'],
  addressLine: ['address', 'address line', 'street', 'street address', 'location'],
  stateCode: ['state'],
  lga: ['lga', 'local government', 'local government area', 'council', 'area'],
  landlordName: ['landlord', 'landlord name', 'owner', 'owner name'],
  unitLabel: [
    'unit',
    'unit label',
    'unit name',
    'flat',
    'flat no',
    'flat number',
    'shop no',
    'room no',
  ],
  unitType: ['unit type', 'type of unit', 'accommodation type'],
  unitStatus: ['status', 'unit status', 'occupancy', 'occupancy status'],
  bedrooms: ['bedrooms', 'bedroom', 'beds', 'no of bedrooms', 'bedroom count'],
  bathrooms: ['bathrooms', 'bathroom', 'baths', 'no of bathrooms', 'toilets'],
  askingRentKobo: [
    'rent',
    'asking rent',
    'annual rent',
    'rent per annum',
    'rent p.a.',
    'rent pa',
    'price',
  ],
};

const PROPERTY_TYPE_SYNONYMS: Record<string, PropertyType> = {
  residential: 'residential',
  residence: 'residential',
  house: 'residential',
  commercial: 'commercial',
  business: 'commercial',
  'mixed use': 'mixed_use',
  mixed: 'mixed_use',
  estate: 'estate',
  land: 'land',
  plot: 'land',
};

const UNIT_TYPE_SYNONYMS: Record<string, UnitType> = {
  flat: 'flat',
  apartment: 'flat',
  'self contained': 'self_contained',
  'self con': 'self_contained',
  selfcon: 'self_contained',
  room: 'room',
  'room and parlour': 'room',
  duplex: 'duplex',
  bungalow: 'bungalow',
  shop: 'shop',
  store: 'shop',
  office: 'office',
  warehouse: 'warehouse',
  other: 'other',
};

const UNIT_STATUS_SYNONYMS: Record<string, UnitStatus> = {
  vacant: 'vacant',
  empty: 'vacant',
  available: 'vacant',
  occupied: 'occupied',
  let: 'occupied',
  rented: 'occupied',
  reserved: 'reserved',
  'under maintenance': 'under_maintenance',
  maintenance: 'under_maintenance',
  repairs: 'under_maintenance',
  inactive: 'inactive',
  'not lettable': 'inactive',
};

/**
 * Normalise a header or cell for comparison: lowercase, single-spaced, and
 * stripped of punctuation.
 *
 * Separators become spaces, so "Rent p.a." and "Rent P.A." both normalise to
 * "rent p a" while "Rent pa" becomes "rent pa" — which is why the synonym
 * lists carry both spellings rather than relying on normalisation to unify
 * them.
 */
export const normaliseKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[._/\\-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export interface HeaderMapping {
  /** canonical field -> index in the row array. */
  readonly columns: Readonly<Record<string, number>>;
  /** The agency's own header text per canonical field, for error messages. */
  readonly sourceHeaders: Readonly<Record<string, string>>;
  /** Headers we could not place. Reported, never silently dropped. */
  readonly unmapped: readonly string[];
}

export const mapHeaders = (headers: readonly string[]): HeaderMapping => {
  const columns: Record<string, number> = {};
  const sourceHeaders: Record<string, string> = {};
  const unmapped: string[] = [];

  headers.forEach((header, index) => {
    const normalised = normaliseKey(header);
    const field = Object.keys(HEADER_SYNONYMS).find((candidate) => {
      const synonyms = HEADER_SYNONYMS[candidate] ?? [];
      return synonyms.some((s) => normaliseKey(s) === normalised);
    });
    // First column wins on a duplicate header, and the duplicate is reported
    // rather than quietly overriding.
    if (field !== undefined && columns[field] === undefined) {
      columns[field] = index;
      sourceHeaders[field] = header;
    } else if (header.trim() !== '') {
      unmapped.push(header);
    }
  });

  return { columns, sourceHeaders, unmapped };
};

/** Fields without which a row cannot create anything meaningful. */
export const REQUIRED_FIELDS = [
  'propertyName',
  'propertyType',
  'addressLine',
  'stateCode',
  'unitLabel',
  'unitType',
] as const;

export interface ValidationContext {
  /** Valid state codes, e.g. 'LA'. Supplied by the caller from the database. */
  readonly stateCodes: readonly string[];
  /** Lowercased state name -> code, so a spreadsheet may say "Lagos". */
  readonly stateNames: Readonly<Record<string, string>>;
}

export const validateRows = (
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  context: ValidationContext,
): { readonly mapping: HeaderMapping; readonly results: RowResult[] } => {
  const mapping = mapHeaders(headers);
  const seenUnits = new Set<string>();

  const results = rows.map((cells, index): RowResult => {
    // Row 1 is the header, so data begins at 2 — the number the agency sees in
    // their spreadsheet.
    const rowNumber = index + 2;
    const issues: ImportIssue[] = [];

    const raw = (field: string): string => {
      const column = mapping.columns[field];
      if (column === undefined) return '';
      return (cells[column] ?? '').trim();
    };
    const label = (field: string): string => mapping.sourceHeaders[field] ?? field;

    for (const field of REQUIRED_FIELDS) {
      if (raw(field) === '') {
        issues.push({
          field,
          code: 'required',
          message:
            mapping.columns[field] === undefined
              ? `No column found for ${field}. Add a "${HEADER_SYNONYMS[field]?.[0] ?? field}" column.`
              : `"${label(field)}" is empty.`,
        });
      }
    }

    const propertyType = PROPERTY_TYPE_SYNONYMS[normaliseKey(raw('propertyType'))];
    if (raw('propertyType') !== '' && propertyType === undefined) {
      issues.push({
        field: 'propertyType',
        code: 'invalid_enum',
        message: `"${raw('propertyType')}" is not a property type. Use one of: residential, commercial, mixed use, estate, land.`,
      });
    }

    const unitType = UNIT_TYPE_SYNONYMS[normaliseKey(raw('unitType'))];
    if (raw('unitType') !== '' && unitType === undefined) {
      issues.push({
        field: 'unitType',
        code: 'invalid_enum',
        message: `"${raw('unitType')}" is not a unit type. Use one of: flat, self contained, room, duplex, bungalow, shop, office, warehouse, other.`,
      });
    }

    let unitStatus: UnitStatus = 'vacant';
    if (raw('unitStatus') !== '') {
      const parsed = UNIT_STATUS_SYNONYMS[normaliseKey(raw('unitStatus'))];
      if (parsed === undefined) {
        issues.push({
          field: 'unitStatus',
          code: 'invalid_enum',
          message: `"${raw('unitStatus')}" is not a status. Use vacant, occupied, reserved, under maintenance or inactive.`,
        });
      } else {
        unitStatus = parsed;
      }
    }

    // A state may be given as a code or a name; both are what agencies write.
    let stateCode = '';
    const stateInput = raw('stateCode');
    if (stateInput !== '') {
      const upper = stateInput.toUpperCase();
      if (context.stateCodes.includes(upper)) {
        stateCode = upper;
      } else {
        const byName = context.stateNames[stateInput.toLowerCase().trim()];
        if (byName === undefined) {
          issues.push({
            field: 'stateCode',
            code: 'unknown_state',
            message: `"${stateInput}" is not a Nigerian state.`,
          });
        } else {
          stateCode = byName;
        }
      }
    }

    const parseCount = (field: string): number | null => {
      const value = raw(field);
      if (value === '') return null;
      if (!/^\d{1,2}$/.test(value)) {
        issues.push({
          field,
          code: 'invalid_number',
          message: `"${label(field)}" must be a whole number, not "${value}".`,
        });
        return null;
      }
      return Number(value);
    };

    const bedrooms = parseCount('bedrooms');
    const bathrooms = parseCount('bathrooms');

    let askingRentKobo: Kobo | null = null;
    const rentInput = raw('askingRentKobo');
    if (rentInput !== '') {
      try {
        askingRentKobo = parseNaira(rentInput);
        if (askingRentKobo < 0n) {
          issues.push({
            field: 'askingRentKobo',
            code: 'invalid_amount',
            message: `"${label('askingRentKobo')}" cannot be negative.`,
          });
        }
      } catch (error) {
        issues.push({
          field: 'askingRentKobo',
          code: 'invalid_amount',
          message:
            error instanceof MoneyParseError
              ? `"${label('askingRentKobo')}": ${rentInput} is not an amount in naira.`
              : `"${label('askingRentKobo')}" could not be read.`,
        });
      }
    }

    // A unit label must be unique within its property, or the import would
    // create two "Flat 1" in one building (the units table enforces this too).
    const identity = `${normaliseKey(raw('propertyName'))}::${normaliseKey(raw('unitLabel'))}`;
    if (raw('propertyName') !== '' && raw('unitLabel') !== '') {
      if (seenUnits.has(identity)) {
        issues.push({
          field: 'unitLabel',
          code: 'duplicate',
          message: `"${raw('unitLabel')}" appears more than once for ${raw('propertyName')}.`,
        });
      } else {
        seenUnits.add(identity);
      }
    }

    if (issues.length > 0) {
      return { rowNumber, status: 'invalid', issues };
    }

    return {
      rowNumber,
      status: 'valid',
      row: {
        propertyName: raw('propertyName'),
        propertyReference: raw('propertyReference') === '' ? null : raw('propertyReference'),
        // Safe: a missing or invalid value produced an issue, so we did not get here.
        propertyType: propertyType as PropertyType,
        addressLine: raw('addressLine'),
        stateCode,
        lga: raw('lga') === '' ? null : raw('lga'),
        landlordName: raw('landlordName') === '' ? null : raw('landlordName'),
        unitLabel: raw('unitLabel'),
        unitType: unitType as UnitType,
        unitStatus,
        bedrooms,
        bathrooms,
        askingRentKobo,
      },
    };
  });

  return { mapping, results };
};

export interface ImportSummary {
  readonly total: number;
  readonly valid: number;
  readonly invalid: number;
  readonly properties: number;
  readonly units: number;
  readonly unmappedHeaders: readonly string[];
}

/** What a dry run shows before anything is created (MIG-3). */
export const summarise = (mapping: HeaderMapping, results: readonly RowResult[]): ImportSummary => {
  const valid = results.filter((r) => r.status === 'valid');
  const properties = new Set(
    valid.map((r) => normaliseKey((r as { row: ParsedPropertyRow }).row.propertyName)),
  );
  return {
    total: results.length,
    valid: valid.length,
    invalid: results.length - valid.length,
    properties: properties.size,
    units: valid.length,
    unmappedHeaders: mapping.unmapped,
  };
};
