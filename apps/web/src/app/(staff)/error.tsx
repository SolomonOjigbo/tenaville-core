'use client';

import Link from 'next/link';

import { Button, Card, CardBody } from '../../components/ui';

/**
 * A page-level failure inside the staff shell.
 *
 * The shell and navigation stay put, so the user can move somewhere useful
 * without losing their bearings — which is the reason this boundary exists
 * alongside the root one.
 */
export default function StaffError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardBody className="space-y-4 text-center">
        <h1 className="font-display text-xl text-text">That screen could not load</h1>
        <p className="mx-auto max-w-prose text-sm text-muted">
          Your data has not been changed. Try again; if it keeps happening, quote the reference
          below to your administrator.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Link
            href="/dashboard"
            className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-surface px-4 font-medium text-text hover:bg-surface2"
          >
            Back to dashboard
          </Link>
        </div>
        {error.digest !== undefined && (
          <p className="text-xs text-subtle">
            Reference: <span className="tabular font-mono text-muted">{error.digest}</span>
          </p>
        )}
      </CardBody>
    </Card>
  );
}
