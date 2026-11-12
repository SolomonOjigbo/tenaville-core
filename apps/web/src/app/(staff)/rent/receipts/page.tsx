import { redirect } from 'next/navigation';
import Link from 'next/link';

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  LinkButton,
  Money,
  PageHeader,
  Table,
  TableEmpty,
  Td,
  TextInput,
  Th,
  receiptStatusTone,
  statusLabel,
} from '../../../../components/ui';
import { formatDate } from '../../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/**
 * Issued receipts (RENT-13, TV-024).
 *
 * Search is by receipt number because that is what a tenant quotes and what an
 * auditor asks for. A receipt is never edited, so the list is a log rather than
 * a working queue — the newest fifty are enough for the office, and the search
 * reaches the rest by number.
 */
export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? '').trim();

  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('payment.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see receipts"
          description="Receipts follow the payment permission. Ask an owner, administrator or accountant for access."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();

  let request = supabase
    .from('receipts')
    .select(
      'id, receipt_number, status, issued_on, leases(reference, units(label, properties(name)), lease_parties(role, tenants(display_name))), payments(amount_kobo)',
    )
    .order('issued_on', { ascending: false })
    .order('sequence', { ascending: false })
    .limit(50);

  if (query !== '') request = request.ilike('receipt_number', `%${query}%`);

  const { data } = await request;
  const rows = data ?? [];

  const tenantOf = (
    lease: {
      lease_parties: { role: string; tenants: { display_name: string } | null }[];
    } | null,
  ): string =>
    lease?.lease_parties.find((party) => party.role === 'tenant')?.tenants?.display_name ??
    'Tenant';

  return (
    <>
      <PageHeader
        title="Receipts"
        description="Every official number issued, newest first. Numbers are never reused; a reversal marks the receipt rather than replacing it."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/rent" variant="secondary">
              Rent and arrears
            </LinkButton>
            {viewer.access.can('payment.record') && (
              <LinkButton href="/rent/payments/new">Record a payment</LinkButton>
            )}
          </div>
        }
      />

      <Card className="mb-6">
        <CardBody>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="min-w-[16rem] flex-1">
              <Field
                id="receipt-search"
                label="Find a receipt"
                hint="Search by receipt number, e.g. R-2026-00042."
              >
                <TextInput
                  id="receipt-search"
                  name="q"
                  defaultValue={query}
                  placeholder="R-2026-00001"
                  autoComplete="off"
                />
              </Field>
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {query !== '' && (
              <Link
                href="/rent/receipts"
                className="pb-3 text-sm text-info-text underline-offset-2 hover:underline"
              >
                Clear
              </Link>
            )}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={query === '' ? 'Most recent receipts' : `Receipts matching “${query}”`}
          description={
            query === ''
              ? 'The last fifty issued.'
              : `${rows.length} result${rows.length === 1 ? '' : 's'}.`
          }
          action={<Badge tone="neutral">{rows.length}</Badge>}
        />
        <CardBody className="p-0">
          <Table caption="Issued receipts">
            <thead>
              <tr>
                <Th>Receipt</Th>
                <Th>Issued</Th>
                <Th>Tenant</Th>
                <Th>Property and unit</Th>
                <Th numeric>Amount</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <TableEmpty
                  colSpan={6}
                  message={
                    query === ''
                      ? 'No receipts yet. Record a payment and its receipt is issued in the same step.'
                      : 'No receipt number matches that search.'
                  }
                />
              ) : (
                rows.map((receipt) => (
                  <tr key={receipt.id}>
                    <Td>
                      <Link
                        href={`/rent/receipts/${receipt.id}`}
                        className="text-info-text underline-offset-2 hover:underline"
                      >
                        {receipt.receipt_number}
                      </Link>
                    </Td>
                    <Td>{formatDate(receipt.issued_on)}</Td>
                    <Td>{tenantOf(receipt.leases)}</Td>
                    <Td>
                      {receipt.leases?.units?.properties?.name ?? 'Property'}
                      <span className="block text-xs text-subtle">
                        {receipt.leases?.units?.label ?? 'Unit'}
                      </span>
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

      {rows.length === 0 && query === '' && viewer.access.can('payment.record') && (
        <div className="mt-4">
          <LinkButton href="/rent/payments/new">Record the first payment</LinkButton>
        </div>
      )}
    </>
  );
}
