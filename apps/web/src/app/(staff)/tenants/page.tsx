import { redirect } from 'next/navigation';

import {
  Badge,
  Card,
  CardBody,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  TableEmpty,
  Td,
  Th,
  statusLabel,
} from '../../../components/ui';
import { currentViewer, supabaseForRequest } from '../../../server/session';

/** Tenants recorded by the agency (LEASE-1). */
export default async function TenantsPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('lease.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see tenants"
          description="Tenant records follow the tenancy permission."
          action={
            <LinkButton href="/dashboard" variant="secondary">
              Back to dashboard
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data } = await supabase
    .from('tenants')
    .select('id, display_name, kind, phone, email, preferred_channel')
    .order('display_name');

  const rows = data ?? [];

  return (
    <>
      <PageHeader
        title="Tenants"
        description="People and organisations who rent from your landlords. Next-of-kin and referee details are recorded separately."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/leases" variant="secondary">
              Leases
            </LinkButton>
            {viewer.access.can('lease.write') && (
              <LinkButton href="/tenants/new">Add tenant</LinkButton>
            )}
          </div>
        }
      />

      <Card>
        <CardBody className="p-0">
          <Table caption="Tenants">
            <thead>
              <tr>
                <Th>Tenant</Th>
                <Th>Type</Th>
                <Th>Contact</Th>
                <Th>Preferred channel</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={4} message="No tenants yet." />
              ) : (
                rows.map((tenant) => (
                  <tr key={tenant.id}>
                    <Td>{tenant.display_name}</Td>
                    <Td>
                      <Badge tone="info">{statusLabel(tenant.kind)}</Badge>
                    </Td>
                    <Td>
                      {tenant.phone ?? '—'}
                      <span className="block text-xs text-subtle">{tenant.email ?? ''}</span>
                    </Td>
                    <Td>{statusLabel(tenant.preferred_channel)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      {rows.length === 0 && viewer.access.can('lease.write') && (
        <div className="mt-4">
          <LinkButton href="/tenants/new">Add the first tenant</LinkButton>
        </div>
      )}
    </>
  );
}
