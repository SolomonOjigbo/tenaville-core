import Link from 'next/link';
import type { ReactNode } from 'react';

import { LegalFooter } from '../../components/legal/legal-footer';

/** Public legal shell. Kept outside the authenticated app layouts. */
export default function LegalLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link href="/legal" className="font-display text-xl text-text">
            Tenaville <span className="text-muted">Legal & trust</span>
          </Link>
          <nav aria-label="Legal pages" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <Link href="/legal/privacy" className="hover:text-text">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-text">
              Terms
            </Link>
            <Link href="/legal/data-processing-agreement" className="hover:text-text">
              DPA
            </Link>
            <Link href="/legal/data-requests" className="hover:text-text">
              Data requests
            </Link>
            <Link href="/legal" className="hover:text-text">
              All policies
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">{children}</main>

      <div className="mx-auto max-w-4xl px-5 pb-10">
        <LegalFooter />
      </div>
    </div>
  );
}
