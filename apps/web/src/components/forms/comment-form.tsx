'use client';

import { useActionState } from 'react';

import { Button, Field, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { addMaintenanceCommentAction } from '../../server/maintenance-actions';
import type { ActionResult } from '../../server/auth-actions';

/** Add a comment to the repair timeline (MAINT-5). */
export const CommentForm = ({
  requestId,
  isStaff,
}: {
  readonly requestId: string;
  readonly isStaff: boolean;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    addMaintenanceCommentAction,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <FormBanner state={state} />
      <input type="hidden" name="requestId" value={requestId} />

      <Field id="comment-body" label="Add a comment" error={state.fieldErrors?.body}>
        <TextInput id="comment-body" name="body" placeholder="An update for the timeline" />
      </Field>

      {isStaff && (
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="internal" className="size-4" />
          <span>Internal only — do not show to the tenant</span>
        </label>
      )}

      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Adding…' : 'Add comment'}
      </Button>
    </form>
  );
};
