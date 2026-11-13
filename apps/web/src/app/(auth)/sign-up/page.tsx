import Link from 'next/link';

import { SignUpForm } from '../../../components/auth/sign-up-form';
import { Card, CardBody } from '../../../components/ui';

export default function SignUpPage() {
  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <h1 className="font-display text-xl text-text">Create an account</h1>
          <p className="mt-1 text-sm text-muted">
            You will set up your agency or landlord account after confirming your email.
          </p>
        </div>

        <SignUpForm />

        <p className="text-xs leading-5 text-subtle">
          By creating an account you acknowledge our{' '}
          <Link href="/legal/privacy" className="text-info-text underline">
            Privacy Notice
          </Link>{' '}
          and{' '}
          <Link href="/legal/terms" className="text-info-text underline">
            Terms of Service
          </Link>
          . Agency accounts also operate under our{' '}
          <Link href="/legal/data-processing-agreement" className="text-info-text underline">
            Data Processing Agreement
          </Link>
          .
        </p>

        <p className="text-sm text-muted">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-primary underline">
            Sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
