'use client';

import { useActionState } from 'react';

import { Button } from '../ui';
import { confirmPaymentAction } from '../../server/payment-actions';
import type { ActionResult } from '../../server/auth-actions';

/**
 * Mark a recorded payment as reconciled (RENT-2).
 *
 * Kept small so it can sit in a cash-up row: the money has already been
 * recorded, and confirming it is a check against the bank or the cash box, not
 * a second act of receiving it.
 */
export const ConfirmPaymentButton = ({ paymentId }: { readonly paymentId: string }) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(confirmPaymentAction, {});

  return (
    <form action={action} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="paymentId" value={paymentId} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? 'Confirming…' : 'Confirm'}
      </Button>
      {state.error !== undefined && (
        <span role="alert" className="text-xs text-danger-text">
          {state.error}
        </span>
      )}
      {state.message !== undefined && (
        <span role="status" className="text-xs text-success-text">
          {state.message}
        </span>
      )}
    </form>
  );
};
