import Link from 'next/link';

import {
  LEGAL_ENTITY,
  LEGAL_ENTITY_NOTE,
  LEGAL_LAST_UPDATED,
  LEGAL_PAGES,
  LEGAL_REVIEW_STATUS,
  PRIVACY_EMAIL,
  SECURITY_EMAIL,
} from '../../../lib/legal';

export const metadata = {
  title: 'Legal & trust — Tenaville',
  description: 'Draft legal policies, privacy notice, data processing agreement and trust information.',
};

const STATUS_STYLES = {
  Draft: 'bg-warning-soft text-warning-text',
  Template: 'bg-info-soft text-info-text',
  'Pending clearance': 'bg-danger-soft text-danger-text',
} as const;

export default function LegalIndexPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Legal & trust</p>
        <h1 className="font-display text-3xl text-text sm:text-4xl">Policies and launch gates</h1>
        <p className="max-w-3xl text-sm leading-7 text-muted">
          This is the public index of Tenaville's legal documents. Every page is a working draft for
          review by qualified Nigerian counsel. Reading it does not create a lawyer-client
          relationship, and it is not legal advice.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-warning-soft px-3 py-1 font-medium text-warning-text">
            {LEGAL_REVIEW_STATUS}
          </span>
          <span className="rounded-full bg-surface2 px-3 py-1 text-muted">
            Last updated {LEGAL_LAST_UPDATED}
          </span>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {LEGAL_PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="group rounded-lg border border-border bg-surface p-5 shadow-sm transition-colors hover:border-primary"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-lg text-text group-hover:text-primary">
                {page.title}
              </h2>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[page.status]}`}
              >
                {page.status}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{page.summary}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="font-display text-xl text-text">Before these documents take effect</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
          <li>Identify the contracting entity, RC number, registered address and official domain.</li>
          <li>
            Have qualified Nigerian counsel review every page, including the controller/processor
            allocation and international-transfer position.
          </li>
          <li>
            Complete the NDPA privacy programme: lawful-basis mapping, retention schedule,
            processor agreements, breach playbook and data-subject request log.
          </li>
          <li>
            Confirm the WhatsApp Business, SMS and email providers and attach their current terms and
            subprocessor details.
          </li>
          <li>
            Confirm the client-money and payment-partner model with legal and accounting advisers
            before enabling gateway payments.
          </li>
          <li>Complete the name, trademark, domain and app-store clearance recorded on the status page.</li>
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="font-display text-xl text-text">Contact</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-subtle">Legal</dt>
            <dd className="text-text">
              <a className="text-info-text underline" href="mailto:legal@tenaville.ng">
                legal@tenaville.ng
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-subtle">Privacy and data requests</dt>
            <dd className="text-text">
              <a className="text-info-text underline" href={`mailto:${PRIVACY_EMAIL}`}>
                {PRIVACY_EMAIL}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-subtle">Security</dt>
            <dd className="text-text">
              <a className="text-info-text underline" href={`mailto:${SECURITY_EMAIL}`}>
                {SECURITY_EMAIL}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-subtle">Entity</dt>
            <dd className="text-text">{LEGAL_ENTITY}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-5 text-subtle">{LEGAL_ENTITY_NOTE}</p>
      </section>
    </div>
  );
}
