import Link from 'next/link';

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
  receiptStatusTone,
  statusLabel,
} from '../../../../components/ui';
import { formatDate } from '../../../../lib/format';
import { paymentMethodLabel } from '../../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** Receipts issued to this tenant (TENANT-3). */
export default async function TenantPaymentsPage() {
  const viewer = await currentViewer();
  if (!viewer?.access.can('self.tenancy.read')) {
    return (
      <Card>
        <EmptyState
          title="No tenancy access"
          description="This area is for tenants. Ask the agency to link your account to your tenancy."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data } = await supabase
    .from('receipts')
    .select(
      'id, receipt_number, status, issued_on, payments(amount_kobo, method, paid_on, status), leases(reference, units(label))',
    )
    .order('issued_on', { ascending: false });

  const rows = data ?? [];

  return (
    <>
      <PageHeader
        title="Payments and receipts"
        description="Every receipt issued for your tenancy. A reversed receipt keeps its number and says so."
        action={
          <LinkButton href="/tenancy" variant="secondary">
            Back to tenancy
          </LinkButton>
        }
      />

      <Card>
        <CardHeader title="Receipts" description="Tap a number to see the printable receipt." />
        <CardBody className="p-0">
          <Table caption="Receipts">
            <thead>
              <tr>
                <Th>Receipt</Th>
                <Th>Received</Th>
                <Th>Method</Th>
                <Th numeric>Amount</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5} message="No receipts yet." />
              ) : (
                rows.map((receipt) => (
                  <tr key={receipt.id}>
                    <Td>
                      <Link
                        href={`/tenancy/receipts/${receipt.id}`}
                        className="text-info-text underline-offset-2 hover:underline"
                      >
                        {receipt.receipt_number}
                      </Link>
                    </Td>
                    <Td>{formatDate(receipt.payments?.paid_on ?? receipt.issued_on)}</Td>
                    <Td>
                      {receipt.payments === null ? '—' : paymentMethodLabel(receipt.payments.method)}
                    </Td>
                    <Td numeric>
                      <Money kobo={String(receipt.payments?.amount_kobo ?? 0)} />
                    </Td>
                    <Td>
                      <Badge tone={receiptStatusTone(receipt.status)}>
                        {statusLabel(receipt.status)}
                      </Badge>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
