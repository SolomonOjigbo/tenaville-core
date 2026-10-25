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
