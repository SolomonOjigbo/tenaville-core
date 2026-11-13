import { notFound, redirect } from 'next/navigation';

import { billingInvoiceStatusLabel, invoiceBalanceKobo } from '@tenaville/core/billing';
import { formatNaira, kobo } from '@tenaville/money';

import { InvoicePaymentForm } from '../../../../../components/forms/invoice-payment-form';
import { PrintButton } from '../../../../../components/payments/print-button';
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
  invoiceStatusTone,
} from '../../../../../components/ui';
import { formatDate, formatDateTime } from '../../../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../../../server/session';

/** A printable invoice with its payment history (BILL-2). */
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('org.billing.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see this invoice"
          description="Only an owner, administrator or accountant can see billing records."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data: invoice, error } = await supabase
    .from('billing_invoices')
    .select(
      'id, invoice_number, status, issued_on, due_on, period_start, period_end, plan_id, subtotal_kobo, total_kobo, amount_paid_kobo, paid_at, currency, notes',
    )
    .eq('id', id)
    .eq('organisation_id', viewer.organisationId)
    .maybeSingle();

  if (error !== null || invoice === null) notFound();

  const [{ data: lines }, { data: payments }] = await Promise.all([
    supabase
      .from('billing_invoice_lines')
      .select('id, kind, description, quantity, unit_amount_kobo, amount_kobo')
      .eq('invoice_id', id)
      .order('created_at'),
    supabase
      .from('billing_invoice_payments')
      .select('id, amount_kobo, method, reference, paid_on, recorded_by')
      .eq('invoice_id', id)
      .order('paid_on'),
  ]);

  const lineRows = lines ?? [];
  const paymentRows = payments ?? [];
  const balance = invoiceBalanceKobo(invoice.total_kobo, invoice.amount_paid_kobo);
  const canRecord =
    viewer.access.can('org.billing.payment.record') &&
    balance > 0n &&
    invoice.status !== 'void' &&
    invoice.status !== 'paid';
  const month = invoice.period_start.slice(0, 7);

  return (
    <>
      <PageHeader
        title={invoice.invoice_number}
        description={`${formatDate(invoice.period_start)} – ${formatDate(invoice.period_end)} · ${month}`}
        action={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <LinkButton href="/settings/invoices" variant="secondary">
              Back to invoices
            </LinkButton>
            <PrintButton />
          </div>
        }
      />

      <Card className="mx-auto mb-6 max-w-3xl print:max-w-none print:border-0 print:shadow-none">
        <CardBody className="space-y-6 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="font-display text-lg text-text">{viewer.organisationName}</p>
              <p className="text-sm text-muted">Invoice · {invoice.plan_id}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg text-text">{invoice.invoice_number}</p>
              <Badge tone={invoiceStatusTone(invoice.status)}>
                {billingInvoiceStatusLabel(invoice.status)}
              </Badge>
            </div>
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Issued</dt>
              <dd className="mt-0.5 text-text">{formatDate(invoice.issued_on)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Due</dt>
              <dd className="mt-0.5 text-text">
                {invoice.due_on === null ? '—' : formatDate(invoice.due_on)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Balance</dt>
              <dd className="mt-0.5 text-text">
                <Money kobo={balance.toString()} />
              </dd>
            </div>
          </dl>

          <Table caption="Invoice lines">
            <thead>
              <tr>
                <Th>Description</Th>
                <Th numeric>Qty</Th>
                <Th numeric>Unit price</Th>
                <Th numeric>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {lineRows.length === 0 ? (
                <TableEmpty colSpan={4} message="No lines on this invoice." />
              ) : (
                lineRows.map((line) => (
                  <tr key={line.id}>
                    <Td>
                      {line.description}
                      <span className="block text-xs text-subtle">
                        {line.kind.replace(/_/g, ' ')}
                      </span>
                    </Td>
                    <Td numeric>{line.quantity}</Td>
                    <Td numeric>
                      <Money kobo={String(line.unit_amount_kobo)} />
                    </Td>
                    <Td numeric>
                      <Money kobo={String(line.amount_kobo)} />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>

          <div className="ml-auto max-w-xs space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="text-text">{formatNaira(kobo(invoice.subtotal_kobo))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Paid</span>
              <span className="text-text">{formatNaira(kobo(invoice.amount_paid_kobo))}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-medium">
              <span className="text-text">Balance</span>
              <span className="text-text">{formatNaira(kobo(balance))}</span>
            </div>
          </div>

          <p className="border-t border-border pt-4 text-xs text-subtle">
            {invoice.notes ?? 'Payment is due by the date above. Thank you.'}
            {invoice.paid_at !== null && ` Paid ${formatDateTime(invoice.paid_at)}.`}
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Payments" description="Every payment recorded against this invoice." />
          <CardBody className="p-0">
            <Table caption="Invoice payments">
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Method</Th>
                  <Th>Reference</Th>
                  <Th numeric>Amount</Th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.length === 0 ? (
                  <TableEmpty colSpan={4} message="No payments yet." />
                ) : (
                  paymentRows.map((payment) => (
                    <tr key={payment.id}>
                      <Td>{formatDate(payment.paid_on)}</Td>
                      <Td>{payment.method.replace(/_/g, ' ')}</Td>
                      <Td>{payment.reference ?? '—'}</Td>
                      <Td numeric>
                        <Money kobo={String(payment.amount_kobo)} />
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </CardBody>
        </Card>

        {canRecord && (
          <Card>
            <CardHeader title="Record a payment" description="Bank transfer, card or cash." />
            <CardBody>
              <InvoicePaymentForm invoiceId={invoice.id} canRecord={canRecord} />
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
