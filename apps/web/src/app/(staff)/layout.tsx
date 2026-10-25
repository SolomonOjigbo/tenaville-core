import type { ReactNode } from 'react';

import { Card, CardBody } from '../../components/ui/index';
import { Sidebar } from '../../components/shell/sidebar';
import { TopBar } from '../../components/shell/top-bar';
import { groupedNavigationFor } from '../../lib/nav';
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

  if (!viewer.access.isStaff) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <Card className="w-full">
          <CardBody className="space-y-3">
            <h1 className="font-display text-xl text-text">No access to the staff area</h1>
            <p className="text-sm text-muted">
              Your account is a {viewer.access.role.replace(/_/g, ' ')} in {viewer.organisationName}
              . Landlord and tenant views are separate and are tickets TV-053 and TV-054.
            </p>
          </CardBody>
        </Card>
      </main>
    );
  }

  const groups = groupedNavigationFor(viewer.access.role, featureFlags());

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar groups={groups} organisationName={viewer.organisationName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar userLabel={viewer.email ?? 'Signed in'} role={viewer.access.role} />
        <main className="min-w-0 flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
