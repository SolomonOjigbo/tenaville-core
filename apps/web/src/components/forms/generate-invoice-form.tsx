'use client';

import { useActionState } from 'react';

import { Button, Field, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { generateInvoiceAction } from '../../server/billing-actions';
import type { ActionResult } from '../../server/auth-actions';

/** Issue the invoice for a billing period (BILL-2). */
export const GenerateInvoiceForm = ({
  defaultStart,
  defaultEnd,
  canManage,
}: {
  readonly defaultStart: string;
  readonly defaultEnd: string;
  readonly canManage: boolean;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    generateInvoiceAction,
    {},
  );

  if (!canManage) return null;

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="invoice-period-start" label="Period start" required>
          <TextInput
            id="invoice-period-start"
            name="periodStart"
            type="date"
            required
            defaultValue={defaultStart}
          />
        </Field>
        <Field id="invoice-period-end" label="Period end" required>
          <TextInput
            id="invoice-period-end"
            name="periodEnd"
            type="date"
            required
            defaultValue={defaultEnd}
          />
        </Field>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Issuing…' : 'Issue invoice for this period'}
      </Button>
    </form>
  );
};
