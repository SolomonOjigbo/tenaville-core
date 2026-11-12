'use client';

import { useActionState, useState } from 'react';

import { MAINTENANCE_CATEGORIES, MAINTENANCE_URGENCIES } from '@tenaville/core/maintenance';

import { Button, Field, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { createMaintenanceRequestAction } from '../../server/maintenance-actions';
import type { ActionResult } from '../../server/auth-actions';

export interface MaintenanceUnitOption {
  readonly id: string;
  readonly label: string;
}

export interface MaintenancePropertyOption {
  readonly id: string;
  readonly label: string;
  readonly units: readonly MaintenanceUnitOption[];
}

export interface MaintenanceLeaseOption {
  readonly id: string;
  readonly label: string;
  readonly propertyId: string;
  readonly propertyLabel: string;
  readonly unitId: string;
  readonly unitLabel: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  structural: 'Structural',
  appliance: 'Appliance',
  hvac: 'HVAC',
  pest: 'Pest control',
  cleaning: 'Cleaning',
  security: 'Security',
  other: 'Other',
};

const URGENCY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  emergency: 'Emergency',
};

const textareaClass =
  'min-h-[110px] w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-subtle';

/** Staff and tenant repair intake (MAINT-1, MAINT-2, TENANT-4). */
export const MaintenanceRequestForm = ({
  mode,
  properties = [],
  leases = [],
}: {
  readonly mode: 'staff' | 'tenant';
  readonly properties?: readonly MaintenancePropertyOption[];
  readonly leases?: readonly MaintenanceLeaseOption[];
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    createMaintenanceRequestAction,
    {},
  );
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? '');
  const [leaseId, setLeaseId] = useState(leases[0]?.id ?? '');

  const lease = leases.find((option) => option.id === leaseId) ?? leases[0];
  const units = properties.find((property) => property.id === propertyId)?.units ?? [];

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />

      {mode === 'tenant' ? (
        lease === undefined ? (
          <p className="text-sm text-danger-text">No active tenancy was found.</p>
        ) : (
          <>
            <input type="hidden" name="propertyId" value={lease.propertyId} />
            <input type="hidden" name="unitId" value={lease.unitId} />
            <input type="hidden" name="leaseId" value={lease.id} />
            <div className="rounded-md bg-surface2 px-4 py-3 text-sm">
              <p className="text-text">{lease.propertyLabel}</p>
              <p className="text-xs text-muted">{lease.unitLabel}</p>
              {leases.length > 1 && (
                <div className="mt-3">
                  <Field id="request-lease" label="Tenancy">
                    <Select
                      id="request-lease"
                      value={leaseId}
                      onChange={(event) => setLeaseId(event.target.value)}
                    >
                      {leases.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}
            </div>
          </>
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="request-property"
            label="Property"
            required
            error={state.fieldErrors?.propertyId}
          >
            <Select
              id="request-property"
              name="propertyId"
              required
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
            >
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            id="request-unit"
            label="Unit"
            hint="Leave on the whole building if the repair is not unit-specific."
          >
            <Select id="request-unit" name="unitId" defaultValue="">
              <option value="">Whole property</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="request-category" label="Category" required>
          <Select id="request-category" name="category" defaultValue="plumbing" required>
            {MAINTENANCE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="request-urgency" label="Urgency" required>
          <Select id="request-urgency" name="urgency" defaultValue="normal" required>
            {MAINTENANCE_URGENCIES.map((urgency) => (
              <option key={urgency} value={urgency}>
                {URGENCY_LABELS[urgency]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        id="request-description"
        label="What is wrong?"
        required
        hint="The more specific, the faster it can be fixed."
        error={state.fieldErrors?.description}
      >
        <textarea
          id="request-description"
          name="description"
          required
          minLength={5}
          maxLength={4000}
          className={textareaClass}
          placeholder="e.g. The kitchen tap is leaking and the cabinet is getting wet"
        />
      </Field>

      <label className="flex items-start gap-3 rounded-md border border-border px-4 py-3 text-sm">
        <input type="checkbox" name="isSafetyIssue" className="mt-0.5 size-4" />
        <span>
          <span className="block font-medium text-text">Safety or habitability issue</span>
          <span className="block text-xs text-muted">
            Flag this if someone could be hurt or the home is not safely liveable.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="request-access" label="Access constraints">
          <TextInput
            id="request-access"
            name="accessConstraints"
            placeholder="e.g. gate code, dog, no access before 9am"
          />
        </Field>
        <Field id="request-times" label="Preferred access times">
          <TextInput
            id="request-times"
            name="preferredAccessTimes"
            placeholder="e.g. weekday mornings, weekends"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Submitting…' : mode === 'tenant' ? 'Submit request' : 'Log request'}
        </Button>
      </div>
    </form>
  );
};
