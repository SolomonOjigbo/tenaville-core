import { Card, CardBody } from '../../../components/ui/index';

/**
 * Placeholder sign-in.
 *
 * The real flows — email and phone verification, invitations, password reset —
 * are TV-003, which is still partial. This page exists so the shell has
 * somewhere to send an unauthenticated visitor instead of looping, and it says
 * plainly that it is not finished rather than presenting a form that cannot
 * work.
 */
export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <CardBody className="space-y-3">
          <h1 className="font-display text-xl text-text">Sign in to Tenaville</h1>
          <p className="text-sm text-muted">
            Authentication is not built yet. Signup, verification and password reset are ticket
            TV-003; this page is a placeholder so the shell has a destination.
          </p>
          <p className="text-sm text-muted">
            In development, create a session against the local Supabase stack and reload.
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
