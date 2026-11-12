'use client';

import { useActionState, useState } from 'react';

import { MAINTENANCE_PAYERS, MAINTENANCE_PAYER_LABELS } from '@tenaville/core/maintenance';

import { Button, Field, MoneyInput, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { recordMaintenanceCostAction } from '../../server/maintenance-actions';
import type { ActionResult } from '../../server/auth-actions';

const textareaClass =
  'min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-subtle';

/** Itemised cost and payer allocation (MAINT-10, MAINT-11). */
export const CostForm = ({
  requestId,
  thresholdLabel,
}: {
  readonly requestId: string;
  readonly thresholdLabel: string;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    recordMaintenanceCostAction,
    {},
  );
  const [noCost, setNoCost] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="requestId" value={requestId} />

      <label className="flex items-start gap-3 rounded-md border border-border px-4 py-3 text-sm">
        <input
          type="checkbox"
          name="noCost"
          className="mt-0.5 size-4"
          checked={noCost}
          onChange={(event) => setNoCost(event.target.checked)}
        />
        <span>
          <span className="block font-medium text-text">No cost for this job</span>
          <span className="block text-xs text-muted">
            Completion needs a cost or this explicit flag (MAINT-10).
          </span>
        </span>
      </label>

      {!noCost && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="cost-description"
              label="What was paid for?"
              required
              error={state.fieldErrors?.description}
            >
              <TextInput
                id="cost-description"
                name="description"
                required
                placeholder="e.g. Washer and labour"
              />
            </Field>
            <Field
              id="cost-amount"
              label="Amount"
              required
              error={state.fieldErrors?.amount}
              hint={`Approval threshold: ${thresholdLabel}`}
            >
              <MoneyInput id="cost-amount" name="amount" required placeholder="25,000.00" />
            </Field>
            <Field id="cost-payer" label="Who bears it?" required>
              <Select id="cost-payer" name="payer" defaultValue="landlord">
                {MAINTENANCE_PAYERS.map((payer) => (
                  <option key={payer} value={payer}>
                    {MAINTENANCE_PAYER_LABELS[payer]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              id="cost-invoice"
              label="Invoice reference"
              hint="Optional, for the office file."
            >
              <TextInput
                id="cost-invoice"
                name="invoicePath"
                placeholder="Invoice or receipt number"
              />
            </Field>
          </div>

          <Field
            id="cost-reason"
            label="Why this payer?"
            required
            error={state.fieldErrors?.reason}
            hint="Landlord costs are deducted on the statement; tenant costs become a repair charge."
          >
            <textarea
              id="cost-reason"
              name="reason"
              required
              minLength={3}
              className={textareaClass}
              placeholder="e.g. Wear and tear, landlord responsibility"
            />
          </Field>
        </>
      )}

      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Saving…' : noCost ? 'Mark no cost' : 'Record cost'}
      </Button>
    </form>
  );
};
