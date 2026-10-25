'use client';

import { useActionState } from 'react';

import { Button, Field, Select, TextInput } from '../ui';
import { invitePerson } from '../../server/people-actions';
import type { ActionResult } from '../../server/auth-actions';

/**
 * Invite a colleague.
 *
 * The role list is narrowed to what the current user may actually assign: only
 * an owner may invite another owner, and offering a choice that will then be
 * refused is worse than not offering it.
 */
export const InviteForm = ({
  organisationId,
  assignableRoles,
}: {
  readonly organisationId: string;
  readonly assignableRoles: readonly { value: string; label: string }[];
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(invitePerson, {});

  return (
    <form action={action} className="space-y-4">
      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {state.error}
        </p>
      )}
      {state.message !== undefined && (
        <p role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-success-text">
          {state.message}
        </p>
      )}

      <input type="hidden" name="organisationId" value={organisationId} />

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
        <Field id="invite-email" label="Email address" required error={state.fieldErrors?.email}>
          <TextInput
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="colleague@agency.ng"
            invalid={state.fieldErrors?.email !== undefined}
          />
        </Field>

        <Field id="invite-role" label="Role" required>
          <Select id="invite-role" name="role" defaultValue="property_manager">
            {assignableRoles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </Select>
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send invitation'}
        </Button>
      </div>
    </form>
  );
};
