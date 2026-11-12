import type { ReactNode } from 'react';

import { StaffShell } from '../../components/shell/staff-shell';
import { landlordNav } from '../../lib/portal-nav';
import { requirePortalViewer } from '../../server/portal';

/** The landlord portal's frame (OWN-3). */
export default async function LandlordLayout({ children }: { readonly children: ReactNode }) {
  const viewer = await requirePortalViewer('landlord');

  return (
    <StaffShell
      groups={landlordNav}
      organisationName={viewer.organisationName}
      userLabel={viewer.email ?? 'Signed in'}
      role={viewer.access.role}
    >
      {children}
    </StaffShell>
  );
}
