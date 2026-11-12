'use client';

import { useActionState } from 'react';

import { Button, Field, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import {
  confirmMaintenanceAction,
  reopenMaintenanceAction,
} from '../../server/maintenance-actions';
import type { ActionResult } from '../../server/auth-actions';

const ConfirmRepair = ({ requestId }: { readonly requestId: string }) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    confirmMaintenanceAction,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <FormBanner state={state} />
      <input type="hidden" name="requestId" value={requestId} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Yes, it is resolved'}
      </Button>
    </form>
  );
};

const ReopenRepair = ({ requestId }: { readonly requestId: string }) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    reopenMaintenanceAction,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <FormBanner state={state} />
      <input type="hidden" name="requestId" value={requestId} />
      <Field id="reopen-reason" label="What is still wrong?" error={state.fieldErrors?.reason}>
        <TextInput id="reopen-reason" name="reason" placeholder="Tell the agency what to fix" />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Reopening…' : 'Reopen the repair'}
      </Button>
    </form>
  );
};

/** Tenant confirmation and reopen (MAINT-13). */
export const TenantResponseForm = ({
  requestId,
  status,
  confirmed,
}: {
  readonly requestId: string;
  readonly status: string;
  readonly confirmed: boolean;
}) => {
  if (status !== 'completed' && status !== 'closed') return null;

  return (
    <div className="space-y-4">
      {status === 'completed' && !confirmed && <ConfirmRepair requestId={requestId} />}
      <ReopenRepair requestId={requestId} />
    </div>
  );
};
