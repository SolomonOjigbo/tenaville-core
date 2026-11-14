'use client';

import { useActionState, useState } from 'react';

import { Button, Field, Select } from '../ui';
import { FormBanner } from './form-banner';
import { createImportAction } from '../../server/import-actions';
import type { ActionResult } from '../../server/auth-actions';

const KINDS = [
  ['properties_units', 'Properties and units'],
  ['tenants_leases', 'Tenants and leases'],
  ['opening_balances', 'Opening balances'],
] as const;

const HINTS: Record<string, string> = {
  properties_units:
    'Columns: Property Name, Property Type, Address, State, LGA, Landlord, Unit, Unit Type, Status, Bedrooms, Rent.',
  tenants_leases:
    'Columns: Tenant Name, Tenant Email, Tenant Phone, Lease Reference, Property Name, Unit, Start Date, End Date, Rent, Frequency, Deposit.',
  opening_balances:
    'Columns: Account Type, Lease Reference, Landlord Name, Amount, Notes. Account types: tenant arrears, tenant credit, landlord credit, landlord debit.',
};

export const ImportForm = () => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createImportAction, {});
  const [kind, setKind] = useState<string>('properties_units');

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="import-kind" label="What are you importing?" required>
          <Select
            id="import-kind"
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            {KINDS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        {kind === 'opening_balances' && (
          <Field
            id="import-cutover"
            label="Cutover date"
            required
            error={state.fieldErrors?.cutoverOn}
          >
            <input
              id="import-cutover"
              name="cutoverOn"
              type="date"
              required
              className="min-h-[44px] w-full rounded-md border border-border bg-surface px-3 text-base text-text"
            />
          </Field>
        )}
      </div>

      <Field
        id="import-file"
        label="CSV file"
        hint={HINTS[kind]}
        required
        error={state.fieldErrors?.file}
      >
        <input
          id="import-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text file:mr-3 file:rounded file:border-0 file:bg-surface2 file:px-3 file:py-2 file:text-sm"
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? 'Validating…' : 'Validate without writing'}
      </Button>
    </form>
  );
};
