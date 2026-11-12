'use client';

import { useActionState } from 'react';

import { Button, Field, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { maintenanceStatusLabel } from '../../lib/maintenance';
import { transitionMaintenanceRequestAction } from '../../server/maintenance-actions';
import type { ActionResult } from '../../server/auth-actions';

/** Move a request through the transition map (MAINT-3). */
export const StatusForm = ({
  requestId,
  transitions,
}: {
  readonly requestId: string;
  readonly transitions: readonly string[];
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    transitionMaintenanceRequestAction,
    {},
  );

  if (transitions.length === 0) return null;

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="requestId" value={requestId} />

      <Field id="status-next" label="Next status" required>
        <Select id="status-next" name="status" required defaultValue={transitions[0]}>
          {transitions.map((status) => (
            <option key={status} value={status}>
              {maintenanceStatusLabel(status)}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="status-note"
        label="Note"
        hint="Required for completion and rejection; recorded on the timeline."
      >
        <TextInput id="status-note" name="note" placeholder="What happened?" />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? 'Updating…' : 'Update status'}
      </Button>
    </form>
  );
};
