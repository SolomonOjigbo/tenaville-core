'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createStatement, issueStatement, reviewStatement } from '@tenaville/core/ledger';

import { errorMessage, fieldErrorsFrom } from '../lib/form-errors';
import { field } from './form-fields';
import { currentViewer, supabaseForRequest } from './session';
import type { ActionResult } from './auth-actions';

/**
 * Statement workflow (LEDGER-2, LEDGER-8).
 *
 * Creation redirects to the frozen snapshot; review and issue return a message
 * so the same page can refresh in place. All three delegate to the database
 * functions, which own the status machine and the role checks.
 */
export const createStatementAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('statement.issue')) {
    return { error: 'Your role cannot issue statements.' };
  }

  const landlordId = field(form, 'landlordId').trim();
  const periodStart = field(form, 'periodStart').trim();
  const periodEnd = field(form, 'periodEnd').trim();
  const supersedesId = field(form, 'supersedesId').trim();

  const supabase = await supabaseForRequest();

  let statementId: string;
  try {
    const created = await createStatement(supabase, {
      organisationId: viewer.organisationId,
      landlordId,
      periodStart,
      periodEnd,
      ...(supersedesId === '' ? {} : { supersedesStatementId: supersedesId }),
    });
    statementId = created.statementId;
  } catch (error) {
    const mapped = fieldErrorsFrom(error);
    if (mapped !== null) return { fieldErrors: mapped };
    return { error: errorMessage(error, 'Could not create the statement') };
  }

  revalidatePath('/ledger');
  revalidatePath(`/ledger/${landlordId}`);
  redirect(`/statements/${statementId}`);
};

export const reviewStatementAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('statement.issue')) {
    return { error: 'Your role cannot review statements.' };
  }

  const statementId = field(form, 'statementId').trim();
  if (statementId === '') return { error: 'The statement is missing.' };

  const supabase = await supabaseForRequest();

  try {
    await reviewStatement(supabase, statementId);
  } catch (error) {
    return { error: errorMessage(error, 'Could not review the statement') };
  }

  revalidatePath(`/statements/${statementId}`);
  revalidatePath('/ledger');
  return { message: 'Statement reviewed.' };
};

export const issueStatementAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('statement.issue')) {
    return { error: 'Your role cannot issue statements.' };
  }

  const statementId = field(form, 'statementId').trim();
  if (statementId === '') return { error: 'The statement is missing.' };

  const supabase = await supabaseForRequest();

  try {
    await issueStatement(supabase, statementId);
  } catch (error) {
    return { error: errorMessage(error, 'Could not issue the statement') };
  }

  revalidatePath(`/statements/${statementId}`);
  revalidatePath('/ledger');
  return { message: 'Statement issued. It is now immutable.' };
};
