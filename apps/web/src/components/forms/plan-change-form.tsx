'use client';

import { useActionState } from 'react';

import { Button, Field, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { changePlanAction } from '../../server/billing-actions';
import type { ActionResult } from '../../server/auth-actions';

export interface PlanChoice {
  readonly id: string;
  readonly name: string;
  readonly priceLabel: string;
  readonly allowanceLabel: string;
}

/** Upgrade or downgrade the organisation's plan (BILL-1, BILL-3). */
export const PlanChangeForm = ({
  plans,
  currentPlanId,
  canManage,
}: {
  readonly plans: readonly PlanChoice[];
  readonly currentPlanId: string;
  readonly canManage: boolean;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(changePlanAction, {});
  const alternatives = plans.filter((plan) => plan.id !== currentPlanId);

  if (!canManage) {
    return (
      <p className="text-sm text-subtle">
        Only the owner can change the plan. Everyone else can see what is included.
      </p>
    );
  }

  if (alternatives.length === 0)
    return <p className="text-sm text-subtle">No other plans available.</p>;

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />

      <Field id="plan-target" label="New plan" required>
        <Select id="plan-target" name="planId" required defaultValue={alternatives[0]?.id ?? ''}>
          {alternatives.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} — {plan.priceLabel} · {plan.allowanceLabel}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="plan-reason"
        label="Reason"
        required
        error={state.fieldErrors?.reason}
        hint="Recorded in the subscription history."
      >
        <TextInput
          id="plan-reason"
          name="reason"
          required
          placeholder="e.g. Growing the portfolio"
        />
      </Field>

      <p className="text-xs text-subtle">
        A downgrade is refused when current units, properties or users exceed the new plan. An
        upgrade issues an invoice for the new period.
      </p>

      <Button type="submit" disabled={pending}>
        {pending ? 'Changing…' : 'Change plan'}
      </Button>
    </form>
  );
};
