import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  billingInvoiceStatusLabel,
  invoiceBalanceKobo,
  isInvoiceOverdue,
} from '@tenaville/core/billing';

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
} from '../../../../components/ui';
import { formatDate } from '../../../../lib/format';
import { todayIso } from '../../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** Invoice history (BILL-2). */
export default async function InvoicesPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('org.billing.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see invoices"
          description="Only an owner, administrator or accountant can see billing records."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data } = await supabase
    .from('billing_invoices')
    .select(
      'id, invoice_number, period_start, period_end, status, total_kobo, amount_paid_kobo, issued_on, due_on',
    )
    .eq('organisation_id', viewer.organisationId)
    .order('issued_on', { ascending: false });

  const rows = data ?? [];
  const today = todayIso();

  return (
    <>
      <PageHeader
        title="Invoices"
        description="What the organisation has been billed, and what is still outstanding."
        action={
          <LinkButton href="/settings/plan" variant="secondary">
            Plan and limits
          </LinkButton>
        }
      />

      <Card>
        <CardHeader title="History" description="Newest first." />
        <CardBody className="p-0">
          <Table caption="Invoices">
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Period</Th>
                <Th numeric>Total</Th>
                <Th numeric>Paid</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5} message="No invoices have been issued yet." />
              ) : (
                rows.map((invoice) => {
                  const balance = invoiceBalanceKobo(
                    invoice.total_kobo,
                    invoice.amount_paid_kobo,
                  );
                  return (
                    <tr key={invoice.id}>
                      <Td>
                        <Link
                          href={`/settings/invoices/${invoice.id}`}
                          className="text-info-text underline-offset-2 hover:underline"
                        >
                          {invoice.invoice_number}
                        </Link>
                        <span className="block text-xs text-subtle">
                          Issued {formatDate(invoice.issued_on)}
                        </span>
                      </Td>
                      <Td>
                        {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
                      </Td>
                      <Td numeric>
                        <Money kobo={String(invoice.total_kobo)} />
                      </Td>
                      <Td numeric>
                        <Money kobo={String(invoice.amount_paid_kobo)} />
                        {balance > 0n && (
                          <span className="block text-xs text-muted">
                            <Money kobo={balance.toString()} /> left
                          </span>
                        )}
                      </Td>
                      <Td>
                        <Badge tone={invoiceStatusTone(invoice.status)}>
                          {billingInvoiceStatusLabel(invoice.status)}
                        </Badge>
                        {isInvoiceOverdue(invoice.status, invoice.due_on, today) && (
                          <span className="mt-1 block text-xs text-danger-text">Overdue</span>
                        )}
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
