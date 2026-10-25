'use client';

import { useActionState } from 'react';

import { Button } from '../ui';
import { revokePersonInvitation } from '../../server/people-actions';
import type { ActionResult } from '../../server/auth-actions';

export const RevokeButton = ({ membershipId }: { readonly membershipId: string }) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    revokePersonInvitation,
    {},
  );

  return (
    <form action={action} className="inline">
      <input type="hidden" name="membershipId" value={membershipId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? 'Withdrawing…' : 'Withdraw'}
      </Button>
      {state.error !== undefined && (
        <span role="alert" className="ml-2 text-xs text-danger-text">
          {state.error}
        </span>
      )}
    </form>
  );
};
