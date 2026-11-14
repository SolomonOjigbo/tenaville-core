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
  receiptStatusTone,
  statusLabel,
} from '../../../../../components/ui';
import { PrintButton } from '../../../../../components/payments/print-button';
import { ReversePaymentForm } from '../../../../../components/payments/reverse-payment-form';
import { formatDate } from '../../../../../lib/format';
import { paymentMethodLabel } from '../../../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../../../server/session';

/**
 * One receipt (RENT-13, TV-024).
 *
 * The number is the server's, the payment is append-only, and the receipt can
 * only move from issued to void or reversed. What is printed here therefore
 * matches what the tenant was told unless a later reversal says otherwise in
 * so many words — which is the point of not renumbering.
 */
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('payment.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see receipts"
          description="Receipts follow the payment permission. Ask an owner, administrator or accountant for access."
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

  const { data: receipt, error } = await supabase
    .from('receipts')
    .select(
      'id, receipt_number, status, issued_on, issued_at, voided_at, void_reason, verification_code, payment_id, branches(name), leases(reference, lease_parties(role, tenants(display_name)), units(label, properties(name, address_line, lga, state_code))), payments(amount_kobo, method, reference, paid_on, status, reversal_reason, recorded_by)',
    )
    .eq('id', id)
    .maybeSingle();

  // A receipt outside the viewer's reach is indistinguishable from one that
  // does not exist, which is deliberate (ORG-8).
  if (error !== null || receipt === null) notFound();

  // RENT-13 lists "recorded by" as receipt content. The profile is readable to
  // staff in the same organisation (users_select_shared_organisation), so this
  // is the recorder's name where they have one, and their address otherwise.
  const recorder =
    receipt.payments?.recorded_by === null || receipt.payments?.recorded_by === undefined
      ? null
      : ((
          await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', receipt.payments.recorded_by)
            .maybeSingle()
        ).data ?? null);

  const lease = receipt.leases;
  const payment = receipt.payments;
  const tenant =
    lease?.lease_parties.find((party) => party.role === 'tenant')?.tenants?.display_name ??
    'Tenant';
  const property = lease?.units?.properties;
  const address =
    property === null || property === undefined
      ? null
      : [property.address_line, property.lga, property.state_code]
          .filter((part) => part !== null && part !== undefined && part !== '')
          .join(', ');

  const reversed = receipt.status === 'reversed' || payment?.status === 'reversed';
  const canReverse =
    viewer.access.can('payment.reverse') &&
    receipt.status === 'issued' &&
    payment?.status !== 'reversed' &&
    payment?.amount_kobo !== undefined &&
    payment.amount_kobo > 0;

  return (
    <>
      <PageHeader
        title={`Receipt ${receipt.receipt_number}`}
        description="Issued once, from the payment it records. A correction reverses the payment rather than editing this receipt."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/rent/receipts" variant="secondary">
              All receipts
            </LinkButton>
            <LinkButton href="/rent" variant="secondary">
              Back to rent
            </LinkButton>
            <LinkButton href={`/api/v1/receipts/${receipt.id}/pdf`} variant="secondary">
              Download PDF
            </LinkButton>
            <PrintButton />
          </div>
        }
      />

      {reversed && (
        <div
          role="status"
          className="mx-auto mb-4 max-w-2xl rounded-md bg-warning-soft px-4 py-3 text-sm text-warning-text print:max-w-none"
        >
          <strong>This receipt is {statusLabel(receipt.status).toLowerCase()}.</strong>{' '}
          {receipt.void_reason ??
            payment?.reversal_reason ??
            'The payment it records was reversed.'}
        </div>
      )}

      <Card className="mx-auto max-w-2xl print:max-w-none print:border-0 print:shadow-none">
        <CardBody className="space-y-6 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="font-display text-lg text-text">{viewer.organisationName}</p>
              <p className="text-sm text-muted">
                Official receipt{receipt.branches?.name ? ` · ${receipt.branches.name}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg text-text">{receipt.receipt_number}</p>
              <Badge tone={receiptStatusTone(receipt.status)}>{statusLabel(receipt.status)}</Badge>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-subtle">Amount received</p>
            <p className="mt-1 text-3xl">
              <Money kobo={String(payment?.amount_kobo ?? 0)} />
            </p>
          </div>

          <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Received from</dt>
              <dd className="mt-0.5 text-text">{tenant}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Issued on</dt>
              <dd className="mt-0.5 text-text">{formatDate(receipt.issued_on)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Property</dt>
              <dd className="mt-0.5 text-text">
                {property?.name ?? 'Property'}
                <span className="block text-xs text-muted">
                  {lease?.units?.label ?? 'Unit'}
                  {address === null ? '' : ` · ${address}`}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Tenancy</dt>
              <dd className="mt-0.5 text-text">{lease?.reference ?? 'No reference'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Payment date</dt>
              <dd className="mt-0.5 text-text">
                {formatDate(payment?.paid_on ?? receipt.issued_on)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Method</dt>
              <dd className="mt-0.5 text-text">
                {payment === null ? '—' : paymentMethodLabel(payment.method)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Reference</dt>
              <dd className="mt-0.5 text-text">{payment?.reference ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Payment status</dt>
              <dd className="mt-0.5 text-text">
                {payment === null ? '—' : statusLabel(payment.status)}
              </dd>
            </div>{' '}
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Recorded by</dt>
              <dd className="mt-0.5 text-text">
                {recorder?.full_name ?? recorder?.email ?? 'Not recorded'}
              </dd>
            </div>
          </dl>

          <div className="border-t border-border pt-4 text-xs text-subtle">
            <p>
              Verification code:{' '}
              <span className="tabular font-mono text-text">{receipt.verification_code}</span>
            </p>
            <p className="mt-1">
              Quote this code when verifying the receipt with {viewer.organisationName}. Issued by
              Tenaville. This receipt cannot be edited; a correction reverses the payment and issues
              a fresh receipt, and this number is never reused.
            </p>
          </div>
        </CardBody>
      </Card>

      {canReverse && payment !== null && (
        <Card className="mx-auto mt-6 max-w-2xl print:hidden">
          <CardHeader
            title="Reverse this payment"
            description="If the amount, tenant or tenancy is wrong, reverse it and record the correct one. Nothing is deleted."
          />
          <CardBody>
            <ReversePaymentForm paymentId={receipt.payment_id} receiptId={receipt.id} />
          </CardBody>
        </Card>
      )}
    </>
  );
}
