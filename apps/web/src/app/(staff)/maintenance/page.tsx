import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  isOpenStatus,
  MAINTENANCE_STATUSES,
  type MaintenanceStatus,
} from '@tenaville/core/maintenance';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  Stat,
  Table,
  TableEmpty,
  Td,
  Th,
  maintenancePriorityTone,
  maintenanceStatusTone,
  statusLabel,
} from '../../../components/ui';
import { formatDate } from '../../../lib/format';
import {
  isOverdue,
  maintenanceCategoryLabel,
  maintenanceQueueStats,
  maintenanceStatusLabel,
  maintenanceUrgencyLabel,
} from '../../../lib/maintenance';
import { todayIso } from '../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../server/session';

const OPEN_STATUSES = MAINTENANCE_STATUSES.filter((status) => isOpenStatus(status));

const isMaintenanceStatus = (value: string | undefined): value is MaintenanceStatus =>
  value !== undefined && (MAINTENANCE_STATUSES as readonly string[]).includes(value);

/** The maintenance queue (MAINT-3, MAINT-4, MAINT-12). */
export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; view?: string }>;
}) {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('maintenance.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see maintenance"
          description="This is a maintenance permission. Ask an owner or administrator."
        />
      </Card>
    );
  }

  const params = await searchParams;
  const today = todayIso();
  const supabase = await supabaseForRequest();

  let query = supabase
    .from('maintenance_requests')
    .select(
      'id, status, priority, urgency, category, description, is_safety_issue, reported_on, due_on, assignee_user_id, vendor_id, property:properties(name), units(label), vendors(name)',
    )
    .order('created_at', { ascending: false });

  if (isMaintenanceStatus(params.status)) query = query.eq('status', params.status);
  if (params.priority !== undefined && params.priority !== '') {
    query = query.eq('priority', params.priority as 'low' | 'normal' | 'high' | 'urgent');
  }
  if (params.view === 'unassigned') {
    query = query.is('assignee_user_id', null).is('vendor_id', null).in('status', OPEN_STATUSES);
  }

  const { data } = await query;
  const rows = data ?? [];
  const stats = maintenanceQueueStats(rows, today);

  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Repairs, assignment and the costs that reach a landlord statement."
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/maintenance/vendors" variant="secondary">
              Vendors
            </LinkButton>
            {viewer.access.can('maintenance.write') && (
              <LinkButton href="/maintenance/new">Log a repair</LinkButton>
            )}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Open" value={stats.open} hint="Not yet completed or closed" />
        <Stat label="Unassigned" value={stats.unassigned} hint="No staff member or vendor" />
        <Stat label="Overdue" value={stats.overdue} hint="Past the target date" />
        <Stat
          label="Awaiting approval"
          value={stats.awaitingApproval}
          hint="Above the agency threshold"
        />
      </div>

      <Card>
        <CardHeader
          title="Queue"
          description={
            stats.safety > 0
              ? `${stats.safety} open ${stats.safety === 1 ? 'request is' : 'requests are'} flagged for safety or habitability.`
              : 'Safety-flagged repairs are marked in the list.'
          }
        />
        <CardBody className="space-y-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-subtle">Status</span>
              <select
                name="status"
                defaultValue={params.status ?? ''}
                className="min-h-[44px] rounded-md border border-border bg-surface px-3 text-sm text-text"
              >
                <option value="">All</option>
                {MAINTENANCE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {maintenanceStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-subtle">Priority</span>
              <select
                name="priority"
                defaultValue={params.priority ?? ''}
                className="min-h-[44px] rounded-md border border-border bg-surface px-3 text-sm text-text"
              >
                <option value="">All</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="flex min-h-[44px] items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="view"
                value="unassigned"
                defaultChecked={params.view === 'unassigned'}
              />
              Unassigned only
            </label>
            <button
              type="submit"
              className="min-h-[44px] rounded-md border border-border bg-surface px-4 text-sm font-medium text-text hover:bg-surface2"
            >
              Filter
            </button>
            {(params.status !== undefined ||
              params.priority !== undefined ||
              params.view !== undefined) && (
              <Link
                href="/maintenance"
                className="text-sm text-info-text underline-offset-2 hover:underline"
              >
                Clear
              </Link>
            )}
          </form>

          <Table caption="Maintenance queue">
            <thead>
              <tr>
                <Th>Repair</Th>
                <Th>Property</Th>
                <Th>Status</Th>
                <Th>Priority</Th>
                <Th>Target</Th>
                <Th>Assigned</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={6} message="No repairs match this view." />
              ) : (
                rows.map((row) => {
                  const overdue = isOverdue(row, today);
                  return (
                    <tr key={row.id} className={overdue ? 'bg-warning-soft/40' : undefined}>
                      <Td>
                        <Link
                          href={`/maintenance/${row.id}`}
                          className="text-info-text underline-offset-2 hover:underline"
                        >
                          {maintenanceCategoryLabel(row.category)}
                        </Link>
                        <span className="block max-w-md truncate text-xs text-muted">
                          {row.description}
                        </span>
                        {row.is_safety_issue && <Badge tone="danger">Safety</Badge>}
                      </Td>
                      <Td>
                        {row.property?.name ?? 'Property'}
                        <span className="block text-xs text-subtle">
                          {row.units?.label ?? 'Whole property'}
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={maintenanceStatusTone(row.status)}>
                          {maintenanceStatusLabel(row.status)}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge tone={maintenancePriorityTone(row.priority)}>
                          {statusLabel(row.priority)}
                        </Badge>
                        <span className="mt-1 block text-xs text-subtle">
                          {maintenanceUrgencyLabel(row.urgency)} urgency
                        </span>
                      </Td>
                      <Td>
                        {row.due_on === null ? '—' : formatDate(row.due_on)}
                        {overdue && <span className="block text-xs text-danger-text">Overdue</span>}
                      </Td>
                      <Td>
                        {row.vendors?.name ??
                          (row.assignee_user_id === null ? 'Unassigned' : 'Staff assigned')}
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
