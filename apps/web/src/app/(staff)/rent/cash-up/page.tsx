import Link from 'next/link';
import { redirect } from 'next/navigation';

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
  Stat,
  Table,
  TableEmpty,
  Td,
  TextInput,
  Th,
  paymentStatusTone,
  statusLabel,
} from '../../../../components/ui';
import { ConfirmPaymentButton } from '../../../../components/payments/confirm-payment-button';
import { formatDate } from '../../../../lib/format';
import { paymentMethodLabel, summariseCashUp, todayIso } from '../../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/**
 * Daily cash-up (RENT-15).
 *
 * One business date, grouped by how the money arrived and by who recorded it.
 * This is the control that catches a mis-keyed amount the same day instead of
 * at month end: gross received and reversals are shown separately, and every
 * payment still marked "recorded" is listed so it can be confirmed against the
 * bank or the cash box.
 */
export default async function CashUpPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const requested = typeof date === 'string' ? date : '';
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayIso();

  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('payment.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see the cash-up"
          description="This is a money screen. Ask an owner, administrator or accountant for access."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();

  const { data } = await supabase
    .from('payments')
    .select(
      'id, amount_kobo, method, status, recorded_by, paid_on, recorded_at, reference, leases(reference, lease_parties(role, tenants(display_name)))',
    )
    .eq('paid_on', selected)
    .order('recorded_at');

  const rows = data ?? [];
  const summary = summariseCashUp(rows);

  const recorderIds = [
    ...new Set(rows.map((row) => row.recorded_by).filter((id): id is string => id !== null)),
  ];

  const { data: profiles } =
    recorderIds.length === 0
      ? { data: [] }
      : await supabase.from('users').select('id, full_name, email').in('id', recorderIds);

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  const byRecorder = new Map<string, { count: number; netKobo: bigint }>();
  for (const row of rows) {
    const key = row.recorded_by ?? 'unknown';
    const current = byRecorder.get(key) ?? { count: 0, netKobo: 0n };
    byRecorder.set(key, {
      count: current.count + 1,
      netKobo: current.netKobo + BigInt(row.amount_kobo),
    });
  }

  const recorderRows = [...byRecorder.entries()]
    .map(([id, totals]) => ({
      id,
      name:
        profileById.get(id)?.full_name ??
        profileById.get(id)?.email ??
        (id === 'unknown' ? 'Not recorded' : id),
      ...totals,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const awaiting = rows.filter((row) => row.status === 'recorded');
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
        title="Daily cash-up"
        description="Money by the date it changed hands, for checking against the bank statement or the cash box."
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
            <div className="min-w-[12rem]">
              <Field
                id="cashup-date"
                label="Business date"
                hint="The date the money changed hands."
              >
                <TextInput id="cashup-date" name="date" type="date" defaultValue={selected} />
              </Field>
            </div>
            <Button type="submit" variant="secondary">
              Show this day
            </Button>
            <Link
              href="/rent/cash-up"
              className="pb-3 text-sm text-info-text underline-offset-2 hover:underline"
            >
              Today
            </Link>
          </form>
        </CardBody>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Net for the day"
          value={<Money kobo={summary.netKobo.toString()} />}
          hint={formatDate(selected)}
        />
        <Stat label="Gross received" value={<Money kobo={summary.grossKobo.toString()} />} />
        <Stat
          label="Reversals"
          value={<Money kobo={summary.reversalKobo.toString()} tone="owed" />}
          hint="Money returned or corrected"
        />
        <Stat
          label="Payments"
          value={summary.count}
          hint={`${awaiting.length} awaiting confirmation`}
        />
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing recorded on this date"
            description="No payment has a business date matching this day. If money arrived, record it so the cash-up and the receipt agree."
            action={
              viewer.access.can('payment.record') ? (
                <LinkButton href="/rent/payments/new">Record a payment</LinkButton>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="By method"
              description="Count each method separately against its own source: cash box, bank statement, POS settlement."
            />
            <CardBody className="p-0">
              <Table caption="Cash-up by payment method">
                <thead>
                  <tr>
                    <Th>Method</Th>
                    <Th numeric>Payments</Th>
                    <Th numeric>Recorded</Th>
                    <Th numeric>Confirmed</Th>
                    <Th numeric>Reversed</Th>
                    <Th numeric>Net</Th>
                  </tr>
                </thead>
                <tbody>
                  {summary.methods.length === 0 ? (
                    <TableEmpty colSpan={6} message="Nothing on this date." />
                  ) : (
                    summary.methods.map((row) => (
                      <tr key={row.method}>
                        <Td>{paymentMethodLabel(row.method)}</Td>
                        <Td numeric>{row.count}</Td>
                        <Td numeric>{row.recorded}</Td>
                        <Td numeric>{row.confirmed}</Td>
                        <Td numeric>{row.reversed}</Td>
                        <Td numeric>
                          <Money kobo={row.netKobo.toString()} />
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="By who recorded it"
              description="Per person, because two staff can take cash on the same day and each has a handover."
            />
            <CardBody className="p-0">
              <Table caption="Cash-up by recorder">
                <thead>
                  <tr>
                    <Th>Recorded by</Th>
                    <Th numeric>Payments</Th>
                    <Th numeric>Net</Th>
                  </tr>
                </thead>
                <tbody>
                  {recorderRows.length === 0 ? (
                    <TableEmpty colSpan={3} message="Nothing on this date." />
                  ) : (
                    recorderRows.map((row) => (
                      <tr key={row.id}>
                        <Td>{row.name}</Td>
                        <Td numeric>{row.count}</Td>
                        <Td numeric>
                          <Money kobo={row.netKobo.toString()} />
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Awaiting confirmation"
              description="Recorded but not yet checked against a statement or the cash box."
              action={
                <Badge tone={awaiting.length > 0 ? 'warning' : 'success'}>{awaiting.length}</Badge>
              }
            />
            <CardBody className="p-0">
              <Table caption="Payments awaiting confirmation">
                <thead>
                  <tr>
                    <Th>Received</Th>
                    <Th>Tenant and lease</Th>
                    <Th>Method</Th>
                    <Th numeric>Amount</Th>
                    <Th>Status</Th>
                    <Th>{''}</Th>
                  </tr>
                </thead>
                <tbody>
                  {awaiting.length === 0 ? (
                    <TableEmpty colSpan={6} message="Everything on this date has been confirmed." />
                  ) : (
                    awaiting.map((row) => (
                      <tr key={row.id}>
                        <Td>{formatDate(row.paid_on)}</Td>
                        <Td>
                          {tenantOf(row.leases)}
                          <span className="block text-xs text-subtle">
                            {row.leases?.reference ?? 'No lease reference'}
                          </span>
                        </Td>
                        <Td>{paymentMethodLabel(row.method)}</Td>
                        <Td numeric>
                          <Money kobo={String(row.amount_kobo)} />
                        </Td>
                        <Td>
                          <Badge tone={paymentStatusTone(row.status)}>
                            {statusLabel(row.status)}
                          </Badge>
                        </Td>
                        <Td>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/rent/payments/${row.id}`}
                              className="text-sm text-info-text underline-offset-2 hover:underline"
                            >
                              View
                            </Link>
                            {viewer.access.can('payment.record') && (
                              <ConfirmPaymentButton paymentId={row.id} />
                            )}
                          </div>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
