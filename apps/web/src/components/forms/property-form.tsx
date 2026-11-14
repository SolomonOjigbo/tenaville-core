'use client';

import { useActionState } from 'react';

import { Button, Field, LinkButton, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { createPropertyAction, updatePropertyAction } from '../../server/portfolio-actions';
import type { ActionResult } from '../../server/auth-actions';
import type { StateOption } from './landlord-form';

export interface LandlordOption {
  readonly id: string;
  readonly label: string;
}

export interface PropertyDefaults {
  readonly landlordId: string;
  readonly name: string;
  readonly propertyType: string;
  readonly reference: string | null;
  readonly addressLine: string;
  readonly stateCode: string;
  readonly lga: string | null;
  readonly area: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly notes: string | null;
}

const PROPERTY_TYPES = [
  ['residential', 'Residential'],
  ['commercial', 'Commercial'],
  ['mixed_use', 'Mixed use'],
  ['estate', 'Estate'],
  ['land', 'Land'],
] as const;

/** Add or edit a property (PROP-1). One landlord in R1. */
export const PropertyForm = ({
  landlords,
  states,
  propertyId,
  defaults,
}: {
  readonly landlords: readonly LandlordOption[];
  readonly states: readonly StateOption[];
  readonly propertyId?: string;
  readonly defaults?: PropertyDefaults;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    propertyId === undefined ? createPropertyAction : updatePropertyAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      {propertyId !== undefined && <input type="hidden" name="propertyId" value={propertyId} />}

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
            defaultValue={defaults?.landlordId ?? landlords[0]?.id ?? ''}
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
            defaultValue={defaults?.name}
            placeholder="e.g. Adeyemi Court"
            invalid={state.fieldErrors?.name !== undefined}
          />
        </Field>

        <Field id="property-type" label="Type" required>
          <Select
            id="property-type"
            name="propertyType"
            defaultValue={defaults?.propertyType ?? 'residential'}
          >
            {PROPERTY_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="property-reference" label="Reference" error={state.fieldErrors?.reference}>
          <TextInput
            id="property-reference"
            name="reference"
            defaultValue={defaults?.reference ?? ''}
            placeholder="e.g. YB/COURT/01"
          />
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
              defaultValue={defaults?.addressLine}
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
            defaultValue={defaults?.stateCode ?? 'LA'}
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
          <TextInput
            id="property-lga"
            name="lga"
            defaultValue={defaults?.lga ?? ''}
            placeholder="e.g. Eti-Osa"
          />
        </Field>

        <Field id="property-area" label="Area" error={state.fieldErrors?.area}>
          <TextInput
            id="property-area"
            name="area"
            defaultValue={defaults?.area ?? ''}
            placeholder="e.g. Lekki Phase 1"
          />
        </Field>

        <Field id="property-notes" label="Notes" error={state.fieldErrors?.notes}>
          <TextInput
            id="property-notes"
            name="notes"
            defaultValue={defaults?.notes ?? ''}
            placeholder="Access, caretaker, quirks"
          />
        </Field>

        <Field id="property-latitude" label="Latitude" error={state.fieldErrors?.latitude}>
          <TextInput
            id="property-latitude"
            name="latitude"
            type="number"
            step="any"
            defaultValue={defaults?.latitude ?? ''}
            placeholder="6.4478"
          />
        </Field>

        <Field id="property-longitude" label="Longitude" error={state.fieldErrors?.longitude}>
          <TextInput
            id="property-longitude"
            name="longitude"
            type="number"
            step="any"
            defaultValue={defaults?.longitude ?? ''}
            placeholder="3.4723"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : propertyId === undefined ? 'Add property' : 'Save property'}
        </Button>
        <LinkButton
          href={propertyId === undefined ? '/properties' : `/properties/${propertyId}`}
          variant="secondary"
        >
          Cancel
        </LinkButton>
      </div>
    </form>
  );
};
