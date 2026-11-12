import Link from 'next/link';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  Money,
  PageHeader,
  Stat,
  Table,
  TableEmpty,
  Td,
  Th,
  maintenanceApprovalTone,
  maintenanceStatusTone,
} from '../../../../components/ui';
import { formatDate } from '../../../../lib/format';
import { maintenanceCategoryLabel, maintenanceStatusLabel } from '../../../../lib/maintenance';
import { currentViewer, supabaseForRequest } from '../../../../server/session';
import { isOpenStatus } from '@tenaville/core/maintenance';

/** Repairs on the landlord's properties and the approvals waiting for them (OWN-4). */
export default async function LandlordMaintenancePage() {
  const viewer = await currentViewer();
  if (!viewer?.access.can('maintenance.read')) {
    return (
      <Card>
        <EmptyState
          title="No maintenance access"
          description="This area is for the landlord on the property."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const [{ data: requests }, { data: approvals }] = await Promise.all([
    supabase
      .from('maintenance_requests')
      .select(
        'id, category, description, status, urgency, reported_on, due_on, property:properties(name), units(label)',
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('maintenance_approvals')
      .select(
        'id, amount_kobo, status, requested_at, request:maintenance_requests(id, category, description, status, property:properties(name), units(label))',
      )
      .eq('status', 'pending')
      .order('requested_at'),
  ]);

  const rows = requests ?? [];
  const pending = approvals ?? [];
  const open = rows.filter((request) => isOpenStatus(request.status)).length;

  return (
    <>
      <PageHeader
        title="Repairs"
        description="Work on your properties, and the costs that need your approval."
        action={
          <LinkButton href="/portfolio" variant="secondary">
            Back to portfolio
          </LinkButton>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Repairs" value={rows.length} />
        <Stat label="Open" value={open} hint="Not yet completed or closed" />
        <Stat label="Awaiting your approval" value={pending.length} />
      </div>

      {pending.length > 0 && (
        <Card className="mb-6">
          <CardHeader
            title="Waiting for you"
            description="Work above the agency threshold cannot continue until you decide."
          />
          <CardBody className="space-y-3">
            {pending.map((approval) => (
              <div
                key={approval.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-warning px-4 py-3"
              >
                <div>
                  {approval.request === null ? (
                    <p className="text-sm text-text">Repair cost</p>
                  ) : (
                    <Link
                      href={`/portfolio/maintenance/${approval.request.id}`}
                      className="text-sm text-info-text underline-offset-2 hover:underline"
                    >
                      {maintenanceCategoryLabel(approval.request.category)} ·{' '}
                      {approval.request.property?.name ?? 'Property'}
                    </Link>
                  )}
                  {approval.request !== null && (
                    <p className="max-w-lg text-xs text-muted">{approval.request.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    <Money kobo={String(approval.amount_kobo)} />
                  </p>
                  <Badge tone={maintenanceApprovalTone(approval.status)}>Pending</Badge>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Repair history" description="Every repair recorded against your properties." />
        <CardBody className="p-0">
          <Table caption="Repairs">
            <thead>
              <tr>
                <Th>Repair</Th>
                <Th>Property</Th>
                <Th>Reported</Th>
                <Th>Status</Th>
                <Th>Target</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5} message="No repairs recorded yet." />
              ) : (
                rows.map((request) => (
                  <tr key={request.id}>
                    <Td>
                      <Link
                        href={`/portfolio/maintenance/${request.id}`}
                        className="text-info-text underline-offset-2 hover:underline"
                      >
                        {maintenanceCategoryLabel(request.category)}
                      </Link>
                      <span className="block max-w-md truncate text-xs text-muted">
                        {request.description}
                      </span>
                    </Td>
                    <Td>
                      {request.property?.name ?? 'Property'}
                      <span className="block text-xs text-subtle">
                        {request.units?.label ?? 'Whole property'}
                      </span>
                    </Td>
                    <Td>{formatDate(request.reported_on)}</Td>
                    <Td>
                      <Badge tone={maintenanceStatusTone(request.status)}>
                        {maintenanceStatusLabel(request.status)}
                      </Badge>
                    </Td>
                    <Td>{request.due_on === null ? '—' : formatDate(request.due_on)}</Td>
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
