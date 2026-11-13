import Link from 'next/link';

import { LEGAL_EMAIL, LEGAL_PAGES, PRIVACY_EMAIL } from '../../lib/legal';

const SHORT_LINKS = LEGAL_PAGES.filter((page) =>
  ['/legal/privacy', '/legal/terms', '/legal/data-requests', '/legal/messaging-policy'].includes(
    page.href,
  ),
);

/** Public legal links for the sign-in shell and legal footer. */
export const LegalFooter = () => (
  <footer className="space-y-3 text-center text-xs leading-6 text-muted">
    <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-4 gap-y-1">
      <Link href="/legal" className="hover:text-text">
        Legal & trust
      </Link>
      {SHORT_LINKS.map((page) => (
        <Link key={page.href} href={page.href} className="hover:text-text">
          {page.title}
        </Link>
      ))}
    </nav>
    <p>
      Tenaville is a working product name. Policies are drafts for Nigerian counsel review and are
      not legal advice.{' '}
      <a href={`mailto:${LEGAL_EMAIL}`} className="underline underline-offset-2">
        {LEGAL_EMAIL}
      </a>
      {' · '}
      <a href={`mailto:${PRIVACY_EMAIL}`} className="underline underline-offset-2">
        {PRIVACY_EMAIL}
      </a>
    </p>
  </footer>
);
