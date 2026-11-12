import type { ReactNode } from 'react';

import { StaffShell } from '../../components/shell/staff-shell';
import { tenantNav } from '../../lib/portal-nav';
import { requirePortalViewer } from '../../server/portal';

/** The tenant portal's frame (TENANT-1). */
export default async function TenantLayout({ children }: { readonly children: ReactNode }) {
  const viewer = await requirePortalViewer('tenant');

  return (
    <StaffShell
      groups={tenantNav}
      organisationName={viewer.organisationName}
      userLabel={viewer.email ?? 'Signed in'}
      role={viewer.access.role}
    >
      {children}
    </StaffShell>
  );
}
