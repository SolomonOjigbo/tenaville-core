import { redirect } from 'next/navigation';
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
  Stat,
  Table,
  TableEmpty,
  Td,
  Th,
  paymentStatusTone,
  statusLabel,
} from '../../../components/ui';
import {
  daysOverdue,
  monthStartIso,
  outstandingKobo,
  paymentMethodLabel,
  sumKobo,
  todayIso,
} from '../../../lib/payments';
import { formatDate } from '../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../server/session';

/**
 * Rent received and what is still owed (RENT-2…RENT-5, TV-022).
 *
 * The outstanding figure is derived from allocations, never from a stored
 * balance (PRD §10.4): a charge's amount minus what has been applied to it.
 * The same subtraction puts money back when a payment is reversed, because a
 * reversal is a negative allocation rather than an edit.
 *
 * Arrears ageing buckets (RENT-5) and the rent roll (AN-1) are the next layer;
 * this screen shows the answer to "who owes what today", which is the question
 * the agency actually asks.
 */
export default async function RentPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('payment.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see rent records"
          description="Recording and reviewing payments is a money permission. Ask an owner, administrator or accountant for access."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const today = todayIso();
  const monthStart = monthStartIso(today);

  const [chargesResult, paymentsResult, monthResult, receiptCount] = await Promise.all([
    supabase
      .from('charges')
      .select(
        'id, lease_id, due_on, period_start, period_end, amount_kobo, status, payment_allocations(amount_kobo), leases(reference, units(label, properties(name)), lease_parties(role, tenants(display_name)))',
      )
      .eq('status', 'open')
      .order('due_on')
      .limit(400),
    supabase
      .from('payments')
      .select(
        'id, paid_on, amount_kobo, method, status, reversal_of_id, leases(reference, units(label), lease_parties(role, tenants(display_name))), receipts(id, receipt_number, status)',
      )
      .order('recorded_at', { ascending: false })
      .limit(12),
    supabase.from('payments').select('amount_kobo, paid_on').gte('paid_on', monthStart),
    supabase
      .from('receipts')
      .select('id', { count: 'exact', head: true })
      .gte('issued_on', monthStart),
  ]);

  const outstanding = (chargesResult.data ?? [])
    .map((charge) => ({
      ...charge,
      outstandingKobo: outstandingKobo(charge.amount_kobo, charge.payment_allocations),
      overdueDays: daysOverdue(charge.due_on, today),
    }))
    .filter((charge) => charge.outstandingKobo > 0n)
    .sort((a, b) => a.due_on.localeCompare(b.due_on));

  const totalOutstanding = outstanding.reduce(
    (total, charge) => total + charge.outstandingKobo,
    0n,
  );
  const totalOverdue = outstanding
    .filter((charge) => charge.overdueDays > 0)
    .reduce((total, charge) => total + charge.outstandingKobo, 0n);
  const collected = sumKobo((monthResult.data ?? []).map((payment) => payment.amount_kobo));

  const tenantOf = (
    lease: { lease_parties: { role: string; tenants: { display_name: string } | null }[] } | null,
  ): string =>
    lease?.lease_parties.find((party) => party.role === 'tenant')?.tenants?.display_name ??
    'Tenant';

  return (
    <>
      <PageHeader
        title="Rent and arrears"
        description="Money received, and what is still owed. Amounts are allocated to the oldest unpaid charge first."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/rent/receipts" variant="secondary">
              All receipts
            </LinkButton>
            {viewer.access.can('payment.record') && (
              <LinkButton href="/rent/payments/new">Record a payment</LinkButton>
            )}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Outstanding"
          value={<Money kobo={totalOutstanding.toString()} />}
          hint={`${outstanding.length} open charge${outstanding.length === 1 ? '' : 's'}`}
        />
        <Stat
          label="Overdue"
          value={<Money kobo={totalOverdue.toString()} />}
          hint="Due before today"
        />
        <Stat
          label="Collected this month"
          value={<Money kobo={collected.toString()} />}
          hint="Net of reversals"
        />
        <Stat label="Receipts issued this month" value={receiptCount.count ?? 0} />
      </div>

      <Card className="mb-6">
        <CardHeader
          title="What is owed"
          description="Open charges, oldest first. A charge disappears from this list when its allocations cover it."
          action={
            outstanding.some((charge) => charge.overdueDays > 0) ? (
              <Badge tone="danger">
                {outstanding.filter((charge) => charge.overdueDays > 0).length} overdue
              </Badge>
            ) : undefined
          }
        />
        {outstanding.length === 0 ? (
          <EmptyState
            title="Nothing outstanding"
            description="Every open charge has been paid. New charges appear here when a lease is activated or its next period is raised."
          />
        ) : (
          <CardBody className="p-0">
            <Table caption="Outstanding rent charges">
              <thead>
                <tr>
                  <Th>Tenant</Th>
                  <Th>Property and unit</Th>
                  <Th>Period</Th>
                  <Th>Due</Th>
                  <Th numeric>Outstanding</Th>
                </tr>
              </thead>
              <tbody>
                {outstanding.map((charge) => (
                  <tr key={charge.id}>
                    <Td>
                      <span className="text-text">{tenantOf(charge.leases)}</span>
                      <span className="block text-xs text-subtle">
                        {charge.leases?.reference ?? 'No lease reference'}
                      </span>
                    </Td>
                    <Td>
                      {charge.leases?.units?.properties?.name ?? 'Property'}
                      <span className="block text-xs text-subtle">
                        {charge.leases?.units?.label ?? 'Unit'}
                      </span>
                    </Td>
                    <Td>
                      {formatDate(charge.period_start)}
                      <span className="block text-xs text-subtle">
                        to {formatDate(charge.period_end)}
                      </span>
                    </Td>
                    <Td>
                      {formatDate(charge.due_on)}
                      {charge.overdueDays > 0 && (
                        <span className="block text-xs text-danger-text">
                          {charge.overdueDays} day{charge.overdueDays === 1 ? '' : 's'} overdue
                        </span>
                      )}
                    </Td>
                    <Td numeric>
                      <Money kobo={charge.outstandingKobo.toString()} tone="owed" />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Recent payments"
          description="The last twelve recorded. Each one has a receipt; a reversal keeps the original number."
        />
        {paymentsResult.data === null || paymentsResult.data.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Record the first payment and a receipt is issued in the same step. Offline capture keeps a provisional reference until the server assigns the official number."
            action={
              viewer.access.can('payment.record') ? (
                <LinkButton href="/rent/payments/new">Record a payment</LinkButton>
              ) : undefined
            }
          />
        ) : (
          <CardBody className="p-0">
            <Table caption="Recent payments">
              <thead>
                <tr>
                  <Th>Received</Th>
                  <Th>Tenant</Th>
                  <Th>Method</Th>
                  <Th numeric>Amount</Th>
                  <Th>Receipt</Th>
                </tr>
              </thead>
              <tbody>
                {paymentsResult.data.length === 0 ? (
                  <TableEmpty colSpan={5} message="No payments yet." />
                ) : (
                  paymentsResult.data.map((payment) => {
                    const isReversal = payment.reversal_of_id !== null;
                    return (
                      <tr key={payment.id}>
                        <Td>{formatDate(payment.paid_on)}</Td>
                        <Td>
                          {tenantOf(payment.leases)}
                          <span className="block text-xs text-subtle">
                            {payment.leases?.units?.label ?? 'Unit'}
                          </span>
                        </Td>
                        <Td>{paymentMethodLabel(payment.method)}</Td>
                        <Td numeric>
                          <Money
                            kobo={String(payment.amount_kobo)}
                            tone={isReversal ? 'default' : 'paid'}
                          />
                        </Td>
                        <Td>
                          {isReversal ? (
                            <Badge tone="neutral">Reversal</Badge>
                          ) : payment.receipts !== null ? (
                            <Link
                              href={`/rent/receipts/${payment.receipts.id}`}
                              className="text-info-text underline-offset-2 hover:underline"
                            >
                              {payment.receipts.receipt_number}
                            </Link>
                          ) : (
                            '—'
                          )}
                          <span className="ml-2 inline-block align-middle">
                            <Badge tone={paymentStatusTone(payment.status)}>
                              {statusLabel(payment.status)}
                            </Badge>
                          </span>
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </CardBody>
        )}
      </Card>
    </>
  );
}
