'use client';

import { useActionState } from 'react';

import { Button, Field, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { sendMessageAction } from '../../server/comms-actions';
import type { ActionResult } from '../../server/auth-actions';

export interface TemplateOption {
  readonly id: string;
  readonly label: string;
  readonly channel: string;
  readonly approved: boolean;
}

export interface RecipientOption {
  readonly id: string;
  readonly label: string;
}

/** Send a templated message (COMMS-1, COMMS-2, COMMS-8). */
export const SendMessageForm = ({
  templates,
  recipients,
}: {
  readonly templates: readonly TemplateOption[];
  readonly recipients: readonly RecipientOption[];
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(sendMessageAction, {});

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />

      <Field id="message-template" label="Template" required>
        <Select
          id="message-template"
          name="templateId"
          required
          defaultValue={templates[0]?.id ?? ''}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
              {template.channel === 'whatsapp' && !template.approved
                ? ' — WhatsApp not yet approved, will fall back'
                : ''}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="message-recipient" label="To" required>
          <Select
            id="message-recipient"
            name="recipientUserId"
            required
            defaultValue={recipients[0]?.id ?? ''}
          >
            {recipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          id="message-purpose"
          label="Purpose"
          hint="Marketing needs an opt-in; operational tenancy messages do not."
        >
          <Select id="message-purpose" name="purpose" defaultValue="operational">
            <option value="operational">Operational</option>
            <option value="marketing">Marketing</option>
          </Select>
        </Field>
      </div>

      <Field id="message-related" label="Related record" hint="Optional, for the log.">
        <TextInput id="message-related" name="relatedType" placeholder="e.g. charge, lease" />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  );
};
