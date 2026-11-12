import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { addDays, formatDate as formatCalendarDate, parseDate } from '@tenaville/core/leases';
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
  leaseStatusTone,
  paymentStatusTone,
  statusLabel,
} from '../../../../components/ui';
import { RenewLeaseForm } from '../../../../components/forms/renew-lease-form';
import { formatDate } from '../../../../lib/format';
import { outstandingKobo, paymentMethodLabel, sumKobo } from '../../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/**
 * One tenancy: terms, the schedule it was activated with, and the money
 * against it.
 *
 * The schedule is the charges table, not a second copy of the dates. If a
 * lease is a draft, that is visible here rather than inferred from an empty
 * rent list somewhere else.
 */
export default async function LeasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ warning?: string }>;
}) {
  const { id } = await params;
  const { warning } = await searchParams;

  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('lease.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see this lease"
          description="Leases follow the tenancy permission."
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

  const [{ data: lease, error }, { data: charges }, { data: payments }] = await Promise.all([
    supabase
      .from('leases')
      .select(
        'id, reference, status, starts_on, ends_on, rent_kobo, rent_frequency, rent_due_day, renewed_from_lease_id, terminated_on, units(id, property_id, label, properties(name, address_line)), lease_parties(role, tenants(display_name, phone, email)), lease_deposits!lease_deposits_lease_id_fkey(amount_kobo, status, custodian, received_on)',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('charges')
      .select(
        'id, sequence, kind, period_start, period_end, due_on, amount_kobo, status, payment_allocations(amount_kobo)',
      )
      .eq('lease_id', id)
      .order('sequence'),
    supabase
      .from('payments')
      .select(
        'id, paid_on, amount_kobo, method, status, reversal_of_id, receipts(id, receipt_number, status)',
      )
      .eq('lease_id', id)
      .order('recorded_at', { ascending: false })
      .limit(25),
  ]);

  if (error !== null || lease === null) notFound();

  const tenant = lease.lease_parties.find((party) => party.role === 'tenant')?.tenants ?? null;
  const deposit = lease.lease_deposits;

  const schedule = (charges ?? []).map((charge) => {
    const outstanding = outstandingKobo(charge.amount_kobo, charge.payment_allocations);
    return {
      ...charge,
      paid: BigInt(charge.amount_kobo) - outstanding,
      outstanding,
    };
  });
  const totalCharged = schedule.reduce((total, charge) => total + BigInt(charge.amount_kobo), 0n);
  const totalOutstanding = schedule
    .filter((charge) => charge.status === 'open')
    .reduce((total, charge) => total + charge.outstanding, 0n);
  const totalPaid = sumKobo((payments ?? []).map((payment) => payment.amount_kobo));

  const canRenew =
    viewer.access.can('lease.write') && (lease.status === 'active' || lease.status === 'expired');

  const suggestedEnd = formatCalendarDate(addDays(parseDate(lease.ends_on), 365));
  const currentRentLabel = formatNaira(fromTransport(String(lease.rent_kobo)));

  return (
    <>
      <PageHeader
        title={lease.reference ?? 'Lease'}
        description={`${lease.units?.properties?.name ?? 'Property'} · ${lease.units?.label ?? 'Unit'} · ${formatDate(lease.starts_on)} to ${formatDate(lease.ends_on)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/leases" variant="secondary">
              Back to leases
            </LinkButton>
            {viewer.access.can('payment.record') && (
              <LinkButton href="/rent/payments/new">Record a payment</LinkButton>
            )}
          </div>
        }
      />

      {warning === 'activation' && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-warning-soft px-4 py-3 text-sm text-warning-text"
        >
          <strong>The lease was saved, but its rent schedule could not be raised.</strong> It is a
          draft and owes nothing yet. Check the term dates and rent, then renew or recreate the
          lease.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Rent schedule"
              description="Raised from the lease terms when it was activated. Paid amounts come from allocations."
              action={
                <Badge tone={leaseStatusTone(lease.status)}>{statusLabel(lease.status)}</Badge>
              }
            />
            <CardBody className="p-0">
              <Table caption="Rent schedule">
                <thead>
                  <tr>
                    <Th>Period</Th>
                    <Th>Due</Th>
                    <Th numeric>Amount</Th>
                    <Th numeric>Paid</Th>
                    <Th numeric>Outstanding</Th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.length === 0 ? (
                    <TableEmpty
                      colSpan={5}
                      message="No rent schedule. A draft lease has not been activated."
                    />
                  ) : (
                    schedule.map((charge) => (
                      <tr key={charge.id}>
                        <Td>
                          {formatDate(charge.period_start)}
                          <span className="block text-xs text-subtle">
                            to {formatDate(charge.period_end)}
                          </span>
                        </Td>
                        <Td>{formatDate(charge.due_on)}</Td>
                        <Td numeric>
                          <Money kobo={String(charge.amount_kobo)} />
                        </Td>
                        <Td numeric>
                          <Money kobo={String(charge.paid)} tone="paid" />
                        </Td>
                        <Td numeric>
                          <Money kobo={charge.outstanding.toString()} tone="owed" />
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm">
                <span className="text-subtle">
                  Charged <Money kobo={totalCharged.toString()} />
                </span>
                <span className="text-subtle">
                  Outstanding <Money kobo={totalOutstanding.toString()} tone="owed" />
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Payments"
              description="The last twenty-five recorded against this tenancy."
              action={
                <LinkButton href="/rent" variant="secondary" size="sm">
                  Rent and arrears
                </LinkButton>
              }
            />
            <CardBody className="p-0">
              <Table caption="Payments against this lease">
                <thead>
                  <tr>
                    <Th>Received</Th>
                    <Th>Method</Th>
                    <Th numeric>Amount</Th>
                    <Th>Status</Th>
                    <Th>Receipt</Th>
                  </tr>
                </thead>
                <tbody>
                  {payments === null || payments.length === 0 ? (
                    <TableEmpty colSpan={5} message="No payments recorded." />
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment.id}>
                        <Td>
                          <Link
                            href={`/rent/payments/${payment.id}`}
                            className="text-info-text underline-offset-2 hover:underline"
                          >
                            {formatDate(payment.paid_on)}
                          </Link>
                        </Td>
                        <Td>{paymentMethodLabel(payment.method)}</Td>
                        <Td numeric>
                          <Money kobo={String(payment.amount_kobo)} />
                        </Td>
                        <Td>
                          <Badge tone={paymentStatusTone(payment.status)}>
                            {statusLabel(payment.status)}
                          </Badge>
                        </Td>
                        <Td>
                          {payment.reversal_of_id !== null ? (
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
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
              <div className="border-t border-border px-5 py-3 text-sm text-subtle">
                Payments net <Money kobo={totalPaid.toString()} />
              </div>
            </CardBody>
          </Card>

          {canRenew && (
            <Card>
              <CardHeader
                title="Renew this tenancy"
                description="Creates a new lease from the day after this one ends and activates its schedule. The old terms stay untouched."
              />
              <CardBody>
                <RenewLeaseForm
                  leaseId={lease.id}
                  suggestedEnd={suggestedEnd}
                  currentRentLabel={currentRentLabel}
                />
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Terms" description="As agreed on the tenancy." />
            <CardBody>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Tenant</dt>
                  <dd className="mt-0.5 text-text">{tenant?.display_name ?? 'Not recorded'}</dd>
                  {(tenant?.phone ?? tenant?.email ?? '') !== '' && (
                    <dd className="text-xs text-muted">{tenant?.phone ?? tenant?.email ?? ''}</dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Property</dt>
                  <dd className="mt-0.5 text-text">
                    <Link
                      href={`/properties/${lease.units?.property_id ?? ''}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {lease.units?.properties?.name ?? 'Property'}
                    </Link>
                    <span className="block text-xs text-muted">{lease.units?.label ?? 'Unit'}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Rent</dt>
                  <dd className="mt-0.5 text-text">
                    <Money kobo={String(lease.rent_kobo)} />
                    <span className="block text-xs text-muted">
                      {statusLabel(lease.rent_frequency)}
                      {lease.rent_due_day === null ? '' : ` · due on day ${lease.rent_due_day}`}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Term</dt>
                  <dd className="mt-0.5 text-text">
                    {formatDate(lease.starts_on)} to {formatDate(lease.ends_on)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Deposit</dt>
                  <dd className="mt-0.5 text-text">
                    {deposit === null ? (
                      'None recorded'
                    ) : (
                      <>
                        <Money kobo={String(deposit.amount_kobo)} />
                        <span className="block text-xs text-muted">
                          {statusLabel(deposit.status)} · held by {deposit.custodian}
                        </span>
                      </>
                    )}
                  </dd>
                </div>
                {lease.renewed_from_lease_id !== null && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-subtle">Renewed from</dt>
                    <dd className="mt-0.5 text-text">
                      <Link
                        href={`/leases/${lease.renewed_from_lease_id}`}
                        className="text-info-text underline-offset-2 hover:underline"
                      >
                        The previous lease
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
