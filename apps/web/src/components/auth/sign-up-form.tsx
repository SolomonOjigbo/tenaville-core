'use client';

import { useActionState } from 'react';

import { Field, TextInput } from '../ui';
import { MINIMUM_PASSWORD_LENGTH } from '../../lib/auth';
import { signUp, type ActionResult } from '../../server/auth-actions';
import { FormShell } from './form-shell';

export const SignUpForm = () => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(signUp, {});

  return (
    <form action={action} className="space-y-4">
      <FormShell state={state} pending={pending} submitLabel="Create account">
        <Field id="fullName" label="Full name" required error={state.fieldErrors?.fullName}>
          <TextInput
            id="fullName"
            name="fullName"
            autoComplete="name"
            required
            invalid={state.fieldErrors?.fullName !== undefined}
            describedBy={state.fieldErrors?.fullName !== undefined ? 'fullName-error' : undefined}
          />
        </Field>

        <Field id="email" label="Email address" required error={state.fieldErrors?.email}>
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            invalid={state.fieldErrors?.email !== undefined}
            describedBy={state.fieldErrors?.email !== undefined ? 'email-error' : undefined}
          />
        </Field>

        <Field
          id="password"
          label="Password"
          required
          hint={`At least ${MINIMUM_PASSWORD_LENGTH} characters. Length matters more than symbols.`}
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
            describedBy={
              state.fieldErrors?.password !== undefined ? 'password-error' : 'password-hint'
            }
          />
        </Field>
      </FormShell>
    </form>
  );
};
