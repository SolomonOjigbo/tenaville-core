'use client';

import { useActionState } from 'react';

import { Button, Field, LinkButton, MoneyInput, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { createLeaseAction } from '../../server/tenancy-actions';
import type { ActionResult } from '../../server/auth-actions';

export interface UnitOption {
  readonly id: string;
  readonly label: string;
}

export interface TenantOption {
  readonly id: string;
  readonly label: string;
}

/**
 * Create and activate a lease (LEASE-3, LEASE-12).
 *
 * Activation is part of the same submission because a lease that is active but
 * uncharged owes nothing and looks healthy; if the schedule cannot be raised
 * the lease lands as a draft with a warning on its own screen.
 */
export const LeaseForm = ({
  units,
  tenants,
  today,
  suggestedEnd,
}: {
  readonly units: readonly UnitOption[];
  readonly tenants: readonly TenantOption[];
  readonly today: string;
  readonly suggestedEnd: string;
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createLeaseAction, {});

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="lease-unit"
          label="Unit"
          required
          hint="Only vacant units you can reach are listed."
          error={state.fieldErrors?.unitId}
        >
          <Select
            id="lease-unit"
            name="unitId"
            required
            defaultValue={units[0]?.id ?? ''}
            invalid={state.fieldErrors?.unitId !== undefined}
          >
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="lease-tenant" label="Tenant" required error={state.fieldErrors?.tenantId}>
          <Select
            id="lease-tenant"
            name="tenantId"
            required
            defaultValue={tenants[0]?.id ?? ''}
            invalid={state.fieldErrors?.tenantId !== undefined}
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="lease-reference" label="Reference" error={state.fieldErrors?.reference}>
          <TextInput id="lease-reference" name="reference" placeholder="e.g. YB/2026/01" />
        </Field>

        <Field
          id="lease-rent"
          label="Rent for the term"
          required
          hint="The amount each period is charged, not the annualised total."
          error={state.fieldErrors?.rent}
        >
          <MoneyInput
            id="lease-rent"
            name="rent"
            required
            placeholder="1,200,000.00"
            autoComplete="off"
            invalid={state.fieldErrors?.rent !== undefined}
          />
        </Field>

        <Field id="lease-start" label="Starts" required error={state.fieldErrors?.startsOn}>
          <TextInput
            id="lease-start"
            name="startsOn"
            type="date"
            required
            defaultValue={today}
            invalid={state.fieldErrors?.startsOn !== undefined}
          />
        </Field>

        <Field id="lease-end" label="Ends" required error={state.fieldErrors?.endsOn}>
          <TextInput
            id="lease-end"
            name="endsOn"
            type="date"
            required
            defaultValue={suggestedEnd}
            invalid={state.fieldErrors?.endsOn !== undefined}
          />
        </Field>

        <Field
          id="lease-frequency"
          label="Rent frequency"
          required
          hint="The schedule is derived from this and the term."
        >
          <Select id="lease-frequency" name="frequency" defaultValue="annual">
            <option value="annual">Annual</option>
            <option value="half_yearly">Half-yearly</option>
            <option value="quarterly">Quarterly</option>
            <option value="monthly">Monthly</option>
          </Select>
        </Field>

        <Field
          id="lease-due-day"
          label="Rent due day"
          hint="1–28 for monthly or quarterly terms. Leave blank for the period start."
          error={state.fieldErrors?.dueDay}
        >
          <TextInput id="lease-due-day" name="dueDay" type="number" min={1} max={28} />
        </Field>

        <Field
          id="lease-deposit"
          label="Caution deposit"
          hint="Optional. Held as client money and accounted for separately."
          error={state.fieldErrors?.deposit}
        >
          <MoneyInput
            id="lease-deposit"
            name="deposit"
            placeholder="600,000.00"
            autoComplete="off"
            invalid={state.fieldErrors?.deposit !== undefined}
          />
        </Field>

        <Field id="lease-custodian" label="Deposit held by">
          <Select id="lease-custodian" name="custodian" defaultValue="agency">
            <option value="agency">Agency</option>
            <option value="landlord">Landlord</option>
          </Select>
        </Field>
      </div>

      <p className="text-sm text-muted">
        The rent schedule is raised from these terms when you save. The due dates appear on the
        lease immediately, so a wrong end date is visible before the tenant is told.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create and activate lease'}
        </Button>
        <LinkButton href="/leases" variant="secondary">
          Cancel
        </LinkButton>
      </div>
    </form>
  );
};
