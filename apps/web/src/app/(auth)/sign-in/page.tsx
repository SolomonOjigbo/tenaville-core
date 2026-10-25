import Link from 'next/link';

import { SignInForm } from '../../../components/auth/sign-in-form';
import { Card, CardBody } from '../../../components/ui';
import { safeRedirect } from '../../../lib/auth';

const LINK_MESSAGES: Record<string, string> = {
  'link-expired': 'That link has expired or was already used. Request a new one below.',
  'link-invalid': 'That link was not valid. Request a new one below.',
};

export default async function SignInPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Sanitised here rather than in the form: the value arrives in a URL and must
  // not be trusted even to render into a hidden input.
  const next = safeRedirect(typeof params.next === 'string' ? params.next : null);
  const linkError = typeof params.error === 'string' ? LINK_MESSAGES[params.error] : undefined;

  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <h1 className="font-display text-xl text-text">Sign in</h1>
          <p className="mt-1 text-sm text-muted">
            Agency staff, landlords and tenants sign in here.
          </p>
        </div>

        {linkError !== undefined && (
          <p
            role="alert"
            className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-text"
          >
            {linkError}
          </p>
        )}

        <SignInForm next={next} />

        <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
          <Link href="/forgot-password" className="text-primary underline">
            Forgot your password?
          </Link>
          <Link href="/sign-up" className="text-primary underline">
            Create an account
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
