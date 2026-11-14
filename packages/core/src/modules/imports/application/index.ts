import type { Json, UserClient } from '@tenaville/db';

import { parseCsv, CsvError, type ParsedCsv } from '../domain/csv';
import {
  mapTenantLeaseHeaders,
  validateTenantLeaseRows,
  type TenantLeaseResult,
} from '../domain/tenant-lease';
import {
  mapOpeningBalanceHeaders,
  validateOpeningBalanceRows,
  type OpeningBalanceResult,
} from '../domain/opening-balances';

export interface ImportSummary {
  readonly total: number;
  readonly valid: number;
  readonly invalid: number;
  readonly unmapped: readonly string[];
}

export interface ValidatedImport<T> {
  readonly batchId: string;
  readonly summary: ImportSummary;
  readonly results: readonly T[];
}

const summarise = (
  results: readonly { status: string }[],
  unmapped: readonly string[],
): ImportSummary => ({
  total: results.length,
  valid: results.filter((result) => result.status === 'valid').length,
  invalid: results.filter((result) => result.status === 'invalid').length,
  unmapped,
});

const createBatch = async (
  client: UserClient,
  params: {
    organisationId: string;
    kind: 'tenants_leases' | 'opening_balances';
    fileName: string;
    headers: readonly string[];
    summary: ImportSummary;
    cutoverOn?: string;
  },
): Promise<string> => {
  const { data, error } = await client
    .from('import_batches')
    .insert({
      organisation_id: params.organisationId,
      kind: params.kind,
      status: params.summary.invalid === 0 ? 'validated' : 'draft',
      file_name: params.fileName,
      source_headers: [...params.headers],
      row_count: params.summary.total,
      valid_count: params.summary.valid,
      invalid_count: params.summary.invalid,
      validated_at: new Date().toISOString(),
      cutover_on: params.cutoverOn ?? null,
    })
    .select('id')
    .single();

  if (error !== null) throw new Error(`could not create import batch: ${error.message}`);
  return data.id;
};

const storeRows = async (
  client: UserClient,
  organisationId: string,
  batchId: string,
  rows: readonly {
    rowNumber: number;
    status: 'valid' | 'invalid';
    raw: NonNullable<Json>;
    issues?: readonly { field: string; code: string; message: string }[];
  }[],
): Promise<void> => {
  if (rows.length === 0) return;
  const { error } = await client.from('import_rows').insert(
    rows.map((row) => ({
      organisation_id: organisationId,
      batch_id: batchId,
      row_number: row.rowNumber,
      raw: row.raw,
      status: row.status,
      errors:
        row.status === 'invalid'
          ? (row.issues ?? []).map((issue) => ({
              field: issue.field,
              code: issue.code,
              message: issue.message,
            }))
          : [],
    })),
  );
  if (error !== null) throw new Error(`could not store import rows: ${error.message}`);
};

export const validateTenantLeaseImport = async (
  client: UserClient,
  params: {
    organisationId: string;
    fileName: string;
    headers: readonly string[];
    rows: readonly (readonly string[])[];
  },
): Promise<ValidatedImport<TenantLeaseResult>> => {
  const { missing } = mapTenantLeaseHeaders(params.headers);
  if (missing.length > 0) {
    throw new CsvError(`Missing required columns: ${missing.join(', ')}`);
  }

  const [{ data: units, error: unitsError }, { data: leases, error: leasesError }] =
    await Promise.all([
      client
        .from('units')
        .select('label, properties!inner(name)')
        .eq('organisation_id', params.organisationId)
        .is('archived_at', null),
      client.from('leases').select('reference').eq('organisation_id', params.organisationId),
    ]);

  if (unitsError !== null) throw new Error(`could not load units: ${unitsError.message}`);
  if (leasesError !== null) throw new Error(`could not load leases: ${leasesError.message}`);

  const results = validateTenantLeaseRows(params.headers, params.rows, {
    units: (units ?? []).map((unit) => ({
      propertyName: unit.properties?.name ?? '',
      unitLabel: unit.label,
    })),
    leaseReferences: (leases ?? [])
      .map((lease) => lease.reference)
      .filter((reference): reference is string => reference !== null),
  });
  const summary = summarise(results, []);
  const batchId = await createBatch(client, {
    organisationId: params.organisationId,
    kind: 'tenants_leases',
    fileName: params.fileName,
    headers: params.headers,
    summary,
  });

  await storeRows(
    client,
    params.organisationId,
    batchId,
    results.map((result) => ({
      rowNumber: result.rowNumber,
      status: result.status,
      raw:
        result.status === 'valid'
          ? ({ ...result.row } as NonNullable<Json>)
          : { cells: [...(params.rows[result.rowNumber - 2] ?? [])] },
      ...(result.status === 'invalid' ? { issues: result.issues } : {}),
    })),
  );

  return { batchId, summary, results };
};

