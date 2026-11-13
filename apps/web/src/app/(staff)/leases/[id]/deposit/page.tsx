import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { formatNaira, fromTransport } from '@tenaville/money';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  Money,
  PageHeader,
  Table,
  TableEmpty,
  Td,
  Th,
  statusLabel,
} from '../../../../../components/ui';
import {
  ApproveDeductionForm,
  ProposeDeductionForm,
  RecordDepositReceiptForm,
  SettleDepositForm,
} from '../../../../../components/forms/deposit-forms';
import { formatDate } from '../../../../../lib/format';
import { todayIso } from '../../../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../../../server/session';

const depositTone = (status: string) =>
  status === 'held' || status === 'partially_refunded'
    ? 'info'
    : status === 'refunded'
      ? 'success'
      : status === 'forfeited'
        ? 'danger'
        : 'neutral';

/** Caution deposit lifecycle: receipt, deductions, approval and settlement (LEASE-13). */
export default async function LeaseDepositPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('lease.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see this deposit"
          description="Deposits follow the tenancy permission."
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
  const { data: lease, error } = await supabase
    .from('leases')
    .select(
      'id, reference, status, starts_on, ends_on, units(label, properties(name)), lease_parties(role, tenants(display_name)), lease_deposits!lease_deposits_lease_id_fkey(id, amount_kobo, status, custodian, received_on, settled_on, refunded_amount_kobo, forfeited_amount_kobo, notes)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error !== null || lease === null) notFound();

  const deposit = lease.lease_deposits;
  const [deductionsResult, leasesResult] = await Promise.all([
    deposit === null
      ? Promise.resolve({ data: [] as const })
      : supabase
          .from('deposit_deductions')
          .select('id, amount_kobo, reason, approved_by, approved_at, created_at')
          .eq('deposit_id', deposit.id)
          .order('created_at'),
    supabase
      .from('leases')
      .select('id, reference, status, units(label, properties(name))')
      .eq('organisation_id', viewer.organisationId)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const deductions = deductionsResult.data ?? [];
  const approvedKobo = deductions
    .filter((deduction) => deduction.approved_at !== null)
    .reduce((total, deduction) => total + BigInt(deduction.amount_kobo), 0n);
  const tenant = lease.lease_parties.find((party) => party.role === 'tenant')?.tenants ?? null;
  const canManage = viewer.access.can('lease.write') || viewer.access.can('payment.record');
  const leaseOptions = (leasesResult.data ?? []).map((candidate) => ({
    id: candidate.id,
    label: `${candidate.reference ?? 'Lease'} · ${candidate.units?.properties?.name ?? 'Property'} · ${candidate.units?.label ?? 'Unit'}`,
  }));

  return (
    <>
      <PageHeader
        title="Deposit"
        description={`${lease.reference ?? 'Lease'} · ${tenant?.display_name ?? 'Tenant'} · ${lease.units?.properties?.name ?? 'Property'} ${lease.units?.label ?? ''}`}
        action={
          <LinkButton href={`/leases/${lease.id}`} variant="secondary">
            Back to tenancy
          </LinkButton>
        }
      />

      {deposit === null ? (
        <Card>
          <EmptyState
            title="No deposit recorded"
            description="A deposit can only be recorded with the tenancy. Recreate the lease with the deposit details if one is held."
            action={
              <LinkButton href={`/leases/${lease.id}`} variant="secondary">
                Back to tenancy
              </LinkButton>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Deposit held"
                description="Client money. It is not agency income, and it is not released until the deductions are approved and the deposit is settled."
                action={
                  <Badge tone={depositTone(deposit.status)}>{statusLabel(deposit.status)}</Badge>
                }
              />
              <CardBody>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-subtle">Amount</dt>
                    <dd className="mt-0.5 text-lg text-text">
                      <Money kobo={String(deposit.amount_kobo)} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-subtle">Custodian</dt>
                    <dd className="mt-0.5 text-text">{statusLabel(deposit.custodian)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-subtle">Received</dt>
                    <dd className="mt-0.5 text-text">
                      {deposit.received_on === null ? 'Not yet' : formatDate(deposit.received_on)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-subtle">Settled</dt>
                    <dd className="mt-0.5 text-text">
                      {deposit.settled_on === null ? 'Not yet' : formatDate(deposit.settled_on)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-subtle">
                      Approved deductions
                    </dt>
                    <dd className="mt-0.5 text-text">
                      <Money kobo={approvedKobo.toString()} tone="owed" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-subtle">Refunded</dt>
                    <dd className="mt-0.5 text-text">
                      <Money kobo={String(deposit.refunded_amount_kobo)} />
                    </dd>
                  </div>
                </dl>
                {deposit.notes !== null && (
                  <p className="mt-4 border-t border-border pt-3 text-sm text-muted">
                    {deposit.notes}
                  </p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Deductions"
                description="A proposal does not count until it is approved. Approved deductions cannot exceed the deposit."
              />
              <CardBody className="p-0">
                <Table caption="Deposit deductions">
                  <thead>
                    <tr>
                      <Th>Reason</Th>
                      <Th>Proposed</Th>
                      <Th numeric>Amount</Th>
                      <Th>Approval</Th>
                      {canManage && <Th>Action</Th>}
                    </tr>
                  </thead>
                  <tbody>
                    {deductions.length === 0 ? (
                      <TableEmpty colSpan={canManage ? 5 : 4} message="No deductions proposed." />
                    ) : (
                      deductions.map((deduction) => (
                        <tr key={deduction.id}>
                          <Td>{deduction.reason}</Td>
                          <Td>{formatDate(deduction.created_at.slice(0, 10))}</Td>
                          <Td numeric>
                            <Money kobo={String(deduction.amount_kobo)} tone="owed" />
                          </Td>
                          <Td>
                            {deduction.approved_at === null ? (
                              <Badge tone="warning">Awaiting approval</Badge>
                            ) : (
                              <span className="text-xs text-muted">
                                Approved {formatDate(deduction.approved_at.slice(0, 10))}
                              </span>
                            )}
                          </Td>
                          {canManage && (
                            <Td>
                              {deduction.approved_at === null &&
                              deposit.status === 'held' && deposit.settled_on === null ? (
                                <ApproveDeductionForm
                                  leaseId={lease.id}
                                  deductionId={deduction.id}
                                />
                              ) : (
                                '—'
                              )}
                            </Td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            {canManage && deposit.status === 'expected' && (
              <Card>
                <CardHeader
                  title="Record receipt"
                  description="Moves the deposit from expected to held."
                />
                <CardBody>
                  <RecordDepositReceiptForm leaseId={lease.id} depositId={deposit.id} />
                </CardBody>
              </Card>
            )}

            {canManage &&
              deposit.status === 'held' && deposit.settled_on === null && (
                <>
                  <Card>
                    <CardHeader
                      title="Propose a deduction"
                      description="A deduction needs an approved reason before it can reduce the refund."
                    />
                    <CardBody>
                      <ProposeDeductionForm leaseId={lease.id} depositId={deposit.id} />
                    </CardBody>
                  </Card>
                  <Card>
                    <CardHeader
                      title="Settle the deposit"
                      description={`The database computes a refund from approved deductions. Suggested refund before settlement: ${formatNaira(
                        fromTransport(
                          String(
                            BigInt(deposit.amount_kobo) -
                              (approvedKobo > BigInt(deposit.amount_kobo)
                                ? BigInt(deposit.amount_kobo)
                                : approvedKobo),
                          ),
                        ),
                      )}.`}
                    />
                    <CardBody>
                      <SettleDepositForm
                        leaseId={lease.id}
                        depositId={deposit.id}
                        leases={leaseOptions}
                        suggestedDate={todayIso()}
                      />
                    </CardBody>
                  </Card>
                </>
              )}

            <Card>
              <CardHeader title="Evidence" description="Invoices and photographs for deductions." />
              <CardBody>
                <p className="text-sm text-muted">
                  Upload evidence from{' '}
                  <Link
                    href="/documents"
                    className="text-info-text underline-offset-2 hover:underline"
                  >
                    Documents
                  </Link>{' '}
                  and attach it to the deduction.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
