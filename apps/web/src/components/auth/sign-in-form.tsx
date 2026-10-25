'use client';

import { useActionState } from 'react';

import { Field, TextInput } from '../ui';
import { signIn, type ActionResult } from '../../server/auth-actions';
import { FormShell } from './form-shell';

export const SignInForm = ({ next }: { readonly next: string }) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(signIn, {});

  return (
    <form action={action} className="space-y-4">
      <FormShell state={state} pending={pending} submitLabel="Sign in">
        <input type="hidden" name="next" value={next} />

        <Field id="email" label="Email address" required>
          <TextInput id="email" name="email" type="email" autoComplete="email" required />
        </Field>

        <Field id="password" label="Password" required>
          <TextInput
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
      </FormShell>
    </form>
  );
};
