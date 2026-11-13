'use client';

import { useActionState } from 'react';

import { Button, Field, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { uploadPropertyPhotoAction } from '../../server/portfolio-actions';
import type { ActionResult } from '../../server/auth-actions';

export const PropertyPhotoForm = ({ propertyId }: { readonly propertyId: string }) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    uploadPropertyPhotoAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <Field id="photo-caption" label="Caption">
        <TextInput
          id="photo-caption"
          name="caption"
          maxLength={200}
          placeholder="Front elevation"
        />
      </Field>
      <Field id="photo-file" label="Photo" required error={state.fieldErrors?.file}>
        <input
          id="photo-file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          required
          className="block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text file:mr-3 file:rounded file:border-0 file:bg-surface2 file:px-3 file:py-2 file:text-sm"
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Uploading…' : 'Add photo'}
      </Button>
    </form>
  );
};
