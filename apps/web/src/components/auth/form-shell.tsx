'use client';

import type { ReactNode } from 'react';

import { Button } from '../ui/button';
import type { ActionResult } from '../../server/auth-actions';

/**
 * The shared chrome for an auth form: banner messages and a submit button
 * that disables while the action runs.
 *
 * Takes rendered children rather than a render prop. A function cannot cross
 * the server/client boundary, so each form is its own client component and
 * passes already-rendered fields in — which also keeps each form's field
 * wiring next to the fields themselves.
 */
export const FormShell = ({
  state,
  pending,
  submitLabel,
  children,
}: {
  readonly state: ActionResult;
  readonly pending: boolean;
  readonly submitLabel: string;
  readonly children: ReactNode;
}) => (
  <>
    {state.error !== undefined && (
      <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
        {state.error}
      </p>
    )}
    {state.message !== undefined && (
      <p role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-success-text">
        {state.message}
      </p>
    )}

    {children}

    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Working…' : submitLabel}
    </Button>
  </>
);
