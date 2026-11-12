'use client';

import { useActionState } from 'react';

import { Button, Field, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { decideMaintenanceApprovalAction } from '../../server/maintenance-actions';
import type { ActionResult } from '../../server/auth-actions';

/** Approve or reject a cost above the threshold (MAINT-8, OWN-4). */
export const ApprovalForm = ({
  approvalId,
  requestId,
  canDecide,
}: {
  readonly approvalId: string;
  readonly requestId: string;
  readonly canDecide: boolean;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    decideMaintenanceApprovalAction,
    {},
  );

  if (!canDecide) {
    return (
      <p className="text-sm text-muted">
        A coordinator, administrator or the landlord can decide this cost.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <FormBanner state={state} />
      <input type="hidden" name="approvalId" value={approvalId} />
      <input type="hidden" name="requestId" value={requestId} />

      <Field
        id="approval-comment"
        label="Comment"
        hint="Required when rejecting; shown on the repair timeline."
      >
        <TextInput id="approval-comment" name="comment" placeholder="Why?" />
      </Field>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="decision" value="approve" disabled={pending}>
          Approve
        </Button>
        <Button type="submit" name="decision" value="reject" variant="secondary" disabled={pending}>
          Reject
        </Button>
      </div>
    </form>
  );
};
