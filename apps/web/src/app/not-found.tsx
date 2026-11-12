import Link from 'next/link';

import { Card, CardBody, LinkButton } from '../components/ui';

/**
 * The 404 for a route that does not exist (or that the viewer cannot reach,
 * where a policy deliberately makes the two indistinguishable).
 *
 * It offers both exits an authenticated user might want, and neither requires
 * knowing whether they are signed in: /dashboard redirects to sign-in if not.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <CardBody className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-wide text-subtle">404</p>
          <h1 className="font-display text-2xl text-text">That page does not exist</h1>
          <p className="text-sm text-muted">
            The address may be mistyped, or the page may have moved. Nothing has been changed.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <LinkButton href="/dashboard">Go to dashboard</LinkButton>
            <LinkButton href="/sign-in" variant="secondary">
              Sign in
            </LinkButton>
          </div>
          <p className="text-xs text-subtle">
            Need help? Ask your administrator, or{' '}
            <Link href="/sign-in" className="text-info-text underline-offset-2 hover:underline">
              sign in
            </Link>{' '}
            again.
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