export const validateOpeningBalanceImport = async (
  client: UserClient,
  params: {
    organisationId: string;
    fileName: string;
    headers: readonly string[];
    rows: readonly (readonly string[])[];
    cutoverOn: string;
  },
): Promise<ValidatedImport<OpeningBalanceResult>> => {
  const { missing } = mapOpeningBalanceHeaders(params.headers);
  if (missing.length > 0) throw new CsvError(`Missing required columns: ${missing.join(', ')}`);

  const { data: organisation, error: orgError } = await client
    .from('organisations')
    .select('opening_balances_confirmed_at')
    .eq('id', params.organisationId)
    .maybeSingle();

  if (orgError !== null) throw new Error(`could not load organisation: ${orgError.message}`);
  if (organisation === null) throw new Error('That organisation was not found.');
  if (organisation.opening_balances_confirmed_at !== null) {
    throw new Error('Opening balances have already been confirmed for this organisation.');
  }

  const [{ data: leases, error: leaseError }, { data: landlords, error: landlordError }] =
    await Promise.all([
      client.from('leases').select('reference').eq('organisation_id', params.organisationId),
      client.from('landlords').select('display_name').eq('organisation_id', params.organisationId),
    ]);

  if (leaseError !== null) throw new Error(`could not load leases: ${leaseError.message}`);
  if (landlordError !== null) {
    throw new Error(`could not load landlords: ${landlordError.message}`);
  }

  const results = validateOpeningBalanceRows(params.headers, params.rows, {
    leaseReferences: (leases ?? [])
      .map((lease) => lease.reference)
      .filter((reference): reference is string => reference !== null),
    landlords: (landlords ?? []).map((landlord) => landlord.display_name),
  });
  const summary = summarise(results, []);
  const batchId = await createBatch(client, {
    organisationId: params.organisationId,
    kind: 'opening_balances',
    fileName: params.fileName,
    headers: params.headers,
    summary,
    cutoverOn: params.cutoverOn,
  });

  await storeRows(
    client,
    params.organisationId,
    batchId,
    results.map((result) => ({
      rowNumber: result.rowNumber,
      status: result.status,
      raw:
        result.status === 'valid'
          ? ({ ...result.row } as NonNullable<Json>)
          : { cells: [...(params.rows[result.rowNumber - 2] ?? [])] },
      ...(result.status === 'invalid' ? { issues: result.issues } : {}),
    })),
  );

  return { batchId, summary, results };
};

export const applyImportBatch = async (
  client: UserClient,
  batchId: string,
): Promise<{ message: string }> => {
  const { data: batch, error } = await client
    .from('import_batches')
    .select('kind')
    .eq('id', batchId)
    .maybeSingle();

  if (error !== null) throw new Error(`could not load import: ${error.message}`);
  if (batch === null) throw new Error('That import batch was not found.');

  if (batch.kind === 'properties_units') {
    const { error: rpcError } = await client.rpc('apply_property_import', {
      target_batch_id: batchId,
    });
    if (rpcError !== null) throw new Error(`could not apply import: ${rpcError.message}`);
  } else if (batch.kind === 'tenants_leases') {
    const { error: rpcError } = await client.rpc('apply_tenant_lease_import', {
      target_batch_id: batchId,
    });
    if (rpcError !== null) throw new Error(`could not apply import: ${rpcError.message}`);
  } else if (batch.kind === 'opening_balances') {
    const { error: rpcError } = await client.rpc('apply_opening_balance_import', {
      target_batch_id: batchId,
    });
    if (rpcError !== null) throw new Error(`could not apply import: ${rpcError.message}`);
  } else {
    throw new Error(`Import kind ${batch.kind} is not supported yet.`);
  }

  return { message: 'Import applied.' };
};

export const rollbackImportBatch = async (
  client: UserClient,
  batchId: string,
): Promise<{ message: string }> => {
  const { error } = await client.rpc('rollback_import_batch', { target_batch_id: batchId });
  if (error !== null) throw new Error(`could not roll back import: ${error.message}`);
  return { message: 'Import rolled back.' };
};

export { parseCsv, CsvError, type ParsedCsv };
export type { ImportIssue, TenantLeaseResult } from '../domain/tenant-lease';
export type { OpeningBalanceResult } from '../domain/opening-balances';
