import Link from 'next/link';

import { Card, CardBody } from '../../../components/ui';

export default async function VerifyEmailPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const email = typeof params.email === 'string' ? params.email : null;

  return (
    <Card>
      <CardBody className="space-y-3">
        <h1 className="font-display text-xl text-text">Confirm your email</h1>
        <p className="text-sm text-muted">
          {email === null
            ? 'We have sent you a confirmation link.'
            : `We have sent a confirmation link to ${email}.`}{' '}
          Open it to finish setting up your account.
        </p>
        <p className="text-sm text-muted">
          Check your spam folder if it has not arrived within a few minutes.
        </p>
        <p className="text-sm text-muted">
          <Link href="/sign-in" className="text-primary underline">
            Back to sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
