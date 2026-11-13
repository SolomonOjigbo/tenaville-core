import { notFound, redirect } from 'next/navigation';

import { formatNaira, kobo } from '@tenaville/money';

import { AssignmentForm } from '../../../../components/forms/assignment-form';
import { CommentForm } from '../../../../components/forms/comment-form';
import { CostForm } from '../../../../components/forms/cost-form';
import { DocumentUploadForm } from '../../../../components/forms/document-upload-form';
import { StatusForm } from '../../../../components/forms/status-form';
import { DocumentsTable } from '../../../../components/documents/documents-table';
import { ApprovalForm } from '../../../../components/forms/approval-form';
import { MaintenanceTimeline } from '../../../../components/maintenance/maintenance-timeline';
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
  maintenanceApprovalTone,
  maintenancePriorityTone,
  maintenanceStatusTone,
  maintenanceUrgencyTone,
  statusLabel,
} from '../../../../components/ui';
import { formatDate, formatDateTime } from '../../../../lib/format';
import {
  allowedTransitions,
  maintenanceCategoryLabel,
  maintenanceCostTotalKobo,
  maintenancePayerLabel,
  maintenanceStatusLabel,
} from '../../../../lib/maintenance';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** One repair, end to end (MAINT-3 … MAINT-11). */
export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('maintenance.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see this repair"
          description="This is a maintenance permission."
        />
      </Card>
    );
  }

  const canWrite = viewer.access.can('maintenance.write') && viewer.access.isStaff;
  const canApprove = viewer.access.can('maintenance.approve');
  const supabase = await supabaseForRequest();

  const { data: request, error } = await supabase
    .from('maintenance_requests')
    .select(
      'id, status, priority, urgency, category, description, is_safety_issue, access_constraints, preferred_access_times, reported_on, due_on, submitted_by, tenant_id, lease_id, property_id, unit_id, assignee_user_id, coordinator_user_id, vendor_id, no_cost, completion_notes, tenant_confirmed_at, tenant_reopened_at, reopen_count, created_at, property:properties(name, address_line, lga, state_code), units(label), vendors(id, name), tenants(display_name), leases(reference)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error !== null || request === null) notFound();

  const [
    { data: events },
    { data: costs },
    { data: approvals },
    { data: memberships },
    { data: vendors },
    { data: organisation },
    { data: media },
  ] = await Promise.all([
    supabase
      .from('maintenance_events')
      .select('id, kind, actor_label, body, visible_to_tenant, created_at')
      .eq('request_id', id)
      .order('created_at'),
    supabase
      .from('maintenance_costs')
      .select(
        'id, description, amount_kobo, payer, reason, invoice_path, requires_approval, created_at',
      )
      .eq('request_id', id)
      .order('created_at'),
    supabase
      .from('maintenance_approvals')
      .select('id, cost_id, amount_kobo, threshold_kobo, status, comment, decided_at, requested_at')
      .eq('request_id', id)
      .order('requested_at', { ascending: false }),
    supabase
      .from('memberships')
      .select('user_id, role')
      .eq('organisation_id', viewer.organisationId)
      .eq('status', 'active'),
    supabase
      .from('vendors')
      .select('id, name, status')
      .eq('organisation_id', viewer.organisationId)
      .order('name'),
    supabase
      .from('organisations')
      .select('maintenance_approval_threshold_kobo')
      .eq('id', viewer.organisationId)
      .maybeSingle(),
    supabase
      .from('documents')
      .select(
        'id, entity_type, entity_id, bucket, storage_path, title, file_name, document_type, mime_type, size_bytes, created_at, expiry_date, sensitive',
      )
      .eq('entity_type', 'maintenance_request')
      .eq('entity_id', id)
      .order('created_at'),
  ]);

  const memberRows = (memberships ?? []).filter((member) =>
    [
      'owner',
      'admin',
      'property_manager',
      'letting_agent',
      'caretaker',
      'maintenance_coordinator',
    ].includes(member.role),
  );
  const profiles =
    memberRows.length === 0
      ? { data: [] }
      : await supabase
          .from('users')
          .select('id, full_name, email')
          .in(
            'id',
            memberRows.map((member) => member.user_id),
          );

  const profileById = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
  const staff = memberRows.map((member) => ({
    id: member.user_id,
    label:
      profileById.get(member.user_id)?.full_name ??
      profileById.get(member.user_id)?.email ??
      'Colleague',
  }));
  const vendorOptions = (vendors ?? [])
    .filter((vendor) => vendor.status === 'active')
    .map((vendor) => ({ id: vendor.id, label: vendor.name }));

  const assignee =
    request.assignee_user_id === null ? null : (profileById.get(request.assignee_user_id) ?? null);
  const coordinator =
    request.coordinator_user_id === null
      ? null
      : (profileById.get(request.coordinator_user_id) ?? null);

  const costRows = costs ?? [];
  const approvalRows = approvals ?? [];
  const approvalByCost = new Map(approvalRows.map((approval) => [approval.cost_id, approval]));
  const totalCost = maintenanceCostTotalKobo(costRows);
  const threshold = organisation?.maintenance_approval_threshold_kobo ?? 0;
  const transitions = allowedTransitions(request.status);
  const terminal = ['completed', 'rejected', 'closed'].includes(request.status);

  return (
    <>
      <PageHeader
        title={`${maintenanceCategoryLabel(request.category)} repair`}
        description={`${request.property?.name ?? 'Property'}${request.units?.label === undefined ? '' : ` · ${request.units.label}`} · reported ${formatDate(request.reported_on)}`}
        action={
          <LinkButton href="/maintenance" variant="secondary">
            Back to maintenance
          </LinkButton>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={maintenanceStatusTone(request.status)}>
          {maintenanceStatusLabel(request.status)}
        </Badge>
        <Badge tone={maintenancePriorityTone(request.priority)}>
          {statusLabel(request.priority)} priority
        </Badge>
        <Badge tone={maintenanceUrgencyTone(request.urgency)}>
          {statusLabel(request.urgency)} urgency
        </Badge>
        {request.is_safety_issue && <Badge tone="danger">Safety / habitability</Badge>}
        {request.no_cost && <Badge tone="neutral">No cost</Badge>}
      </div>

      {request.status === 'awaiting_approval' && (
        <Card className="mb-6 border-warning">
          <CardBody className="text-sm text-warning-text">
            Work is paused until the cost above {formatNaira(kobo(threshold))} is approved.
          </CardBody>
        </Card>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Recorded cost"
          value={<Money kobo={totalCost.toString()} />}
          hint="All cost lines"
        />
        <Stat
          label="Approval threshold"
          value={<Money kobo={String(threshold)} />}
          hint="Per cost line"
        />
        <Stat
          label="Tenant"
          value={request.tenants?.display_name ?? 'No tenant linked'}
          hint={request.leases?.reference ?? 'No lease linked'}
        />
        <Stat
          label="Target"
          value={request.due_on === null ? 'Not set' : formatDate(request.due_on)}
          hint={request.tenant_confirmed_at === null ? 'Tenant not confirmed' : 'Tenant confirmed'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="The problem" />
            <CardBody className="space-y-4 text-sm">
              <p className="whitespace-pre-line text-text">{request.description}</p>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Property</dt>
                  <dd className="text-text">
                    {request.property?.name ?? 'Property'}
                    <span className="block text-xs text-muted">
                      {[
                        request.property?.address_line,
                        request.property?.lga,
                        request.property?.state_code,
                      ]
                        .filter((part) => part !== null && part !== undefined && part !== '')
                        .join(', ')}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Access</dt>
                  <dd className="text-text">
                    {request.access_constraints ?? 'No access constraints recorded'}
                    {request.preferred_access_times !== null && (
                      <span className="block text-xs text-muted">
                        Preferred: {request.preferred_access_times}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Reported by</dt>
                  <dd className="text-text">{statusLabel(request.submitted_by)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Assigned to</dt>
                  <dd className="text-text">
                    {assignee?.full_name ?? assignee?.email ?? 'Unassigned'}
                    {request.vendors?.name !== undefined && (
                      <span className="block text-xs text-muted">
                        Vendor: {request.vendors.name}
                      </span>
                    )}
                    {coordinator !== null && (
                      <span className="block text-xs text-muted">
                        Coordinator: {coordinator.full_name ?? coordinator.email}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
              {request.completion_notes !== null && (
                <div className="rounded-md bg-success-soft px-4 py-3 text-success-text">
                  <p className="font-medium">Completion note</p>
                  <p>{request.completion_notes}</p>
                </div>
              )}
              {request.tenant_confirmed_at !== null && (
                <p className="text-xs text-success-text">
                  Tenant confirmed {formatDateTime(request.tenant_confirmed_at)}
                  {request.reopen_count > 0 ? ` · reopened ${request.reopen_count}×` : ''}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Costs"
              description={`Total ${formatNaira(kobo(totalCost))}. Landlord costs post to the ledger; tenant costs become a repair charge.`}
            />
            <CardBody className="space-y-4">
              {costRows.length === 0 ? (
                <p className="text-sm text-subtle">No cost recorded yet.</p>
              ) : (
                <ul className="space-y-3">
                  {costRows.map((cost) => {
                    const approval = approvalByCost.get(cost.id);
                    return (
                      <li key={cost.id} className="rounded-md border border-border px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-text">{cost.description}</p>
                            <p className="text-xs text-subtle">
                              {maintenancePayerLabel(cost.payer)} · {cost.reason}
                            </p>
                          </div>
                          <div className="text-right">
                            <Money kobo={String(cost.amount_kobo)} />
                            {approval !== undefined ? (
                              <Badge tone={maintenanceApprovalTone(approval.status)}>
                                {statusLabel(approval.status)}
                              </Badge>
                            ) : (
                              <Badge tone="neutral">Below threshold</Badge>
                            )}
                          </div>
                        </div>
                        {approval !== undefined && approval.status === 'pending' && (
                          <div className="mt-3 border-t border-border pt-3">
                            <ApprovalForm
                              approvalId={approval.id}
                              requestId={request.id}
                              canDecide={canApprove}
                            />
                          </div>
                        )}
                        {approval?.comment !== null && approval?.comment !== undefined && (
                          <p className="mt-2 text-xs text-muted">Decision: {approval.comment}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {canWrite && !terminal && (
                <div className="border-t border-border pt-4">
                  <CostForm requestId={request.id} thresholdLabel={formatNaira(kobo(threshold))} />
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Timeline"
              description="Every status, assignment, cost and comment."
            />
            <CardBody className="space-y-6">
              <MaintenanceTimeline events={events ?? []} />
              <div className="border-t border-border pt-4">
                <CommentForm requestId={request.id} isStaff={viewer.access.isStaff} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Photos and documents"
              description="Tenant photos, quotations and invoices attached to this repair."
            />
            <CardBody className="space-y-4">
              <DocumentsTable documents={media ?? []} />
              {viewer.access.can('document.write') && (
                <div className="border-t border-border pt-4">
                  <DocumentUploadForm
                    groups={[
                      {
                        type: 'maintenance_request',
                        label: 'This repair',
                        items: [
                          {
                            id: request.id,
                            label: `${maintenanceCategoryLabel(request.category)} · reported ${formatDate(request.reported_on)}`,
                          },
                        ],
                      },
                    ]}
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          {canWrite && !terminal && (
            <Card>
              <CardHeader title="Assignment" description="Who is responsible, and by when." />
              <CardBody>
                <AssignmentForm
                  requestId={request.id}
                  staff={staff}
                  vendors={vendorOptions}
                  defaults={{
                    assigneeUserId: request.assignee_user_id,
                    coordinatorUserId: request.coordinator_user_id,
                    vendorId: request.vendor_id,
                    priority: request.priority,
                    dueOn: request.due_on,
                  }}
                />
              </CardBody>
            </Card>
          )}

          {canWrite && transitions.length > 0 && (
            <Card>
              <CardHeader title="Status" description="Only the moves the workflow allows." />
              <CardBody>
                <StatusForm requestId={request.id} transitions={transitions} />
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Contacts" />
            <CardBody className="space-y-2 text-sm">
              <p className="text-text">
                Tenant
                <span className="block text-xs text-muted">
                  {request.tenants?.display_name ?? 'No tenant linked'}
                </span>
              </p>
              <p className="text-text">
                Vendor
                <span className="block text-xs text-muted">
                  {request.vendors?.name ?? 'No vendor assigned'}
                </span>
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
