'use client';

import { useActionState } from 'react';

import { Button, Field, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { saveTemplateAction } from '../../server/comms-actions';
import type { ActionResult } from '../../server/auth-actions';

const textareaClass =
  'min-h-[140px] w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-subtle';

/** Edit one template (COMMS-1). */
export const TemplateForm = ({
  template,
}: {
  readonly template: {
    readonly id: string;
    readonly name: string;
    readonly channel: string;
    readonly subject: string | null;
    readonly body: string;
    readonly active: boolean;
  };
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveTemplateAction, {});

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="templateId" value={template.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="template-name" label="Name" required>
          <TextInput id="template-name" name="name" defaultValue={template.name} required />
        </Field>
        {template.channel === 'email' && (
          <Field id="template-subject" label="Subject">
            <TextInput id="template-subject" name="subject" defaultValue={template.subject ?? ''} />
          </Field>
        )}
      </div>

      <Field
        id="template-body"
        label="Message"
        required
        hint="Merge fields: {{recipient_name}}, {{organisation_name}}, {{date}}"
        error={state.fieldErrors?.body}
      >
        <textarea
          id="template-body"
          name="body"
          required
          defaultValue={template.body}
          className={textareaClass}
        />
      </Field>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="active" className="size-4" defaultChecked={template.active} />
        <span>Active</span>
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save template'}
      </Button>
    </form>
  );
};
