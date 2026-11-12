import { redirect } from 'next/navigation';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  TableEmpty,
  Td,
  Th,
  statusLabel,
  vendorStatusTone,
} from '../../../../components/ui';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** Vendor directory (MAINT-6). */
export default async function VendorsPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('maintenance.read') || !viewer.access.isStaff) {
    return (
      <Card>
        <EmptyState
          title="You cannot see vendors"
          description="The vendor directory is internal to the agency."
          action={
            <LinkButton href="/maintenance" variant="secondary">
              Back to maintenance
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data } = await supabase
    .from('vendors')
    .select('id, name, trade, contact_name, phone, email, service_areas, availability_notes, status')
    .order('name');

  const vendors = data ?? [];

  return (
    <>
      <PageHeader
        title="Vendors"
        description="Trades the agency calls, their areas and what the office knows about them."
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/maintenance" variant="secondary">
              Back to maintenance
            </LinkButton>
            {viewer.access.can('maintenance.write') && (
              <LinkButton href="/maintenance/vendors/new">Add vendor</LinkButton>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader title="Directory" description={`${vendors.length} vendors`} />
        <CardBody className="p-0">
          <Table caption="Vendors">
            <thead>
              <tr>
                <Th>Vendor</Th>
                <Th>Trade</Th>
                <Th>Contact</Th>
                <Th>Service areas</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <TableEmpty colSpan={5} message="No vendors yet." />
              ) : (
                vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <Td>
                      {vendor.name}
                      {vendor.availability_notes !== null && (
                        <span className="block max-w-md text-xs text-muted">
                          {vendor.availability_notes}
                        </span>
                      )}
                    </Td>
                    <Td>{vendor.trade}</Td>
                    <Td>
                      {vendor.contact_name ?? '—'}
                      <span className="block text-xs text-subtle">
                        {vendor.phone ?? vendor.email ?? ''}
                      </span>
                    </Td>
                    <Td>
                      {vendor.service_areas.length === 0 ? '—' : vendor.service_areas.join(', ')}
                    </Td>
                    <Td>
                      <Badge tone={vendorStatusTone(vendor.status)}>
                        {statusLabel(vendor.status)}
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
