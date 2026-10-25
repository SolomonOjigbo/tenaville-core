'use client';

import { useActionState } from 'react';

import { Button } from '../ui';
import { acceptOwnInvitation } from '../../server/people-actions';
import type { ActionResult } from '../../server/auth-actions';

export const AcceptInvitationForm = ({
  organisationId,
  organisationName,
}: {
  readonly organisationId: string;
  readonly organisationName: string;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(acceptOwnInvitation, {});

  if (state.message !== undefined) {
    return (
      <div className="space-y-3">
        <p role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-success-text">
          {state.message}
        </p>
        <a href="/dashboard" className="text-sm text-primary underline">
          Go to {organisationName}
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {state.error}
        </p>
      )}
      <input type="hidden" name="organisationId" value={organisationId} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Joining…' : `Join ${organisationName}`}
      </Button>
    </form>
  );
};
