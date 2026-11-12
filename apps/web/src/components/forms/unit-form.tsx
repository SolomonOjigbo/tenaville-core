'use client';

import { useActionState } from 'react';

import { Button, Field, MoneyInput, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { createUnitAction } from '../../server/portfolio-actions';
import type { ActionResult } from '../../server/auth-actions';

const UNIT_TYPES = [
  ['flat', 'Flat'],
  ['self_contained', 'Self contained'],
  ['room', 'Room'],
  ['duplex', 'Duplex'],
  ['bungalow', 'Bungalow'],
  ['shop', 'Shop'],
  ['office', 'Office'],
  ['warehouse', 'Warehouse'],
  ['other', 'Other'],
] as const;

/** Add a unit to a property (PROP-2). Asking rent is the advertised figure. */
export const UnitForm = ({ propertyId }: { readonly propertyId: string }) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createUnitAction, {});

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="propertyId" value={propertyId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="unit-label" label="Unit label" required error={state.fieldErrors?.label}>
          <TextInput
            id="unit-label"
            name="label"
            required
            placeholder="e.g. Flat 1"
            invalid={state.fieldErrors?.label !== undefined}
          />
        </Field>

        <Field id="unit-type" label="Type" required>
          <Select id="unit-type" name="unitType" defaultValue="flat">
            {UNIT_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="unit-bedrooms" label="Bedrooms" error={state.fieldErrors?.bedrooms}>
          <TextInput id="unit-bedrooms" name="bedrooms" type="number" min={0} max={50} />
        </Field>

        <Field id="unit-bathrooms" label="Bathrooms" error={state.fieldErrors?.bathrooms}>
          <TextInput id="unit-bathrooms" name="bathrooms" type="number" min={0} max={50} />
        </Field>

        <Field
          id="unit-rent"
          label="Asking rent"
          hint="Annual, as advertised. The lease is authoritative once there is one."
          error={state.fieldErrors?.askingRent}
        >
          <MoneyInput
            id="unit-rent"
            name="askingRent"
            placeholder="1,200,000.00"
            autoComplete="off"
            invalid={state.fieldErrors?.askingRent !== undefined}
          />
        </Field>

        <Field id="unit-notes" label="Notes" error={state.fieldErrors?.notes}>
          <TextInput id="unit-notes" name="notes" placeholder="Anything a viewing should know" />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add unit'}
      </Button>
    </form>
  );
};
