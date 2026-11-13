import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  LEGAL_EMAIL,
  LEGAL_ENTITY_NOTE,
  LEGAL_LAST_UPDATED,
  LEGAL_REVIEW_STATUS,
  PRIVACY_EMAIL,
} from '../../lib/legal';

export interface LegalSectionLink {
  readonly id: string;
  readonly label: string;
}

/** Shared shell for every legal page. */
export const LegalPage = ({
  title,
  summary,
  sections,
  children,
}: {
  readonly title: string;
  readonly summary: string;
  readonly sections?: readonly LegalSectionLink[] | undefined;
  readonly children: ReactNode;
}) => (
  <article className="space-y-8">
    <header className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Legal & trust</p>
      <h1 className="font-display text-3xl text-text sm:text-4xl">{title}</h1>
      <p className="max-w-3xl text-sm leading-7 text-muted">{summary}</p>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-warning-soft px-3 py-1 font-medium text-warning-text">
          {LEGAL_REVIEW_STATUS}
        </span>
        <span className="rounded-full bg-surface2 px-3 py-1 text-muted">
          Last updated {LEGAL_LAST_UPDATED}
        </span>
        <span className="rounded-full bg-surface2 px-3 py-1 text-muted">Not legal advice</span>
      </div>
    </header>

    <div className="rounded-lg border border-warning bg-warning-soft/50 px-5 py-4 text-sm leading-6 text-warning-text">
      <strong>Draft status.</strong> This page records the product's intended position for review by
      qualified Nigerian counsel. It is not yet an executed legal document. {LEGAL_ENTITY_NOTE}
    </div>

    {sections !== undefined && sections.length > 0 && (
      <nav aria-label="On this page" className="rounded-lg border border-border bg-surface px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-subtle">On this page</p>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-info-text underline-offset-2 hover:underline">
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    )}

    <div className="space-y-8 text-sm leading-7 text-text">{children}</div>

    <footer className="rounded-lg border border-border bg-surface px-5 py-4 text-xs leading-6 text-muted">
      Questions about this page: <a className="text-info-text underline" href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>
      {' · '}
      Privacy requests: <a className="text-info-text underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
      {' · '}
      <Link href="/legal" className="text-info-text underline">
        Legal & trust centre
      </Link>
    </footer>
  </article>
);

export const LegalSection = ({
  id,
  title,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
}) => (
  <section id={id} className="scroll-mt-6 space-y-3">
    <h2 className="font-display text-xl text-text">{title}</h2>
    {children}
  </section>
);

export const LegalList = ({ children }: { readonly children: ReactNode }) => (
  <ul className="list-disc space-y-1.5 pl-5">{children}</ul>
);
