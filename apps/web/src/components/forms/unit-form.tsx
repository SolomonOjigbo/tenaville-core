'use client';

import { useActionState } from 'react';

import { Button, Field, MoneyInput, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { createUnitAction, updateUnitAction } from '../../server/portfolio-actions';
import type { ActionResult } from '../../server/auth-actions';

export interface UnitDefaults {
  readonly label: string;
  readonly reference: string | null;
  readonly unitType: string;
  readonly status: string;
  readonly bedrooms: number | null;
  readonly bathrooms: number | null;
  readonly floorAreaSqm: number | null;
  readonly askingRent: string | null;
  readonly facilities: readonly string[];
  readonly notes: string | null;
}

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

const UNIT_STATUSES = [
  ['vacant', 'Vacant'],
  ['occupied', 'Occupied'],
  ['reserved', 'Reserved'],
  ['under_maintenance', 'Under maintenance'],
  ['inactive', 'Inactive'],
] as const;

const textareaClass =
  'min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-subtle';

/** Add or edit a unit (PROP-2). Asking rent is the advertised figure. */
export const UnitForm = ({
  propertyId,
  unitId,
  defaults,
}: {
  readonly propertyId: string;
  readonly unitId?: string;
  readonly defaults?: UnitDefaults;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    unitId === undefined ? createUnitAction : updateUnitAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="propertyId" value={propertyId} />
      {unitId !== undefined && <input type="hidden" name="unitId" value={unitId} />}
      {unitId === undefined && <input type="hidden" name="status" value="vacant" />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="unit-label" label="Unit label" required error={state.fieldErrors?.label}>
          <TextInput
            id="unit-label"
            name="label"
            required
            defaultValue={defaults?.label}
            placeholder="e.g. Flat 1"
            invalid={state.fieldErrors?.label !== undefined}
          />
        </Field>

        <Field id="unit-reference" label="Reference" error={state.fieldErrors?.reference}>
          <TextInput
            id="unit-reference"
            name="reference"
            defaultValue={defaults?.reference ?? ''}
            placeholder="e.g. FLAT-1"
          />
        </Field>

        <Field id="unit-type" label="Type" required>
          <Select id="unit-type" name="unitType" defaultValue={defaults?.unitType ?? 'flat'}>
            {UNIT_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        {unitId !== undefined && (
          <Field id="unit-status" label="Status">
            <Select id="unit-status" name="status" defaultValue={defaults?.status ?? 'vacant'}>
              {UNIT_STATUSES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field id="unit-bedrooms" label="Bedrooms" error={state.fieldErrors?.bedrooms}>
          <TextInput
            id="unit-bedrooms"
            name="bedrooms"
            type="number"
            min={0}
            max={50}
            defaultValue={defaults?.bedrooms ?? ''}
          />
        </Field>

        <Field id="unit-bathrooms" label="Bathrooms" error={state.fieldErrors?.bathrooms}>
          <TextInput
            id="unit-bathrooms"
            name="bathrooms"
            type="number"
            min={0}
            max={50}
            defaultValue={defaults?.bathrooms ?? ''}
          />
        </Field>

        <Field
          id="unit-floor-area"
          label="Floor area (sqm)"
          error={state.fieldErrors?.floorAreaSqm}
        >
          <TextInput
            id="unit-floor-area"
            name="floorAreaSqm"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaults?.floorAreaSqm ?? ''}
          />
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
            defaultValue={defaults?.askingRent ?? ''}
            autoComplete="off"
            invalid={state.fieldErrors?.askingRent !== undefined}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field
            id="unit-facilities"
            label="Facilities"
            hint="Comma or line separated, e.g. borehole, gated, prepaid meter."
            error={state.fieldErrors?.facilities}
          >
            <textarea
              id="unit-facilities"
              name="facilities"
              className={textareaClass}
              defaultValue={(defaults?.facilities ?? []).join(', ')}
              placeholder="borehole, gated, prepaid meter"
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field id="unit-notes" label="Notes" error={state.fieldErrors?.notes}>
            <textarea
              id="unit-notes"
              name="notes"
              className={textareaClass}
              defaultValue={defaults?.notes ?? ''}
              placeholder="Anything a viewing should know"
            />
          </Field>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : unitId === undefined ? 'Add unit' : 'Save unit'}
      </Button>
    </form>
  );
};
