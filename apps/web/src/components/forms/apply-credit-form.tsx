'use client';

import { useActionState } from 'react';

import { Button, Field, MoneyInput, Select } from '../ui';
import { FormBanner } from './form-banner';
import { applyTenantCreditAction } from '../../server/payment-actions';
import type { ActionResult } from '../../server/auth-actions';

export interface CreditOption {
  readonly id: string;
  readonly label: string;
}

export interface FutureChargeOption {
  readonly id: string;
  readonly label: string;
}

export const ApplyCreditForm = ({
  credits,
  charges,
}: {
  readonly credits: readonly CreditOption[];
  readonly charges: readonly FutureChargeOption[];
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    applyTenantCreditAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="credit-source" label="Available credit" required error={state.fieldErrors?.creditId}>
          <Select id="credit-source" name="creditId" required defaultValue={credits[0]?.id ?? ''}>
            {credits.map((credit) => (
              <option key={credit.id} value={credit.id}>
                {credit.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="credit-charge" label="Future charge" required>
          <Select id="credit-charge" name="chargeId" required defaultValue={charges[0]?.id ?? ''}>
            {charges.map((charge) => (
              <option key={charge.id} value={charge.id}>
                {charge.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        id="credit-amount"
        label="Amount to apply"
        hint="Cannot exceed either the credit or what the charge still owes."
        required
        error={state.fieldErrors?.amount}
      >
        <MoneyInput id="credit-amount" name="amount" required autoComplete="off" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Applying…' : 'Apply credit'}
      </Button>
    </form>
  );
};
