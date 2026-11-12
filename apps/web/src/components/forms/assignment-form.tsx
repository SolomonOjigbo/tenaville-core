'use client';

import { useActionState } from 'react';

import { MAINTENANCE_PRIORITIES, MAINTENANCE_PRIORITY_LABELS } from '@tenaville/core/maintenance';

import { Button, Field, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { assignMaintenanceRequestAction } from '../../server/maintenance-actions';
import type { ActionResult } from '../../server/auth-actions';

export interface StaffOption {
  readonly id: string;
  readonly label: string;
}

export interface VendorOption {
  readonly id: string;
  readonly label: string;
}

/** Assignment: responsible staff, coordinator, vendor, priority, due date (MAINT-4). */
export const AssignmentForm = ({
  requestId,
  staff,
  vendors,
  defaults,
}: {
  readonly requestId: string;
  readonly staff: readonly StaffOption[];
  readonly vendors: readonly VendorOption[];
  readonly defaults: {
    readonly assigneeUserId: string | null;
    readonly coordinatorUserId: string | null;
    readonly vendorId: string | null;
    readonly priority: string;
    readonly dueOn: string | null;
  };
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    assignMaintenanceRequestAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="requestId" value={requestId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="assign-assignee" label="Responsible staff member">
          <Select
            id="assign-assignee"
            name="assigneeUserId"
            defaultValue={defaults.assigneeUserId ?? ''}
          >
            <option value="">Unassigned</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="assign-coordinator" label="Coordinator">
          <Select
            id="assign-coordinator"
            name="coordinatorUserId"
            defaultValue={defaults.coordinatorUserId ?? ''}
          >
            <option value="">No separate coordinator</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="assign-vendor" label="Vendor">
          <Select id="assign-vendor" name="vendorId" defaultValue={defaults.vendorId ?? ''}>
            <option value="">No vendor yet</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="assign-priority" label="Priority">
          <Select id="assign-priority" name="priority" defaultValue={defaults.priority}>
            {MAINTENANCE_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {MAINTENANCE_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="assign-due" label="Target date">
          <TextInput id="assign-due" name="dueOn" type="date" defaultValue={defaults.dueOn ?? ''} />
        </Field>

        <div className="sm:col-span-2">
          <Field id="assign-note" label="Assignment note" hint="Added to the repair timeline.">
            <TextInput id="assign-note" name="note" placeholder="e.g. Please attend Thursday" />
          </Field>
        </div>
      </div>

      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Saving…' : 'Save assignment'}
      </Button>
    </form>
  );
};
