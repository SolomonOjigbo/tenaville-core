import { redirect } from 'next/navigation';

import { destinationFor } from '../lib/auth';
import { homeForRole } from '../lib/portal-nav';
import type { Viewer } from './session';
import { currentAccount, currentViewer } from './session';

/**
 * The gate shared by both portal layouts (OWN-3, TENANT-1).
 *
 * It runs the same onboarding decisions as the staff shell, then requires the
 * exact role. Someone in the wrong shell is sent to their own home rather than
 * shown an access-denied card they cannot act on.
 */
export const requirePortalViewer = async (role: 'landlord' | 'tenant'): Promise<Viewer> => {
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
  if (destination.kind === 'create-organisation') redirect('/create-organisation');

  const viewer = await currentViewer();
  if (viewer === null) redirect('/create-organisation');

  if (viewer.access.role !== role) redirect(homeForRole(viewer.access.role));

  return viewer;
};
