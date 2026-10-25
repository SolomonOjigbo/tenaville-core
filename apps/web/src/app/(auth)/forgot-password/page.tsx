import Link from 'next/link';

import { ForgotPasswordForm } from '../../../components/auth/forgot-password-form';
import { Card, CardBody } from '../../../components/ui';

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <h1 className="font-display text-xl text-text">Reset your password</h1>
          <p className="mt-1 text-sm text-muted">We will email you a link to set a new one.</p>
        </div>

        <ForgotPasswordForm />

        <p className="text-sm text-muted">
          <Link href="/sign-in" className="text-primary underline">
            Back to sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
