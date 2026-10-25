'use client';

import { useActionState } from 'react';

import { Field, Select, TextInput } from '../ui';
import { createOrganisationAction, type ActionResult } from '../../server/auth-actions';
import { FormShell } from './form-shell';

export const CreateOrganisationForm = ({ suggestedName }: { readonly suggestedName: string }) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    createOrganisationAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormShell state={state} pending={pending} submitLabel="Create organisation">
        <Field
          id="name"
          label="Organisation name"
          required
          hint="The name your landlords and tenants will recognise."
          error={state.fieldErrors?.name}
        >
          <TextInput
            id="name"
            name="name"
            required
            minLength={2}
            invalid={state.fieldErrors?.name !== undefined}
          />
        </Field>

        <Field
          id="type"
          label="Account type"
          required
          hint="An individual landlord manages their own property; an agency manages for others."
        >
          <Select id="type" name="type" defaultValue="agency">
            <option value="agency">Agency or property manager</option>
            <option value="individual_landlord">Individual landlord</option>
          </Select>
        </Field>

        <Field id="ownerFullName" label="Your name" hint="Shown to your team.">
          <TextInput
            id="ownerFullName"
            name="ownerFullName"
            autoComplete="name"
            defaultValue={suggestedName}
          />
        </Field>
      </FormShell>
    </form>
  );
};
