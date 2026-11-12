'use client';

import { useActionState } from 'react';

import { Button, Field, LinkButton, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { createTenantAction } from '../../server/tenancy-actions';
import type { ActionResult } from '../../server/auth-actions';

/** Record a tenant (LEASE-1). Third-party contact details are a later action. */
export const TenantForm = () => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createTenantAction, {});

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="tenant-name"
          label="Tenant name"
          required
          hint="The name that appears on receipts and the tenancy."
          error={state.fieldErrors?.displayName}
        >
          <TextInput
            id="tenant-name"
            name="displayName"
            required
            placeholder="e.g. Tunde Ade"
            invalid={state.fieldErrors?.displayName !== undefined}
          />
        </Field>

        <Field id="tenant-kind" label="Type" required>
          <Select id="tenant-kind" name="kind" defaultValue="individual">
            <option value="individual">Individual</option>
            <option value="organisation">Organisation</option>
          </Select>
        </Field>

        <Field id="tenant-phone" label="Phone" error={state.fieldErrors?.phone}>
          <TextInput
            id="tenant-phone"
            name="phone"
            type="tel"
            placeholder="08030000000"
            invalid={state.fieldErrors?.phone !== undefined}
          />
        </Field>

        <Field id="tenant-email" label="Email" error={state.fieldErrors?.email}>
          <TextInput
            id="tenant-email"
            name="email"
            type="email"
            placeholder="tenant@example.ng"
            invalid={state.fieldErrors?.email !== undefined}
          />
        </Field>

        <Field id="tenant-channel" label="Preferred channel">
          <Select id="tenant-channel" name="preferredChannel" defaultValue="whatsapp">
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </Select>
        </Field>

        <Field id="tenant-occupation" label="Occupation" error={state.fieldErrors?.occupation}>
          <TextInput id="tenant-occupation" name="occupation" placeholder="e.g. Teacher" />
        </Field>

        <div className="sm:col-span-2">
          <Field id="tenant-notes" label="Notes" error={state.fieldErrors?.notes}>
            <TextInput id="tenant-notes" name="notes" placeholder="Anything worth remembering" />
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Add tenant'}
        </Button>
        <LinkButton href="/tenants" variant="secondary">
          Cancel
        </LinkButton>
      </div>
    </form>
  );
};
