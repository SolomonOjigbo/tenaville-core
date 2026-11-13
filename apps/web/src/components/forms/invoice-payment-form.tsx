'use client';

import { useActionState } from 'react';

import { Button, Field, MoneyInput, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { recordInvoicePaymentAction } from '../../server/billing-actions';
import type { ActionResult } from '../../server/auth-actions';

/** Record a payment against an invoice (BILL-2). */
export const InvoicePaymentForm = ({
  invoiceId,
  canRecord,
}: {
  readonly invoiceId: string;
  readonly canRecord: boolean;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    recordInvoicePaymentAction,
    {},
  );

  if (!canRecord) return null;

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="invoiceId" value={invoiceId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="payment-amount" label="Amount" required error={state.fieldErrors?.amount}>
          <MoneyInput id="payment-amount" name="amount" required placeholder="25,000.00" />
        </Field>
        <Field id="payment-method" label="Method" required>
          <Select id="payment-method" name="method" defaultValue="bank_transfer">
            <option value="bank_transfer">Bank transfer</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field id="payment-reference" label="Reference">
          <TextInput id="payment-reference" name="reference" placeholder="Transfer reference" />
        </Field>
        <Field id="payment-date" label="Paid on">
          <TextInput id="payment-date" name="paidOn" type="date" />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Recording…' : 'Record payment'}
      </Button>
    </form>
  );
};
