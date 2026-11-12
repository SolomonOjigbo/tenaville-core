'use client';

import { useActionState } from 'react';

import { Button, Field, Select } from '../ui';
import { FormBanner } from './form-banner';
import { updateNotificationPreferenceAction } from '../../server/comms-actions';
import type { ActionResult } from '../../server/auth-actions';

export interface PreferenceValue {
  readonly channel: string;
  readonly purpose: string;
  readonly optedIn: boolean;
}

/** A person's own channel preferences (COMMS-6, TENANT-7). */
export const NotificationPreferenceForm = ({
  preferences,
}: {
  readonly preferences: readonly PreferenceValue[];
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    updateNotificationPreferenceAction,
    {},
  );

  const current = (channel: string, purpose: string): boolean =>
    preferences.find(
      (preference) => preference.channel === channel && preference.purpose === purpose,
    )?.optedIn ?? false;

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="pref-channel" label="Channel">
          <Select id="pref-channel" name="channel" defaultValue="whatsapp">
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </Select>
        </Field>
        <Field id="pref-purpose" label="Messages">
          <Select id="pref-purpose" name="purpose" defaultValue="operational">
            <option value="operational">Operational</option>
            <option value="marketing">Marketing</option>
          </Select>
        </Field>
        <Field id="pref-opted" label="Receive">
          <Select
            id="pref-opted"
            name="optedIn"
            defaultValue={current('whatsapp', 'operational') ? 'on' : ''}
          >
            <option value="on">On</option>
            <option value="">Off</option>
          </Select>
        </Field>
      </div>

      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Saving…' : 'Save preference'}
      </Button>
    </form>
  );
};
