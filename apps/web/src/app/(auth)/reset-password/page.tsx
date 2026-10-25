import { ResetPasswordForm } from '../../../components/auth/reset-password-form';
import { Card, CardBody } from '../../../components/ui';

/**
 * Set a new password.
 *
 * Reached from a recovery link, which the callback has already exchanged for a
 * session — so this page takes no token. If the link had expired the action
 * says so, rather than this page failing to load.
 */
export default function ResetPasswordPage() {
  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <h1 className="font-display text-xl text-text">Set a new password</h1>
          <p className="mt-1 text-sm text-muted">You will be signed in once it is saved.</p>
        </div>

        <ResetPasswordForm />
      </CardBody>
    </Card>
  );
}
