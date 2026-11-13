import { notFound, redirect } from 'next/navigation';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  Money,
  PageHeader,
  statusLabel,
} from '../../../../../components/ui';
import {
  RecordHandoverForm,
  TerminateLeaseForm,
} from '../../../../../components/forms/lease-lifecycle-forms';
import { formatDate } from '../../../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../../../server/session';

const handoverKindLabel = (kind: string): string => (kind === 'move_in' ? 'Move-in' : 'Move-out');

/** Move-in and move-out handovers, and early termination (LEASE-3, LEASE-5). */
export default async function LeaseHandoversPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('lease.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see this tenancy"
          description="Handovers follow the tenancy permission."
          action={
            <LinkButton href="/leases" variant="secondary">
              Back to leases
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const [{ data: lease, error }, { data: handovers }] = await Promise.all([
    supabase
      .from('leases')
      .select(
        'id, reference, status, starts_on, ends_on, terminated_on, termination_reason, units(label, properties(name)), lease_parties(role, tenants(display_name))',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('lease_handovers')
      .select(
        'id, kind, happened_on, notes, meter_readings, outstanding_balance_kobo, keys_returned, evidence_paths, created_at',
      )
      .eq('lease_id', id)
      .order('happened_on'),
  ]);

  if (error !== null || lease === null) notFound();

  const tenant = lease.lease_parties.find((party) => party.role === 'tenant')?.tenants ?? null;
  const completed = new Set((handovers ?? []).map((handover) => handover.kind));
  const canManage = viewer.access.can('lease.write');
  const canTerminate = canManage && (lease.status === 'active' || lease.status === 'draft');

  return (
    <>
      <PageHeader
        title="Handovers"
        description={`${lease.reference ?? 'Lease'} · ${tenant?.display_name ?? 'Tenant'} · ${lease.units?.properties?.name ?? 'Property'} ${lease.units?.label ?? ''}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href={`/leases/${lease.id}`} variant="secondary">
              Back to tenancy
            </LinkButton>
            <LinkButton href={`/leases/${lease.id}/deposit`} variant="secondary">
              Deposit
            </LinkButton>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Recorded handovers"
              description="The condition, meter readings and keys observed on the day. Evidence stays in the private document registry."
            />
            <CardBody className="space-y-4">
              {handovers === null || handovers.length === 0 ? (
                <p className="text-sm text-muted">No handover recorded yet.</p>
              ) : (
                handovers.map((handover) => (
                  <article key={handover.id} className="rounded-md border border-border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={handover.kind === 'move_out' ? 'warning' : 'info'}>
                        {handoverKindLabel(handover.kind)}
                      </Badge>
                      <span className="text-sm text-text">{formatDate(handover.happened_on)}</span>
                      {handover.keys_returned !== null && (
                        <Badge tone={handover.keys_returned ? 'success' : 'neutral'}>
                          {handover.keys_returned ? 'Keys returned' : 'Keys not returned'}
                        </Badge>
                      )}
                    </div>
                    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-subtle">
                          Balance agreed
                        </dt>
                        <dd className="mt-0.5 text-text">
                          {handover.outstanding_balance_kobo === null ? (
                            '—'
                          ) : (
                            <Money kobo={String(handover.outstanding_balance_kobo)} />
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-subtle">
                          Meter readings
                        </dt>
                        <dd className="mt-0.5 text-text">
                          {Object.keys(handover.meter_readings).length === 0
                            ? '—'
                            : Object.entries(handover.meter_readings)
                                .map(([meter, reading]) => `${meter}: ${reading}`)
                                .join(' · ')}
                        </dd>
                      </div>
                    </dl>
                    {handover.notes !== null && (
                      <p className="mt-3 text-sm text-muted">{handover.notes}</p>
                    )}
                    {handover.evidence_paths.length > 0 && (
                      <p className="mt-2 text-xs text-muted">
                        {handover.evidence_paths.length} evidence file(s) in Documents.
                      </p>
                    )}
                  </article>
                ))
              )}
            </CardBody>
          </Card>

          {canManage && !completed.has('move_in') && (
            <Card>
              <CardHeader title="Record move-in" description="Condition and meters at the start." />
              <CardBody>
                <RecordHandoverForm
                  leaseId={lease.id}
                  kind="move_in"
                  suggestedDate={lease.starts_on}
                />
              </CardBody>
            </Card>
          )}

          {canManage && !completed.has('move_out') && (
            <Card>
              <CardHeader title="Record move-out" description="Condition and meters at the end." />
              <CardBody>
                <RecordHandoverForm
                  leaseId={lease.id}
                  kind="move_out"
                  suggestedDate={lease.ends_on}
                />
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Tenancy" description="Current state." />
            <CardBody>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Status</dt>
                  <dd className="mt-0.5">
                    <Badge tone={lease.status === 'active' ? 'success' : 'neutral'}>
                      {statusLabel(lease.status)}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Term</dt>
                  <dd className="mt-0.5 text-text">
                    {formatDate(lease.starts_on)} to {formatDate(lease.ends_on)}
                  </dd>
                </div>
                {lease.terminated_on !== null && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-subtle">Terminated</dt>
                    <dd className="mt-0.5 text-text">{formatDate(lease.terminated_on)}</dd>
                    {lease.termination_reason !== null && (
                      <dd className="text-xs text-muted">{lease.termination_reason}</dd>
                    )}
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          {canTerminate && (
            <Card>
              <CardHeader
                title="Terminate early"
                description="Ends the tenancy before its end date. The reason is kept on the lease and the unit becomes vacant."
              />
              <CardBody>
                <TerminateLeaseForm leaseId={lease.id} suggestedDate={lease.ends_on} />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
