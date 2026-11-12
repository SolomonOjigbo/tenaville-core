'use client';

import { useActionState } from 'react';

import { Button, Field, MoneyInput, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { PAYMENT_METHODS, paymentMethodLabel } from '../../lib/payments';
import { recordRemittanceAction } from '../../server/ledger-actions';
import type { ActionResult } from '../../server/auth-actions';

/** Money paid to a landlord (LEDGER-1). */
export const RemittanceForm = ({
  landlordId,
  today,
}: {
  readonly landlordId: string;
  readonly today: string;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    recordRemittanceAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="landlordId" value={landlordId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="remittance-amount"
          label="Amount paid"
          required
          error={state.fieldErrors?.amount}
        >
          <MoneyInput
            id="remittance-amount"
            name="amount"
            required
            placeholder="250,000.00"
            autoComplete="off"
            invalid={state.fieldErrors?.amount !== undefined}
          />
        </Field>

        <Field id="remittance-date" label="Date paid" required error={state.fieldErrors?.paidOn}>
          <TextInput
            id="remittance-date"
            name="paidOn"
            type="date"
            required
            defaultValue={today}
            invalid={state.fieldErrors?.paidOn !== undefined}
          />
        </Field>

        <Field id="remittance-method" label="Method" required error={state.fieldErrors?.method}>
          <Select
            id="remittance-method"
            name="method"
            defaultValue="bank_transfer"
            invalid={state.fieldErrors?.method !== undefined}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {paymentMethodLabel(method)}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="remittance-reference" label="Reference" error={state.fieldErrors?.reference}>
          <TextInput id="remittance-reference" name="reference" placeholder="e.g. REM-0042" />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Recording…' : 'Record remittance'}
      </Button>
    </form>
  );
};
