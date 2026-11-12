import { notFound } from 'next/navigation';

import { CommentForm } from '../../../../../components/forms/comment-form';
import { TenantResponseForm } from '../../../../../components/forms/tenant-response-form';
import { MaintenanceTimeline } from '../../../../../components/maintenance/maintenance-timeline';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  maintenanceStatusTone,
  maintenanceUrgencyTone,
  statusLabel,
} from '../../../../../components/ui';
import { formatDate } from '../../../../../lib/format';
import { maintenanceCategoryLabel, maintenanceStatusLabel } from '../../../../../lib/maintenance';
import { currentViewer, supabaseForRequest } from '../../../../../server/session';

/** A tenant follows one repair (TENANT-5, MAINT-12, MAINT-13). */
export default async function TenantMaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const viewer = await currentViewer();
  if (!viewer?.access.can('self.maintenance.request')) {
    return (
      <Card>
        <EmptyState
          title="No maintenance access"
          description="This area is for tenants."
          action={
            <LinkButton href="/tenancy" variant="secondary">
              Back to tenancy
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data: request, error } = await supabase
    .from('maintenance_requests')
    .select(
      'id, category, description, status, urgency, priority, reported_on, due_on, is_safety_issue, access_constraints, preferred_access_times, completion_notes, tenant_confirmed_at, tenant_reopened_at, reopen_count, property:properties(name, address_line), units(label)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error !== null || request === null) notFound();

  const { data: events } = await supabase
    .from('maintenance_events')
    .select('id, kind, actor_label, body, visible_to_tenant, created_at')
    .eq('request_id', id)
    .order('created_at');

  return (
    <>
      <PageHeader
        title={`${maintenanceCategoryLabel(request.category)} repair`}
        description={`${request.property?.name ?? 'Property'}${request.units?.label === undefined ? '' : ` · ${request.units.label}`} · reported ${formatDate(request.reported_on)}`}
        action={
          <LinkButton href="/tenancy/maintenance" variant="secondary">
            Back to maintenance
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="What you reported" />
            <CardBody className="space-y-3 text-sm">
              <p className="whitespace-pre-line text-text">{request.description}</p>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Target date</dt>
                  <dd className="text-text">
                    {request.due_on === null ? 'The agency has not set one yet' : formatDate(request.due_on)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Access</dt>
                  <dd className="text-text">
                    {request.access_constraints ?? 'No access constraints'}
                    {request.preferred_access_times !== null && (
                      <span className="block text-xs text-muted">
                        Preferred: {request.preferred_access_times}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
              {request.completion_notes !== null && (
                <div className="rounded-md bg-success-soft px-4 py-3 text-success-text">
                  <p className="font-medium">Marked complete</p>
                  <p>{request.completion_notes}</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Updates" description="What the agency has done." />
            <CardBody className="space-y-6">
              <MaintenanceTimeline events={events ?? []} showInternal={false} />
              <div className="border-t border-border pt-4">
                <CommentForm requestId={request.id} isStaff={false} />
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Is it fixed?" description="Confirm the repair or tell the agency what is still wrong." />
            <CardBody>
              <TenantResponseForm
                requestId={request.id}
                status={request.status}
                confirmed={request.tenant_confirmed_at !== null}
              />
              {request.status !== 'completed' && request.status !== 'closed' && (
                <p className="text-sm text-muted">
                  You can confirm or reopen once the agency marks the repair complete.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
