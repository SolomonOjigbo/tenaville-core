import type { ReactNode } from 'react';

import { StaffShell } from '../../components/shell/staff-shell';
import { groupedNavigationFor } from '../../lib/nav';
import { homeForRole } from '../../lib/portal-nav';
import { redirect } from 'next/navigation';

import { destinationFor } from '../../lib/auth';
import { currentAccount, currentViewer, featureFlags } from '../../server/session';

/**
 * The staff shell.
 *
 * Authorisation happens here, once, at the layout boundary — which is the
 * reason all three audiences live in one Next app rather than three (see
 * apps/web/README.md). A page inside this group can assume a staff viewer.
 *
 * Landlords and tenants are members of the organisation with much narrower
 * visibility (ADR 0008) and belong in their own route groups, so they are
 * turned away here rather than shown an agency sidebar they cannot use.
 */
export default async function StaffLayout({ children }: { readonly children: ReactNode }) {
  const account = await currentAccount();
  const destination = destinationFor({
    signedIn: account !== null,
    emailConfirmed: account?.emailConfirmed ?? false,
    email: account?.email ?? null,
    hasOrganisation: account?.hasOrganisation ?? false,
  });

  // Middleware already turns away anonymous requests. These cover the states it
  // cannot see: whether the address is confirmed, and whether an organisation
  // exists yet — a dashboard with no organisation behind it would show nothing
  // and explain nothing.
  if (destination.kind === 'sign-in') redirect('/sign-in');
  if (destination.kind === 'verify-email') {
    redirect(`/verify-email?email=${encodeURIComponent(destination.email)}`);
  }
  if (destination.kind === 'create-organisation') redirect('/create-organisation');

  const viewer = await currentViewer();
  if (viewer === null) redirect('/create-organisation');

  if (!viewer.access.isStaff) redirect(homeForRole(viewer.access.role));

  const groups = groupedNavigationFor(viewer.access.role, featureFlags());

  return (
    <StaffShell
      groups={groups}
      organisationName={viewer.organisationName}
      userLabel={viewer.email ?? 'Signed in'}
      role={viewer.access.role}
    >
      {children}
    </StaffShell>
  );
}
