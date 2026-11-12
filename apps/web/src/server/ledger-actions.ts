'use server';

import { revalidatePath } from 'next/cache';

import { recordRemittance } from '@tenaville/core/ledger';
import { MoneyParseError, parseNaira, toTransport } from '@tenaville/money';

import { isPaymentMethod, type PaymentMethod } from '../lib/payments';
import { errorMessage, fieldErrorsFrom } from '../lib/form-errors';
import { field } from './form-fields';
import { currentViewer, supabaseForRequest } from './session';
import type { ActionResult } from './auth-actions';

/**
 * Recording money paid to a landlord (LEDGER-1).
 *
 * The core use case delegates to the database function, which writes the
 * remittance and its ledger debit together and re-checks the role there.
 */
export const recordRemittanceAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('ledger.write')) {
    return { error: 'Your role cannot record remittances.' };
  }

  const landlordId = field(form, 'landlordId').trim();
  const amountText = field(form, 'amount').trim();
  const paidOn = field(form, 'paidOn').trim();
  const method = field(form, 'method');
  const reference = field(form, 'reference').trim();

  const fieldErrors: Record<string, string> = {};
  if (landlordId === '') fieldErrors.landlordId = 'The landlord is missing';
  if (!isPaymentMethod(method)) fieldErrors.method = 'Choose how the money was paid';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) fieldErrors.paidOn = 'Use a date in the form 2026-03-01';

  let amountKobo: string | null = null;
  if (amountText === '') {
    fieldErrors.amount = 'Enter the amount paid';
  } else {
    try {
      amountKobo = toTransport(parseNaira(amountText));
    } catch (error) {
      fieldErrors.amount =
        error instanceof MoneyParseError
          ? 'Enter a naira amount, for example 250,000.00'
          : 'That amount is too large to record';
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await supabaseForRequest();

  try {
    await recordRemittance(supabase, {
      organisationId: viewer.organisationId,
      landlordId,
      amountKobo: amountKobo as string,
      paidOn,
      method: method as PaymentMethod,
      ...(reference === '' ? {} : { reference }),
    });
  } catch (error) {
    const mapped = fieldErrorsFrom(error);
    if (mapped !== null) return { fieldErrors: mapped };
    return { error: errorMessage(error, 'Could not record the remittance') };
  }

  revalidatePath('/ledger');
  revalidatePath(`/ledger/${landlordId}`);
  return { message: 'Remittance recorded against the ledger.' };
};
