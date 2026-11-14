'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  CsvError,
  applyImportBatch,
  parseCsv,
  rollbackImportBatch,
  validateOpeningBalanceImport,
  validateTenantLeaseImport,
} from '@tenaville/core/imports';
import { validatePropertyImport } from '@tenaville/core/properties';

import { errorMessage } from '../lib/form-errors';
import { field } from './form-fields';
import { currentViewer, supabaseForRequest } from './session';
import type { ActionResult } from './auth-actions';

const MAX_BYTES = 5 * 1024 * 1024;

export const createImportAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('org.update')) {
    return { error: 'Only an owner or administrator can import data.' };
  }

  const kind = field(form, 'kind');
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { fieldErrors: { file: 'Choose a CSV file to import' } };
  }
  if (file.size > MAX_BYTES) {
    return { fieldErrors: { file: 'CSV files must be 5 MB or smaller' } };
  }

  let csv: ReturnType<typeof parseCsv>;
  try {
    csv = parseCsv(await file.text());
  } catch (error) {
    return { error: errorMessage(error, 'Could not read the CSV file') };
  }

  const supabase = await supabaseForRequest();

  let batchId: string | null = null;
  try {
    if (kind === 'properties_units') {
      const validated = await validatePropertyImport(supabase, {
        organisationId: viewer.organisationId,
        fileName: file.name,
        headers: csv.headers,
        rows: csv.rows,
      });
      batchId = validated.batchId;
    } else if (kind === 'tenants_leases') {
      const validated = await validateTenantLeaseImport(supabase, {
        organisationId: viewer.organisationId,
        fileName: file.name,
        headers: csv.headers,
        rows: csv.rows,
      });
      batchId = validated.batchId;
    } else if (kind === 'opening_balances') {
      const cutoverOn = field(form, 'cutoverOn').trim();
      if (cutoverOn === '') {
        return { fieldErrors: { cutoverOn: 'Choose the cutover date' } };
      }
      const validated = await validateOpeningBalanceImport(supabase, {
        organisationId: viewer.organisationId,
        fileName: file.name,
        headers: csv.headers,
        rows: csv.rows,
        cutoverOn,
      });
      batchId = validated.batchId;
    } else {
      return { error: 'Choose a supported import type.' };
    }
  } catch (error) {
    if (error instanceof CsvError) return { error: error.message };
    return { error: errorMessage(error, 'Could not validate the import') };
  }

  if (batchId === null) return { error: 'The import did not create a batch.' };
  revalidatePath('/imports');
  redirect(`/imports/${batchId}`);
};

export const applyImportAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('org.update')) {
    return { error: 'Only an owner or administrator can apply an import.' };
  }

  const batchId = field(form, 'batchId').trim();
  try {
    await applyImportBatch(await supabaseForRequest(), batchId);
  } catch (error) {
    return { error: errorMessage(error, 'Could not apply the import') };
  }

  revalidatePath('/imports');
  revalidatePath(`/imports/${batchId}`);
  revalidatePath('/properties');
  revalidatePath('/tenants');
  revalidatePath('/leases');
  revalidatePath('/rent');
  revalidatePath('/ledger');
  return { message: 'Import applied.' };
};

export const rollbackImportAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('org.update')) {
    return { error: 'Only an owner or administrator can roll back an import.' };
  }

  const batchId = field(form, 'batchId').trim();
  try {
    await rollbackImportBatch(await supabaseForRequest(), batchId);
  } catch (error) {
    return { error: errorMessage(error, 'Could not roll back the import') };
  }

  revalidatePath('/imports');
  revalidatePath(`/imports/${batchId}`);
  revalidatePath('/properties');
  revalidatePath('/tenants');
  revalidatePath('/leases');
  revalidatePath('/rent');
  revalidatePath('/ledger');
  return { message: 'Import rolled back.' };
};
