'use client';

import { useActionState } from 'react';

import { Button, Field, TextInput } from '../ui';
import { reversePaymentAction } from '../../server/payment-actions';
import type { ActionResult } from '../../server/auth-actions';

/**
 * Reverse a payment (RENT-4).
 *
 * The original row and its receipt are not edited; a linked negative payment
 * is recorded and both are marked reversed. The reason is required because the
 * next person to read this receipt is usually the tenant asking what happened.
 */
export const ReversePaymentForm = ({
  paymentId,
  receiptId,
}: {
  readonly paymentId: string;
  readonly receiptId: string;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(reversePaymentAction, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="paymentId" value={paymentId} />
      <input type="hidden" name="receiptId" value={receiptId} />

      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {state.error}
        </p>
      )}
      {state.message !== undefined && (
        <p role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-success-text">
          {state.message}
        </p>
      )}

      <Field
        id="reverse-reason"
        label="Reason for reversal"
        required
        hint="Stored with both records. The receipt keeps its number and is marked reversed."
        error={state.fieldErrors?.reason}
      >
        <TextInput
          id="reverse-reason"
          name="reason"
          required
          placeholder="e.g. Recorded against the wrong quarter"
          invalid={state.fieldErrors?.reason !== undefined}
        />
      </Field>

      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? 'Reversing…' : 'Reverse this payment'}
      </Button>
    </form>
  );
};
