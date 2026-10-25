import type { UserClient } from '@tenaville/db';

import {
  summarise,
  validateRows,
  type ImportSummary,
  type RowResult,
  type ValidationContext,
} from '../domain/import.js';

/**
 * Validate an uploaded spreadsheet and store it as a dry run (PROP-4, MIG-3).
 *
 * Nothing is created. The rows are stored with their validation results so the
 * agency can see exactly what will happen, fix their spreadsheet, and only then
 * apply. The PRD names error-prone migration as the reason agencies fail to
 * switch at all, so showing the whole picture first is the point.
 *
 * The state list comes from the database rather than a constant in code, so
 * there is one source of truth for what a Nigerian state is.
 */
export const validatePropertyImport = async (
  client: UserClient,
  params: {
    organisationId: string;
    fileName: string;
    headers: readonly string[];
    rows: readonly (readonly string[])[];
  },
): Promise<{ batchId: string; summary: ImportSummary; results: RowResult[] }> => {
  const { data: states, error: statesError } = await client
    .from('nigerian_states')
    .select('code, name');

  if (statesError !== null) {
    throw new Error(`could not load states: ${statesError.message}`);
  }

  const context: ValidationContext = {
    stateCodes: states.map((s) => s.code),
    stateNames: Object.fromEntries(states.map((s) => [s.name.toLowerCase(), s.code])),
  };

  const { mapping, results } = validateRows(params.headers, params.rows, context);
  const summary = summarise(mapping, results);

  const { data: batch, error: batchError } = await client
    .from('import_batches')
    .insert({
      organisation_id: params.organisationId,
      kind: 'properties_units',
      // 'validated' only when every row is usable: apply_property_import
      // refuses a batch with invalid rows, and a half-applicable import is
      // a spreadsheet to fix, not a state to sit in.
      status: summary.invalid === 0 ? 'validated' : 'draft',
      file_name: params.fileName,
      source_headers: [...params.headers],
      row_count: summary.total,
      valid_count: summary.valid,
      invalid_count: summary.invalid,
      validated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (batchError !== null) {
    throw new Error(`could not create import batch: ${batchError.message}`);
  }

  const rowsToInsert = results.map((result) => ({
    organisation_id: params.organisationId,
    batch_id: batch.id,
    row_number: result.rowNumber,
    // The parsed row for a valid result, so apply works from validated data
    // rather than re-parsing; the raw cells for an invalid one, so support can
    // see what the agency actually sent.
    raw:
      result.status === 'valid'
        ? {
            propertyName: result.row.propertyName,
            propertyReference: result.row.propertyReference,
            propertyType: result.row.propertyType,
            addressLine: result.row.addressLine,
            stateCode: result.row.stateCode,
            lga: result.row.lga,
            landlordName: result.row.landlordName,
            unitLabel: result.row.unitLabel,
            unitType: result.row.unitType,
            unitStatus: result.row.unitStatus,
            bedrooms: result.row.bedrooms,
            bathrooms: result.row.bathrooms,
            // Kobo crosses as a string: the apply function casts it to bigint,
            // and a JSON number would risk precision on the way.
            askingRentKobo:
              result.row.askingRentKobo === null ? null : result.row.askingRentKobo.toString(),
          }
        : { cells: [...(params.rows[result.rowNumber - 2] ?? [])] },
    status: result.status,
    errors:
      result.status === 'invalid'
        ? result.issues.map((issue) => ({
            field: issue.field,
            code: issue.code,
            message: issue.message,
          }))
        : [],
  }));

  if (rowsToInsert.length > 0) {
    const { error: rowsError } = await client.from('import_rows').insert(rowsToInsert);
    if (rowsError !== null) {
      throw new Error(`could not store import rows: ${rowsError.message}`);
    }
  }

  return { batchId: batch.id, summary, results };
};

/**
 * Apply a validated batch (PROP-4).
 *
 * The work happens in `apply_property_import` so that creating landlords,
 * properties and units is one transaction — a half-applied import would leave
 * an agency reconciling by hand, which is what they came here to stop doing.
 * The function refuses a batch that is not validated, or that has invalid rows,
 * or that has already been applied.
 */
export const applyPropertyImport = async (
  client: UserClient,
  batchId: string,
): Promise<{ propertiesCreated: number; unitsCreated: number; landlordsCreated: number }> => {
  const { data, error } = await client.rpc('apply_property_import', {
    target_batch_id: batchId,
  });

  if (error !== null) throw new Error(`could not apply import: ${error.message}`);

  const row = Array.isArray(data) ? data[0] : data;
  if (row === undefined || row === null) {
    throw new Error('apply_property_import returned no counts');
  }

  return {
    propertiesCreated: row.properties_created ?? 0,
    unitsCreated: row.units_created ?? 0,
    landlordsCreated: row.landlords_created ?? 0,
  };
};
