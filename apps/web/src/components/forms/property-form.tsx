'use client';

import { useActionState } from 'react';

import { Button, Field, LinkButton, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { createPropertyAction } from '../../server/portfolio-actions';
import type { ActionResult } from '../../server/auth-actions';
import type { StateOption } from './landlord-form';

export interface LandlordOption {
  readonly id: string;
  readonly label: string;
}

const PROPERTY_TYPES = [
  ['residential', 'Residential'],
  ['commercial', 'Commercial'],
  ['mixed_use', 'Mixed use'],
  ['estate', 'Estate'],
  ['land', 'Land'],
] as const;

/** Add a property (PROP-1). One landlord in R1. */
export const PropertyForm = ({
  landlords,
  states,
}: {
  readonly landlords: readonly LandlordOption[];
  readonly states: readonly StateOption[];
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createPropertyAction, {});

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="property-landlord"
          label="Landlord"
          required
          hint="Who owns this property. Statements are addressed to them."
          error={state.fieldErrors?.landlordId}
        >
          <Select
            id="property-landlord"
            name="landlordId"
            required
            defaultValue={landlords[0]?.id ?? ''}
            invalid={state.fieldErrors?.landlordId !== undefined}
          >
            {landlords.map((landlord) => (
              <option key={landlord.id} value={landlord.id}>
                {landlord.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="property-name" label="Property name" required error={state.fieldErrors?.name}>
          <TextInput
            id="property-name"
            name="name"
            required
            placeholder="e.g. Adeyemi Court"
            invalid={state.fieldErrors?.name !== undefined}
          />
        </Field>

        <Field id="property-type" label="Type" required>
          <Select id="property-type" name="propertyType" defaultValue="residential">
            {PROPERTY_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="property-reference" label="Reference" error={state.fieldErrors?.reference}>
          <TextInput id="property-reference" name="reference" placeholder="e.g. YB/COURT/01" />
        </Field>

        <div className="sm:col-span-2">
          <Field
            id="property-address"
            label="Address"
            required
            error={state.fieldErrors?.addressLine}
          >
            <TextInput
              id="property-address"
              name="addressLine"
              required
              placeholder="Street and area"
              invalid={state.fieldErrors?.addressLine !== undefined}
            />
          </Field>
        </div>

        <Field id="property-state" label="State" required error={state.fieldErrors?.stateCode}>
          <Select
            id="property-state"
            name="stateCode"
            required
            defaultValue="LA"
            invalid={state.fieldErrors?.stateCode !== undefined}
          >
            {states.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="property-lga" label="LGA" error={state.fieldErrors?.lga}>
          <TextInput id="property-lga" name="lga" placeholder="e.g. Eti-Osa" />
        </Field>

        <div className="sm:col-span-2">
          <Field id="property-notes" label="Notes" error={state.fieldErrors?.notes}>
            <TextInput id="property-notes" name="notes" placeholder="Access, caretaker, quirks" />
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Add property'}
        </Button>
        <LinkButton href="/properties" variant="secondary">
          Cancel
        </LinkButton>
      </div>
    </form>
  );
};
