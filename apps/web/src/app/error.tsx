'use client';

import Link from 'next/link';

import { Button } from '../components/ui';

/**
 * The last-resort boundary for a failure above the staff shell.
 *
 * It deliberately shows no error message: a thrown database error can contain
 * a query or a table name, which is not something to print to a user. The
 * digest is safe to quote to support and is the only detail worth keeping.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-lg border border-border bg-surface p-6 text-center shadow-sm">
        <h1 className="font-display text-2xl text-text">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">
          This screen could not be loaded. Your data has not been changed — try again, and if it
          keeps happening quote the reference below.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Link
            href="/dashboard"
            className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-surface px-4 font-medium text-text hover:bg-surface2"
          >
            Go to dashboard
          </Link>
        </div>
        {error.digest !== undefined && (
          <p className="mt-4 text-xs text-subtle">
            Reference: <span className="tabular font-mono text-muted">{error.digest}</span>
          </p>
        )}
      </div>
    </main>
  );
}
