'use client';

import { useActionState, useState } from 'react';

import { Button, Field, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import { generateDocumentAlertsAction, uploadDocumentAction } from '../../server/document-actions';
import type { ActionResult } from '../../server/auth-actions';

export interface DocumentEntityGroup {
  readonly type: string;
  readonly label: string;
  readonly items: readonly { readonly id: string; readonly label: string }[];
}

const DOCUMENT_TYPES: readonly [string, string][] = [
  ['lease_agreement', 'Lease agreement'],
  ['tenancy_agreement', 'Tenancy agreement'],
  ['identification', 'Identification'],
  ['proof_of_ownership', 'Proof of ownership'],
  ['inspection_report', 'Inspection report'],
  ['insurance', 'Insurance'],
  ['receipt', 'Receipt'],
  ['statement', 'Statement'],
  ['notice', 'Notice'],
  ['photo', 'Photo'],
  ['other', 'Other'],
];

const textareaClass =
  'min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-subtle';

/** Upload a private document and register it (DOC-1, DOC-2). */
export const DocumentUploadForm = ({
  groups,
}: {
  readonly groups: readonly DocumentEntityGroup[];
}) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(uploadDocumentAction, {});
  const [entityType, setEntityType] = useState(groups[0]?.type ?? 'property');
  const group = groups.find((candidate) => candidate.type === entityType) ?? groups[0];

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="document-entity-type" label="Attach to" required>
          <Select
            id="document-entity-type"
            name="entityType"
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
          >
            {groups.map((candidate) => (
              <option key={candidate.type} value={candidate.type}>
                {candidate.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="document-entity" label="Record" required error={state.fieldErrors?.entityId}>
          <Select
            id="document-entity"
            name="entityId"
            required
            defaultValue={group?.items[0]?.id ?? ''}
          >
            {(group?.items ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field id="document-file" label="File" required error={state.fieldErrors?.file}>
        <input
          id="document-file"
          name="file"
          type="file"
          required
          className="block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text file:mr-3 file:rounded file:border-0 file:bg-surface2 file:px-3 file:py-2 file:text-sm"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="document-title" label="Title" hint="What the office will search for.">
          <TextInput id="document-title" name="title" placeholder="e.g. Signed tenancy agreement" />
        </Field>
        <Field id="document-type" label="Document type">
          <Select id="document-type" name="documentType" defaultValue="other">
            {DOCUMENT_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="document-issue" label="Issue date">
          <TextInput id="document-issue" name="issueDate" type="date" />
        </Field>
        <Field id="document-expiry" label="Expiry date" hint="Used for expiry alerts.">
          <TextInput id="document-expiry" name="expiryDate" type="date" />
        </Field>
      </div>

      <Field id="document-notes" label="Notes">
        <textarea id="document-notes" name="notes" className={textareaClass} />
      </Field>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="sensitive" className="size-4" />
        <span>Mark as sensitive</span>
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? 'Uploading…' : 'Upload document'}
      </Button>
    </form>
  );
};

/** Turn expiring documents into tasks (DOC-5). */
export const GenerateDocumentAlertsForm = () => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    async () => generateDocumentAlertsAction(),
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <FormBanner state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Checking…' : 'Create expiry alerts'}
      </Button>
    </form>
  );
};
