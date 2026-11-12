'use client';

import { useActionState } from 'react';

import { Button } from '../ui';
import { issueStatementAction, reviewStatementAction } from '../../server/statement-actions';
import type { ActionResult } from '../../server/auth-actions';

/** Review or issue a statement (LEDGER-8). Small enough to sit in the header. */
export const StatementTransitionButton = ({
  statementId,
  mode,
}: {
  readonly statementId: string;
  readonly mode: 'review' | 'issue';
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    mode === 'review' ? reviewStatementAction : issueStatementAction,
    {},
  );

  return (
    <form action={action} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="statementId" value={statementId} />
      <Button
        type="submit"
        size="sm"
        variant={mode === 'issue' ? 'primary' : 'secondary'}
        disabled={pending}
      >
        {pending ? 'Working…' : mode === 'review' ? 'Mark reviewed' : 'Issue statement'}
      </Button>
      {state.error !== undefined && (
        <span role="alert" className="text-xs text-danger-text">
          {state.error}
        </span>
      )}
      {state.message !== undefined && (
        <span role="status" className="text-xs text-success-text">
          {state.message}
        </span>
      )}
    </form>
  );
};
