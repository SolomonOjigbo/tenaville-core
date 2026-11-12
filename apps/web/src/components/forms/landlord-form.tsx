'use client';

import { useActionState } from 'react';

import { Button, Field, LinkButton, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { createLandlordAction } from '../../server/portfolio-actions';
import type { ActionResult } from '../../server/auth-actions';

export interface StateOption {
  readonly code: string;
  readonly name: string;
}

/** Record a landlord (OWN-1). Remittance details are a separate action. */
export const LandlordForm = ({ states }: { readonly states: readonly StateOption[] }) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createLandlordAction, {});

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="landlord-name"
          label="Landlord name"
          required
          hint="As it should appear on statements."
          error={state.fieldErrors?.displayName}
        >
          <TextInput
            id="landlord-name"
            name="displayName"
            required
            placeholder="e.g. Mrs Adeyemi"
            invalid={state.fieldErrors?.displayName !== undefined}
          />
        </Field>

        <Field id="landlord-kind" label="Type" required>
          <Select id="landlord-kind" name="kind" defaultValue="individual">
            <option value="individual">Individual</option>
            <option value="organisation">Organisation</option>
          </Select>
        </Field>

        <Field id="landlord-phone" label="Phone" error={state.fieldErrors?.phone}>
          <TextInput
            id="landlord-phone"
            name="phone"
            type="tel"
            placeholder="08030000000"
            invalid={state.fieldErrors?.phone !== undefined}
          />
        </Field>

        <Field id="landlord-email" label="Email" error={state.fieldErrors?.email}>
          <TextInput
            id="landlord-email"
            name="email"
            type="email"
            placeholder="landlord@example.ng"
            invalid={state.fieldErrors?.email !== undefined}
          />
        </Field>

        <Field id="landlord-channel" label="Preferred channel">
          <Select id="landlord-channel" name="preferredChannel" defaultValue="whatsapp">
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </Select>
        </Field>

        <Field id="landlord-state" label="State" error={state.fieldErrors?.stateCode}>
          <Select
            id="landlord-state"
            name="stateCode"
            defaultValue=""
            invalid={state.fieldErrors?.stateCode !== undefined}
          >
            <option value="">Not recorded</option>
            {states.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="sm:col-span-2">
          <Field id="landlord-address" label="Address" error={state.fieldErrors?.addressLine}>
            <TextInput
              id="landlord-address"
              name="addressLine"
              placeholder="Street, area"
              invalid={state.fieldErrors?.addressLine !== undefined}
            />
          </Field>
        </div>

        <Field id="landlord-lga" label="LGA" error={state.fieldErrors?.lga}>
          <TextInput id="landlord-lga" name="lga" placeholder="e.g. Eti-Osa" />
        </Field>

        <Field id="landlord-notes" label="Notes" error={state.fieldErrors?.notes}>
          <TextInput id="landlord-notes" name="notes" placeholder="Anything worth remembering" />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Add landlord'}
        </Button>
        <LinkButton href="/landlords" variant="secondary">
          Cancel
        </LinkButton>
      </div>
    </form>
  );
};
