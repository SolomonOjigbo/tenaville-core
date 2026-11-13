'use client';

import { useActionState } from 'react';

import { Button, Field, MoneyInput, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { recordHandoverAction, terminateLeaseAction } from '../../server/tenancy-actions';
import type { ActionResult } from '../../server/auth-actions';

const textareaClass =
  'min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-subtle';

export const RecordHandoverForm = ({
  leaseId,
  kind,
  suggestedDate,
}: {
  readonly leaseId: string;
  readonly kind: 'move_in' | 'move_out';
  readonly suggestedDate: string;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(recordHandoverAction, {});

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="leaseId" value={leaseId} />
      <input type="hidden" name="kind" value={kind} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${kind}-date`} label="Handover date" required>
          <TextInput
            id={`${kind}-date`}
            name="happenedOn"
            type="date"
            required
            defaultValue={suggestedDate}
          />
        </Field>
        <Field
          id={`${kind}-balance`}
          label="Balance agreed on the day"
          error={state.fieldErrors?.outstandingBalance}
        >
          <MoneyInput id={`${kind}-balance`} name="outstandingBalance" autoComplete="off" />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text">Meter readings</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {(['electricity', 'water', 'gas'] as const).map((meter) => (
            <Field
              key={meter}
              id={`${kind}-${meter}`}
              label={meter.replace(/^./, (c) => c.toUpperCase())}
            >
              <TextInput id={`${kind}-${meter}`} name={meter} maxLength={60} />
            </Field>
          ))}
        </div>
      </fieldset>
      <Field id={`${kind}-notes`} label="Condition notes">
        <textarea id={`${kind}-notes`} name="notes" maxLength={2000} className={textareaClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-text">
        <input type="checkbox" name="keysReturned" className="h-4 w-4 rounded border-border" />
        Keys returned
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? 'Recording…' : kind === 'move_in' ? 'Record move-in' : 'Record move-out'}
      </Button>
    </form>
  );
};

export const TerminateLeaseForm = ({
  leaseId,
  suggestedDate,
}: {
  readonly leaseId: string;
  readonly suggestedDate: string;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(terminateLeaseAction, {});

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="leaseId" value={leaseId} />
      <Field id="terminate-date" label="Termination date" required>
        <TextInput
          id="terminate-date"
          name="terminatedOn"
          type="date"
          required
          defaultValue={suggestedDate}
        />
      </Field>
      <Field id="terminate-reason" label="Reason" required error={state.fieldErrors?.reason}>
        <textarea
          id="terminate-reason"
          name="reason"
          required
          minLength={3}
          maxLength={1000}
          className={textareaClass}
          placeholder="Tenant ended the tenancy by mutual agreement."
        />
      </Field>
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? 'Terminating…' : 'Terminate lease'}
      </Button>
    </form>
  );
};
