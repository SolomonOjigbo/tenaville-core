'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { MoneyParseError, parseNaira, toSafeNumber } from '@tenaville/money';

import { isPaymentMethod, type PaymentMethod } from '../lib/payments';
import { currentViewer, supabaseForRequest } from './session';
import type { ActionResult } from './auth-actions';

/**
 * Recording and reversing payments (RENT-2, RENT-4, RENT-13).
 *
 * Both actions call the database RPCs rather than inserting rows. The RPC is
 * what allocates the money, checks the deferred sum, and issues the receipt
 * number in one transaction — duplicating that here would be a second
 * implementation of the rule the ledger depends on.
 */

const field = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
};

const isIsoDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export const recordPaymentAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('payment.record')) {
    return { error: 'Your role cannot record payments.' };
  }

  const leaseId = field(form, 'leaseId').trim();
  const amountText = field(form, 'amount').trim();
  const method = field(form, 'method');
  const paidOn = field(form, 'paidOn').trim();
  const reference = field(form, 'reference').trim();
  const clientMutationId = field(form, 'clientMutationId').trim();

  const fieldErrors: Record<string, string> = {};

  if (leaseId === '') fieldErrors.leaseId = 'Choose the lease the money is for';

  if (!isPaymentMethod(method)) fieldErrors.method = 'Choose how the money was received';

  let amountKobo: number | null = null;
  if (amountText === '') {
    fieldErrors.amount = 'Enter the amount received';
  } else {
    try {
      amountKobo = toSafeNumber(parseNaira(amountText));
    } catch (error) {
      fieldErrors.amount =
        error instanceof MoneyParseError
          ? 'Enter a naira amount, for example 1,250,000.00'
          : 'That amount is too large to record';
    }
    if (amountKobo !== null && amountKobo <= 0) {
      fieldErrors.amount = 'A payment must be greater than zero';
    }
  }

  if (paidOn !== '' && !isIsoDate(paidOn)) {
    fieldErrors.paidOn = 'Use a date in the form 2026-03-01';
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await supabaseForRequest();

  let received: { payment_id: string; receipt_id: string; receipt_number: string } | null = null;
  try {
    const { data, error } = await supabase.rpc('record_payment', {
      target_organisation_id: viewer.organisationId,
      target_lease_id: leaseId,
      payment_amount_kobo: amountKobo as number,
      payment_method: method as PaymentMethod,
      payment_client_mutation_id:
        clientMutationId === '' ? globalThis.crypto.randomUUID() : clientMutationId,
      ...(paidOn === '' ? {} : { payment_paid_on: paidOn }),
      ...(reference === '' ? {} : { payment_reference: reference }),
      ...(viewer.access.branchId === null ? {} : { payment_branch_id: viewer.access.branchId }),
    });

    if (error !== null) {
      return { error: `Could not record the payment: ${error.message}` };
    }

    received = data?.[0] ?? null;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not record the payment',
    };
  }

  if (received === null) {
    return { error: 'The payment was recorded but no receipt came back. Check Rent and arrears.' };
  }

  revalidatePath('/rent');

  // Outside the try: redirect throws by design, and catching it would turn a
  // successful payment into an error message.
  redirect(`/rent/receipts/${received.receipt_id}`);
};

export const reversePaymentAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('payment.reverse')) {
    return { error: 'Your role cannot reverse payments.' };
  }

  const paymentId = field(form, 'paymentId').trim();
  const receiptId = field(form, 'receiptId').trim();
  const reason = field(form, 'reason').trim();

  const fieldErrors: Record<string, string> = {};
  if (paymentId === '') fieldErrors.paymentId = 'The payment is missing';
  if (reason.length < 3) fieldErrors.reason = 'Give a short reason for the reversal';
  if (reason.length > 500) fieldErrors.reason = 'Keep the reason under 500 characters';
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await supabaseForRequest();

  try {
    const { error } = await supabase.rpc('reverse_payment', {
      target_payment_id: paymentId,
      reason,
    });
    if (error !== null) return { error: `Could not reverse the payment: ${error.message}` };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not reverse the payment',
    };
  }

  revalidatePath('/rent');
  if (receiptId !== '') revalidatePath(`/rent/receipts/${receiptId}`);

  return {
    message: 'Payment reversed. The receipt keeps its number and both are marked reversed.',
  };
};
