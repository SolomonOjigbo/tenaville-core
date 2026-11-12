'use client';

import { useActionState } from 'react';

import { Button, Field, MoneyInput, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { renewLeaseAction } from '../../server/tenancy-actions';
import type { ActionResult } from '../../server/auth-actions';

/**
 * Renew a lease (LEASE-4).
 *
 * A renewal is a new lease pointing at the old one; the old terms are not
 * rewritten. The deposit carries over by default, and the new lease is
 * activated with a fresh schedule from the day after the old one ends.
 */
export const RenewLeaseForm = ({
  leaseId,
  suggestedEnd,
  currentRentLabel,
}: {
  readonly leaseId: string;
  readonly suggestedEnd: string;
  readonly currentRentLabel: string;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(renewLeaseAction, {});

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="leaseId" value={leaseId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="renew-end" label="New end date" required error={state.fieldErrors?.endsOn}>
          <TextInput
            id="renew-end"
            name="endsOn"
            type="date"
            required
            defaultValue={suggestedEnd}
            invalid={state.fieldErrors?.endsOn !== undefined}
          />
        </Field>

        <Field
          id="renew-rent"
          label="New rent"
          hint={`Leave blank to carry ${currentRentLabel} forward.`}
          error={state.fieldErrors?.rent}
        >
          <MoneyInput
            id="renew-rent"
            name="rent"
            placeholder={currentRentLabel}
            autoComplete="off"
            invalid={state.fieldErrors?.rent !== undefined}
          />
        </Field>
      </div>

      <label className="flex items-start gap-2 text-sm text-text">
        <input
          type="checkbox"
          name="carryDeposit"
          defaultChecked
          className="mt-1 h-4 w-4 rounded border-border"
        />
        <span>
          Carry the deposit over
          <span className="block text-xs text-muted">
            Transfers what is held rather than refunding and re-collecting it.
          </span>
        </span>
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? 'Renewing…' : 'Renew and activate'}
      </Button>
    </form>
  );
};
