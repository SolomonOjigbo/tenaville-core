'use client';

import { useMemo, useState } from 'react';

import { Button, Field, Select, TextInput } from '../ui';

const REQUEST_TYPES = [
  ['access', 'Access — tell me what you hold about me'],
  ['correction', 'Correction — fix inaccurate data'],
  ['deletion', 'Deletion — erase data where applicable'],
  ['restriction', 'Restriction or objection'],
  ['portability', 'Portability — provide a copy in a usable format'],
  ['consent', 'Withdraw consent'],
  ['marketing', 'Stop marketing messages'],
  ['other', 'Something else'],
] as const;

const textareaClass =
  'min-h-[110px] w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-subtle';

/** Builds a request locally; nothing is sent or stored by this page. */
export const DataRequestBuilder = ({ privacyEmail }: { readonly privacyEmail: string }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('tenant');
  const [organisation, setOrganisation] = useState('');
  const [type, setType] = useState('access');
  const [details, setDetails] = useState('');
  const [copied, setCopied] = useState(false);

  const typeLabel = REQUEST_TYPES.find(([value]) => value === type)?.[1] ?? type;

  const body = useMemo(
    () =>
      [
        `Data subject request: ${typeLabel}`,
        '',
        `Name: ${name || '[your name]'}`,
        `Email: ${email || '[your email]'}`,
        `I am a: ${role}`,
        `Organisation / agency: ${organisation || '[if known]'}`,
        '',
        'Request details:',
        details || '[explain what you want and the relevant dates or records]',
        '',
        'I understand Tenaville may need to verify my identity before acting.',
      ].join('\n'),
    [details, email, name, organisation, role, typeLabel],
  );

  const mailto = `mailto:${privacyEmail}?subject=${encodeURIComponent(`Data subject request — ${typeLabel}`)}&body=${encodeURIComponent(body)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`To: ${privacyEmail}\nSubject: Data subject request — ${typeLabel}\n\n${body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="request-name" label="Your name" required>
          <TextInput id="request-name" value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field id="request-email" label="Your email" required>
          <TextInput
            id="request-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <Field id="request-role" label="You are a">
          <Select id="request-role" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="tenant">Tenant</option>
            <option value="landlord">Landlord</option>
            <option value="agency staff">Agency staff</option>
            <option value="applicant or contact">Applicant or contact</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field id="request-organisation" label="Agency or organisation" hint="If you know which one.">
          <TextInput
            id="request-organisation"
            value={organisation}
            onChange={(event) => setOrganisation(event.target.value)}
          />
        </Field>
      </div>

      <Field id="request-type" label="What are you asking for?">
        <Select id="request-type" value={type} onChange={(event) => setType(event.target.value)}>
          {REQUEST_TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="request-details"
        label="Details"
        hint="Do not include passwords, full NIN, BVN, card numbers or identity documents here."
      >
        <textarea
          id="request-details"
          className={textareaClass}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="Tell us what you want changed, deleted or explained, and any dates or records that help us find it."
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy request'}
        </Button>
        <a
          href={mailto}
          className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-base font-medium text-on-primary hover:bg-primary-hover"
        >
          Open email app
        </a>
      </div>

      <details className="text-sm text-muted">
        <summary className="cursor-pointer text-text">Preview the request</summary>
        <pre className="mt-3 whitespace-pre-wrap rounded-md bg-surface2 p-4 text-xs leading-6 text-text">
          {`To: ${privacyEmail}\nSubject: Data subject request — ${typeLabel}\n\n${body}`}
        </pre>
      </details>
    </div>
  );
};
