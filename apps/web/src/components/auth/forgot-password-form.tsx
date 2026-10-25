'use client';

import { useActionState } from 'react';

import { Field, TextInput } from '../ui';
import { requestPasswordReset, type ActionResult } from '../../server/auth-actions';
import { FormShell } from './form-shell';

export const ForgotPasswordForm = () => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(requestPasswordReset, {});

  return (
    <form action={action} className="space-y-4">
      <FormShell state={state} pending={pending} submitLabel="Send reset link">
        <Field id="email" label="Email address" required error={state.fieldErrors?.email}>
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            invalid={state.fieldErrors?.email !== undefined}
          />
        </Field>
      </FormShell>
    </form>
  );
};
