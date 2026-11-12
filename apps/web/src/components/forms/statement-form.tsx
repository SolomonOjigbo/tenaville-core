'use client';

import { useActionState } from 'react';

import { Button, Field, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { createStatementAction } from '../../server/statement-actions';
import type { ActionResult } from '../../server/auth-actions';

/**
 * Freeze a landlord's ledger for a period (LEDGER-2).
 *
 * The defaults are the current month, but a correction reuses the period of
 * the issued statement it replaces, so the two can be compared line for line.
 */
export const StatementForm = ({
  landlordId,
  defaultStart,
  defaultEnd,
  supersedesId,
}: {
  readonly landlordId: string;
  readonly defaultStart: string;
  readonly defaultEnd: string;
  readonly supersedesId?: string | undefined;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    createStatementAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="landlordId" value={landlordId} />
      {supersedesId !== undefined && (
        <input type="hidden" name="supersedesId" value={supersedesId} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="statement-start"
          label="Period starts"
          required
          error={state.fieldErrors?.periodStart}
        >
          <TextInput
            id="statement-start"
            name="periodStart"
            type="date"
            required
            defaultValue={defaultStart}
            invalid={state.fieldErrors?.periodStart !== undefined}
          />
        </Field>

        <Field id="statement-end" label="Period ends" required error={state.fieldErrors?.periodEnd}>
          <TextInput
            id="statement-end"
            name="periodEnd"
            type="date"
            required
            defaultValue={defaultEnd}
            invalid={state.fieldErrors?.periodEnd !== undefined}
          />
        </Field>
      </div>

      <p className="text-sm text-muted">
        The opening balance is everything before the period; the lines are frozen now, so a later
        adjustment cannot change what this statement says.
      </p>

      <Button type="submit" disabled={pending}>
        {pending
          ? 'Creating…'
          : supersedesId === undefined
            ? 'Create draft statement'
            : 'Create corrected revision'}
      </Button>
    </form>
  );
};
