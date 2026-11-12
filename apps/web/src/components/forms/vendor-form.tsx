'use client';

import { useActionState } from 'react';

import { Button, Field, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { createVendorAction } from '../../server/maintenance-actions';
import type { ActionResult } from '../../server/auth-actions';

const textareaClass =
  'min-h-[90px] w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-subtle';

/** Add a vendor to the directory (MAINT-6). */
export const VendorForm = () => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createVendorAction, {});

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="vendor-name" label="Vendor name" required error={state.fieldErrors?.name}>
          <TextInput id="vendor-name" name="name" required placeholder="e.g. FixIt Plumbing" />
        </Field>
        <Field id="vendor-trade" label="Trade" required error={state.fieldErrors?.trade}>
          <TextInput id="vendor-trade" name="trade" required placeholder="e.g. Plumbing" />
        </Field>
        <Field id="vendor-contact" label="Contact name">
          <TextInput id="vendor-contact" name="contactName" placeholder="Who to ask for" />
        </Field>
        <Field id="vendor-phone" label="Phone">
          <TextInput id="vendor-phone" name="phone" placeholder="+234 803 000 0000" />
        </Field>
        <Field id="vendor-email" label="Email">
          <TextInput id="vendor-email" name="email" type="email" placeholder="vendor@example.com" />
        </Field>
        <Field id="vendor-areas" label="Service areas" hint="Comma-separated">
          <TextInput id="vendor-areas" name="serviceAreas" placeholder="Lekki, Ikoyi" />
        </Field>
      </div>

      <Field id="vendor-availability" label="Availability notes">
        <textarea
          id="vendor-availability"
          name="availabilityNotes"
          className={textareaClass}
          placeholder="e.g. Monday to Saturday, emergency call-outs"
        />
      </Field>

      <Field id="vendor-performance" label="Internal performance notes">
        <textarea
          id="vendor-performance"
          name="performanceNotes"
          className={textareaClass}
          placeholder="e.g. reliable, invoices promptly, call before visiting"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Add vendor'}
        </Button>
      </div>
    </form>
  );
};
