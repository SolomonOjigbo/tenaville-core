'use server';

import { revalidatePath } from 'next/cache';

import { MoneyParseError, parseNaira, toTransport } from '@tenaville/money';

import { errorMessage } from '../lib/form-errors';
import { field, optionalField } from './form-fields';
import { currentViewer, supabaseForRequest } from './session';
import type { ActionResult } from './auth-actions';

const refreshBilling = (): void => {
  revalidatePath('/settings/plan');
  revalidatePath('/settings/invoices');
};

export const changePlanAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('org.billing.manage')) {
    return { error: 'Only the owner can change the plan.' };
  }

  const planId = field(form, 'planId').trim();
  const reason = field(form, 'reason').trim();
  if (planId === '') return { error: 'Choose a plan.' };
  if (reason.length < 3) return { fieldErrors: { reason: 'Say why the plan is changing' } };

  const supabase = await supabaseForRequest();
  const { data, error } = await supabase.rpc('change_subscription_plan', {
    p_organisation_id: viewer.organisationId,
    p_plan_id: planId,
    p_reason: reason,
  });

  if (error !== null) return { error: errorMessage(error, 'Could not change the plan') };

  refreshBilling();
  return {
    message:
      typeof data === 'string' ? 'Plan changed. An invoice has been issued.' : 'Plan changed.',
  };
};

export const generateInvoiceAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('org.billing.manage')) {
    return { error: 'Only the owner can issue an invoice.' };
  }

  const periodStart = field(form, 'periodStart').trim();
  const periodEnd = field(form, 'periodEnd').trim();
  if (periodStart === '' || periodEnd === '') {
    return { error: 'Choose the invoice period.' };
  }

  const supabase = await supabaseForRequest();
  const { error } = await supabase.rpc('generate_subscription_invoice', {
    p_organisation_id: viewer.organisationId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });

  if (error !== null) return { error: errorMessage(error, 'Could not issue the invoice') };

  refreshBilling();
  return { message: 'Invoice issued.' };
};

export const recordInvoicePaymentAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('org.billing.payment.record')) {
    return { error: 'Your role cannot record invoice payments.' };
  }

  const invoiceId = field(form, 'invoiceId').trim();
  const amountText = field(form, 'amount').trim();
  if (invoiceId === '') return { error: 'The invoice is missing.' };

  let amount: number;
  try {
    amount = Number(toTransport(parseNaira(amountText)));
  } catch (error) {
    return {
      fieldErrors: {
        amount:
          error instanceof MoneyParseError
            ? 'Enter a naira amount, for example 25,000.00'
            : 'That amount is too large to store',
      },
    };
  }

  const supabase = await supabaseForRequest();
  const { error } = await supabase.rpc('record_invoice_payment', {
    p_invoice_id: invoiceId,
    p_amount_kobo: amount,
    p_method: field(form, 'method') || 'bank_transfer',
    p_reference: optionalField(form, 'reference') ?? '',
    p_paid_on: optionalField(form, 'paidOn') ?? new Date().toISOString().slice(0, 10),
  });

  if (error !== null) return { error: errorMessage(error, 'Could not record the payment') };

  refreshBilling();
  return { message: 'Payment recorded.' };
};
