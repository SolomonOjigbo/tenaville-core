import { redirect } from 'next/navigation';

import { CreateOrganisationForm } from '../../../components/auth/create-organisation-form';
import { Card, CardBody } from '../../../components/ui';
import { destinationFor } from '../../../lib/auth';
import { currentAccount } from '../../../server/session';

/**
 * Set up the organisation (ORG-1).
 *
 * The last step of signup: an account exists and is verified but belongs to no
 * organisation, so there is nothing a dashboard could show.
 *
 * `destinationFor` decides whether this page is the right place for the caller,
 * so the ordering rule lives in one tested function rather than being
 * re-derived in each layout.
 */
export default async function CreateOrganisationPage() {
  const account = await currentAccount();

  const destination = destinationFor({
    signedIn: account !== null,
    emailConfirmed: account?.emailConfirmed ?? false,
    email: account?.email ?? null,
    hasOrganisation: account?.hasOrganisation ?? false,
  });

  if (destination.kind === 'sign-in') redirect('/sign-in');
  if (destination.kind === 'verify-email') {
    redirect(`/verify-email?email=${encodeURIComponent(destination.email)}`);
  }
  // Already has one: nothing to create here.
  if (destination.kind === 'app') redirect(destination.path);

  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <h1 className="font-display text-xl text-text">Set up your organisation</h1>
          <p className="mt-1 text-sm text-muted">
            You will be its owner. Everything you add — properties, tenants, payments — belongs to
            this organisation and is visible to nobody outside it.
          </p>
        </div>

        <CreateOrganisationForm suggestedName={account?.email?.split('@')[0] ?? ''} />
      </CardBody>
    </Card>
  );
}
