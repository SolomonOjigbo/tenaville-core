import Link from 'next/link';

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
  maintenanceStatusTone,
  maintenanceUrgencyTone,
  statusLabel,
} from '../../../../components/ui';
import { formatDate } from '../../../../lib/format';
import { maintenanceCategoryLabel, maintenanceStatusLabel } from '../../../../lib/maintenance';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** The tenant's repair requests (TENANT-4, TENANT-5). */
export default async function TenantMaintenancePage() {
  const viewer = await currentViewer();
  if (!viewer?.access.can('self.maintenance.request')) {
    return (
      <Card>
        <EmptyState
          title="No maintenance access"
          description="This area is for tenants. Ask the agency to link your account to your tenancy."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data } = await supabase
    .from('maintenance_requests')
    .select('id, category, description, status, urgency, reported_on, due_on, is_safety_issue')
    .order('created_at', { ascending: false });

  const rows = data ?? [];

  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Report a repair and follow what the agency is doing about it."
        action={
          <LinkButton href="/tenancy/maintenance/new">Report a repair</LinkButton>
        }
      />

      <Card>
        <CardHeader title="Your requests" description={`${rows.length} reported`} />
        <CardBody className="p-0">
          <Table caption="Maintenance requests">
            <thead>
              <tr>
                <Th>Repair</Th>
                <Th>Reported</Th>
                <Th>Urgency</Th>
                <Th>Status</Th>
                <Th>Target</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5} message="You have not reported a repair yet." />
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <Td>
                      <Link
                        href={`/tenancy/maintenance/${row.id}`}
                        className="text-info-text underline-offset-2 hover:underline"
                      >
                        {maintenanceCategoryLabel(row.category)}
                      </Link>
                      <span className="block max-w-md truncate text-xs text-muted">
                        {row.description}
                      </span>
                      {row.is_safety_issue && <Badge tone="danger">Safety</Badge>}
                    </Td>
                    <Td>{formatDate(row.reported_on)}</Td>
                    <Td>
                      <Badge tone={maintenanceUrgencyTone(row.urgency)}>
                        {statusLabel(row.urgency)}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge tone={maintenanceStatusTone(row.status)}>
                        {maintenanceStatusLabel(row.status)}
                      </Badge>
                    </Td>
                    <Td>{row.due_on === null ? '—' : formatDate(row.due_on)}</Td>
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
