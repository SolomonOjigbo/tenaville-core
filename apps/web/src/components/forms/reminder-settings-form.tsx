'use client';

import { useActionState } from 'react';

import { Button, Field, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { saveReminderSettingsAction } from '../../server/comms-actions';
import type { ActionResult } from '../../server/auth-actions';

export const ReminderSettingsForm = ({
  leaseAlertDays,
  rentReminderDays,
}: {
  readonly leaseAlertDays: readonly number[];
  readonly rentReminderDays: number;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    saveReminderSettingsAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="lease-alert-days"
          label="Lease alert days"
          hint="Comma-separated days before expiry, e.g. 90, 60, 30."
          required
          error={state.fieldErrors?.leaseAlertDays}
        >
          <TextInput
            id="lease-alert-days"
            name="leaseAlertDays"
            required
            defaultValue={leaseAlertDays.join(', ')}
            placeholder="90, 60, 30"
          />
        </Field>
        <Field
          id="rent-reminder-days"
          label="Rent reminder days"
          hint="Days before a rent due date to create a reminder. 0 means on the due date."
          required
          error={state.fieldErrors?.rentReminderDays}
        >
          <TextInput
            id="rent-reminder-days"
            name="rentReminderDays"
            type="number"
            min={0}
            max={365}
            required
            defaultValue={rentReminderDays}
          />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save reminder settings'}
      </Button>
    </form>
  );
};
