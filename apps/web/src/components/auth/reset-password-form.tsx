'use client';

import { useActionState } from 'react';

import { Field, TextInput } from '../ui';
import { MINIMUM_PASSWORD_LENGTH } from '../../lib/auth';
import { updatePassword, type ActionResult } from '../../server/auth-actions';
import { FormShell } from './form-shell';

export const ResetPasswordForm = () => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updatePassword, {});

  return (
    <form action={action} className="space-y-4">
      <FormShell state={state} pending={pending} submitLabel="Save password">
        <Field
          id="password"
          label="New password"
          required
          hint={`At least ${MINIMUM_PASSWORD_LENGTH} characters.`}
          error={state.fieldErrors?.password}
        >
          <TextInput
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MINIMUM_PASSWORD_LENGTH}
            invalid={state.fieldErrors?.password !== undefined}
          />
        </Field>

        <Field
          id="confirmPassword"
          label="Confirm new password"
          required
          error={state.fieldErrors?.confirmPassword}
        >
          <TextInput
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            invalid={state.fieldErrors?.confirmPassword !== undefined}
          />
        </Field>
      </FormShell>
    </form>
  );
};
