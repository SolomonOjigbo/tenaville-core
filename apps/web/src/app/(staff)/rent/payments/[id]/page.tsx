import Link from 'next/link';
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
  Table,
  TableEmpty,
  Td,
  Th,
  paymentStatusTone,
  statusLabel,
} from '../../../../../components/ui';
import { ConfirmPaymentButton } from '../../../../../components/payments/confirm-payment-button';
import { ReversePaymentForm } from '../../../../../components/payments/reverse-payment-form';
import { formatDate } from '../../../../../lib/format';
import { paymentMethodLabel } from '../../../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../../../server/session';

/**
 * One payment, its split and its audit trail.
 *
 * Receipts cover money in; this covers everything around it: the charges a
 * payment was applied to, who recorded and confirmed it, and the links to a
 * reversal in either direction. A reversal row has no receipt of its own, so
 * this is the only place to inspect it.
 */
export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('payment.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see payments"
          description="Payments are covered by the money permission. Ask an owner, administrator or accountant for access."
          action={
            <LinkButton href="/rent" variant="secondary">
              Back to rent
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();

  const [{ data: payment, error }, { data: allocations }] = await Promise.all([
    supabase
      .from('payments')
      .select(
        'id, amount_kobo, method, reference, paid_on, status, recorded_by, recorded_at, confirmed_by, confirmed_at, reversed_at, reversal_reason, reversal_of_id, notes, leases(reference, lease_parties(role, tenants(display_name)), units(label, properties(name))), receipts(id, receipt_number, status)',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('payment_allocations')
      .select(
        'id, amount_kobo, charge_id, note, charges(sequence, kind, period_start, period_end, due_on, amount_kobo)',
      )
      .eq('payment_id', id)
      .order('created_at'),
  ]);

  if (error !== null || payment === null) notFound();

  const lease = payment.leases;
  const tenant =
    lease?.lease_parties.find((party) => party.role === 'tenant')?.tenants?.display_name ??
    'Tenant';
  const receipt = payment.receipts;

  const staffIds = [...new Set([payment.recorded_by, payment.confirmed_by])].filter(
    (staffId): staffId is string => staffId !== null,
  );
  const { data: profiles } =
    staffIds.length === 0
      ? { data: [] }
      : await supabase.from('users').select('id, full_name, email').in('id', staffIds);
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const nameOf = (staffId: string | null): string =>
    staffId === null
      ? '—'
      : (profileById.get(staffId)?.full_name ?? profileById.get(staffId)?.email ?? 'Staff member');

  const original = payment.reversal_of_id
    ? (
        await supabase
          .from('payments')
          .select('id, status, amount_kobo, paid_on')
          .eq('id', payment.reversal_of_id)
          .maybeSingle()
      ).data
    : null;
  const reversal = (
    await supabase
      .from('payments')
      .select('id, status, paid_on, amount_kobo')
      .eq('reversal_of_id', id)
      .maybeSingle()
  ).data;

  const reversed = payment.status === 'reversed';
  const isReversalRow = payment.reversal_of_id !== null;
  const canConfirm =
    payment.status === 'recorded' && !isReversalRow && viewer.access.can('payment.record');
  const canReverse =
    viewer.access.can('payment.reverse') && payment.status !== 'reversed' && !isReversalRow;

  return (
    <>
      <PageHeader
        title={isReversalRow ? 'Reversal' : 'Payment'}
        description={`${formatDate(payment.paid_on)} · ${lease?.reference ?? 'No lease reference'}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/rent" variant="secondary">
              Rent and arrears
            </LinkButton>
            {receipt !== null && (
              <LinkButton href={`/rent/receipts/${receipt.id}`} variant="secondary">
                Receipt {receipt.receipt_number}
              </LinkButton>
            )}
          </div>
        }
      />

      {reversed && (
        <div
          role="status"
          className="mb-4 rounded-md bg-warning-soft px-4 py-3 text-sm text-warning-text"
        >
          <strong>This payment was reversed.</strong>{' '}
          {payment.reversal_reason ?? 'A linked reversal payment holds the correction.'}
        </div>
      )}

      <Card className="mb-6">
        <CardBody className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-subtle">
                {isReversalRow ? 'Amount reversed' : 'Amount received'}
              </p>
              <p className="mt-1 text-3xl">
                <Money kobo={String(payment.amount_kobo)} />
              </p>
            </div>
            <Badge tone={paymentStatusTone(payment.status)}>{statusLabel(payment.status)}</Badge>
          </div>

          <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Tenant</dt>
              <dd className="mt-0.5 text-text">{tenant}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Property and unit</dt>
              <dd className="mt-0.5 text-text">
                {lease?.units?.properties?.name ?? 'Property'}
                <span className="block text-xs text-muted">{lease?.units?.label ?? 'Unit'}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Method</dt>
              <dd className="mt-0.5 text-text">{paymentMethodLabel(payment.method)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Reference</dt>
              <dd className="mt-0.5 text-text">{payment.reference ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Recorded</dt>
              <dd className="mt-0.5 text-text">
                {formatDate(payment.paid_on)}
                <span className="block text-xs text-muted">by {nameOf(payment.recorded_by)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Confirmed</dt>
              <dd className="mt-0.5 text-text">
                {payment.confirmed_at === null
                  ? 'Not yet confirmed'
                  : formatDate(payment.confirmed_at.slice(0, 10))}
                {payment.confirmed_by !== null && (
                  <span className="block text-xs text-muted">
                    by {nameOf(payment.confirmed_by)}
                  </span>
                )}
              </dd>
            </div>
            {payment.notes !== null && (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-subtle">Notes</dt>
                <dd className="mt-0.5 text-text">{payment.notes}</dd>
              </div>
            )}
            {(original !== null || reversal !== null) && (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-subtle">Linked payment</dt>
                <dd className="mt-0.5 text-text">
                  {original !== null && (
                    <Link
                      href={`/rent/payments/${original.id}`}
                      className="text-info-text underline-offset-2 hover:underline"
                    >
                      This reverses the payment of {formatDate(original.paid_on)}
                    </Link>
                  )}
                  {original !== null && reversal !== null && ' · '}
                  {reversal !== null && (
                    <Link
                      href={`/rent/payments/${reversal.id}`}
                      className="text-info-text underline-offset-2 hover:underline"
                    >
                      Reversed by the payment of {formatDate(reversal.paid_on)}
                    </Link>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="How it was applied"
          description="Each row is one charge, or tenant credit when the money exceeded what was owed."
        />
        <CardBody className="p-0">
          <Table caption="Payment allocations">
            <thead>
              <tr>
                <Th>Charge</Th>
                <Th>Period</Th>
                <Th>Due</Th>
                <Th numeric>Allocated</Th>
              </tr>
            </thead>
            <tbody>
              {allocations === null || allocations.length === 0 ? (
                <TableEmpty colSpan={4} message="No allocations recorded." />
              ) : (
                allocations.map((allocation) => (
                  <tr key={allocation.id}>
                    <Td>
                      {allocation.charges === null
                        ? 'Tenant credit'
                        : `${statusLabel(allocation.charges.kind)} ${allocation.charges.sequence}`}
                      {allocation.note !== null && (
                        <span className="block text-xs text-subtle">{allocation.note}</span>
                      )}
                    </Td>
                    <Td>
                      {allocation.charges === null
                        ? '—'
                        : `${formatDate(allocation.charges.period_start)} to ${formatDate(allocation.charges.period_end)}`}
                    </Td>
                    <Td>
                      {allocation.charges === null ? '—' : formatDate(allocation.charges.due_on)}
                    </Td>
                    <Td numeric>
                      <Money kobo={String(allocation.amount_kobo)} />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      {(canConfirm || canReverse) && (
        <Card>
          <CardHeader
            title="Actions"
            description="Confirmation checks the money against its source. Reversal corrects a record without deleting it."
          />
          <CardBody className="grid gap-6 sm:grid-cols-2">
            {canConfirm && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-text">Confirm the money</h3>
                <p className="text-sm text-muted">
                  Mark it reconciled after checking the bank statement or the cash box. Confirmed
                  payments stay in the cash-up totals.
                </p>
                <ConfirmPaymentButton paymentId={payment.id} />
              </div>
            )}
            {canReverse && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-text">Reverse the payment</h3>
                <p className="text-sm text-muted">
                  The original stays, the receipt keeps its number, and a linked negative payment
                  returns the charge balances.
                </p>
                <ReversePaymentForm paymentId={payment.id} receiptId={receipt?.id ?? ''} />
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </>
  );
}
