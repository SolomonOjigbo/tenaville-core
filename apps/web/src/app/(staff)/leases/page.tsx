import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  Badge,
  Card,
  CardBody,
  EmptyState,
  LinkButton,
  Money,
  PageHeader,
  Table,
  TableEmpty,
  Td,
  Th,
  leaseStatusTone,
  statusLabel,
} from '../../../components/ui';
import { formatDate } from '../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../server/session';

/** Every tenancy, newest first (LEASE-2, LEASE-3). */
export default async function LeasesPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('lease.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see leases"
          description="Leases follow the tenancy permission."
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
    .from('leases')
    .select(
      'id, reference, status, starts_on, ends_on, rent_kobo, rent_frequency, units(label, properties(name)), lease_parties(role, tenants(display_name))',
    )
    .order('starts_on', { ascending: false })
    .limit(200);

  const rows = data ?? [];

  const tenantOf = (lease: {
    lease_parties: { role: string; tenants: { display_name: string } | null }[];
  }): string =>
    lease.lease_parties.find((party) => party.role === 'tenant')?.tenants?.display_name ?? 'Tenant';

  return (
    <>
      <PageHeader
        title="Leases"
        description="What is let, to whom, and until when. A renewal is a new lease pointing at the one it replaces."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/tenants" variant="secondary">
              Tenants
            </LinkButton>
            {viewer.access.can('lease.write') && (
              <LinkButton href="/leases/new">New lease</LinkButton>
            )}
          </div>
        }
      />

      <Card>
        <CardBody className="p-0">
          <Table caption="Leases">
            <thead>
              <tr>
                <Th>Lease</Th>
                <Th>Tenant</Th>
                <Th>Unit</Th>
                <Th>Term</Th>
                <Th numeric>Rent</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={6} message="No leases yet." />
              ) : (
                rows.map((lease) => (
                  <tr key={lease.id}>
                    <Td>
                      <Link
                        href={`/leases/${lease.id}`}
                        className="text-info-text underline-offset-2 hover:underline"
                      >
                        {lease.reference ?? 'No reference'}
                      </Link>
                    </Td>
                    <Td>{tenantOf(lease)}</Td>
                    <Td>
                      {lease.units?.properties?.name ?? 'Property'}
                      <span className="block text-xs text-subtle">
                        {lease.units?.label ?? 'Unit'}
                      </span>
                    </Td>
                    <Td>
                      {formatDate(lease.starts_on)}
                      <span className="block text-xs text-subtle">
                        to {formatDate(lease.ends_on)}
                      </span>
                    </Td>
                    <Td numeric>
                      <Money kobo={String(lease.rent_kobo)} />
                      <span className="block text-xs text-subtle">
                        {statusLabel(lease.rent_frequency)}
                      </span>
                    </Td>
                    <Td>
                      <Badge tone={leaseStatusTone(lease.status)}>
                        {statusLabel(lease.status)}
                      </Badge>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
