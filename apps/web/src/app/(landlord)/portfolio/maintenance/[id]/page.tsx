import { notFound } from 'next/navigation';

import { formatNaira, kobo } from '@tenaville/money';

import { ApprovalForm } from '../../../../../components/forms/approval-form';
import { MaintenanceTimeline } from '../../../../../components/maintenance/maintenance-timeline';
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
  maintenanceStatusTone,
  maintenanceUrgencyTone,
  statusLabel,
} from '../../../../../components/ui';
import { formatDate, formatDateTime } from '../../../../../lib/format';
import {
  maintenanceCategoryLabel,
  maintenanceCostTotalKobo,
  maintenancePayerLabel,
  maintenanceStatusLabel,
} from '../../../../../lib/maintenance';
import { currentViewer, supabaseForRequest } from '../../../../../server/session';

/** One repair on the landlord's property, with approval controls (OWN-4, MAINT-8). */
export default async function LandlordMaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
  const { data: request, error } = await supabase
    .from('maintenance_requests')
    .select(
      'id, category, description, status, urgency, priority, reported_on, due_on, is_safety_issue, completion_notes, tenant_confirmed_at, tenant_reopened_at, property:properties(name, address_line), units(label), tenants(display_name), leases(reference)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error !== null || request === null) notFound();

  const [{ data: events }, { data: costs }, { data: approvals }] = await Promise.all([
    supabase
      .from('maintenance_events')
      .select('id, kind, actor_label, body, visible_to_tenant, created_at')
      .eq('request_id', id)
      .order('created_at'),
    supabase
      .from('maintenance_costs')
      .select('id, description, amount_kobo, payer, reason, created_at')
      .eq('request_id', id)
      .order('created_at'),
    supabase
      .from('maintenance_approvals')
      .select('id, cost_id, amount_kobo, threshold_kobo, status, comment, decided_at')
      .eq('request_id', id)
      .order('requested_at', { ascending: false }),
  ]);

  const costRows = costs ?? [];
  const approvalRows = approvals ?? [];
  const approvalByCost = new Map(approvalRows.map((approval) => [approval.cost_id, approval]));
  const total = maintenanceCostTotalKobo(costRows);
  const canApprove = viewer.access.can('maintenance.approve');

  return (
    <>
      <PageHeader
        title={`${maintenanceCategoryLabel(request.category)} repair`}
        description={`${request.property?.name ?? 'Property'}${request.units?.label === undefined ? '' : ` · ${request.units.label}`} · reported ${formatDate(request.reported_on)}`}
        action={
          <LinkButton href="/portfolio/maintenance" variant="secondary">
            Back to repairs
          </LinkButton>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={maintenanceStatusTone(request.status)}>
          {maintenanceStatusLabel(request.status)}
        </Badge>
        <Badge tone={maintenanceUrgencyTone(request.urgency)}>
          {statusLabel(request.urgency)} urgency
        </Badge>
        {request.is_safety_issue && <Badge tone="danger">Safety / habitability</Badge>}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Recorded cost" value={<Money kobo={total.toString()} />} />
        <Stat
          label="Tenant"
          value={request.tenants?.display_name ?? 'No tenant linked'}
          hint={request.leases?.reference ?? 'No lease linked'}
        />
        <Stat
          label="Target"
          value={request.due_on === null ? 'Not set' : formatDate(request.due_on)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="The problem" />
            <CardBody className="space-y-3 text-sm">
              <p className="whitespace-pre-line text-text">{request.description}</p>
              <p className="text-xs text-subtle">
                {[request.property?.address_line].filter((part): part is string => part !== undefined && part !== null).join(', ')}
              </p>
              {request.completion_notes !== null && (
                <div className="rounded-md bg-success-soft px-4 py-3 text-success-text">
                  <p className="font-medium">Completion note</p>
                  <p>{request.completion_notes}</p>
                </div>
              )}
              {request.tenant_confirmed_at !== null && (
                <p className="text-xs text-success-text">
                  Tenant confirmed {formatDateTime(request.tenant_confirmed_at)}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Costs" description={`Total ${formatNaira(kobo(total))}, itemised.`} />
            <CardBody className="space-y-3">
              {costRows.length === 0 ? (
                <p className="text-sm text-subtle">No cost recorded yet.</p>
              ) : (
                costRows.map((cost) => {
                  const approval = approvalByCost.get(cost.id);
                  return (
                    <div key={cost.id} className="rounded-md border border-border px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm text-text">{cost.description}</p>
                          <p className="text-xs text-subtle">
                            {maintenancePayerLabel(cost.payer)} · {cost.reason}
                          </p>
                        </div>
                        <div className="text-right">
                          <Money kobo={String(cost.amount_kobo)} />
                          {approval !== undefined && (
                            <Badge tone={maintenanceApprovalTone(approval.status)}>
                              {statusLabel(approval.status)}
                            </Badge>
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
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Timeline" />
            <CardBody>
              <MaintenanceTimeline events={events ?? []} />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Approvals" description="Your decision is recorded with the repair." />
          <CardBody className="space-y-3">
            {approvalRows.length === 0 ? (
              <p className="text-sm text-subtle">No cost has needed your approval.</p>
            ) : (
              approvalRows.map((approval) => (
                <div key={approval.id} className="rounded-md border border-border px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Money kobo={String(approval.amount_kobo)} />
                    <Badge tone={maintenanceApprovalTone(approval.status)}>
                      {statusLabel(approval.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-subtle">
                    Threshold <Money kobo={String(approval.threshold_kobo)} />
                  </p>
                  {approval.status === 'pending' && (
                    <div className="mt-3 border-t border-border pt-3">
                      <ApprovalForm
                        approvalId={approval.id}
                        requestId={request.id}
                        canDecide={canApprove}
                      />
                    </div>
                  )}
                  {approval.comment !== null && (
                    <p className="mt-2 text-xs text-muted">Decision: {approval.comment}</p>
                  )}
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
