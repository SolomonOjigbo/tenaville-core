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
  leaseStatusTone,
  statusLabel,
} from '../../../components/ui';
import { formatDate } from '../../../lib/format';
import { outstandingKobo } from '../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../server/session';

/**
 * The tenant's current tenancy (TENANT-2, TENANT-3).
 *
 * Read-only: the tenant sees the terms they agreed, the schedule they are
 * charged and what is left on each period. All of it is derived from the lease
 * and its allocations, so the balance here is the same arithmetic the agency's
 * rent screen uses.
 */
export default async function TenancyPage() {
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
    .from('leases')
    .select(
      'id, reference, status, starts_on, ends_on, rent_kobo, rent_frequency, rent_due_day, units(label, properties(name, address_line, lga, state_code)), charges(id, sequence, kind, period_start, period_end, due_on, amount_kobo, status, payment_allocations(amount_kobo)), lease_deposits!lease_deposits_lease_id_fkey(amount_kobo, status, custodian, received_on)',
    )
    .order('starts_on', { ascending: false });

  const leases = data ?? [];
  const lease = leases.find((row) => row.status === 'active') ?? leases[0];

  if (lease === undefined) {
    return (
      <Card>
        <EmptyState
          title="No tenancy on record"
          description="Once the agency records your tenancy, the terms and rent schedule appear here."
        />
      </Card>
    );
  }

  const schedule = lease.charges
    .filter((charge) => charge.status !== 'cancelled')
    .map((charge) => {
      const outstanding = outstandingKobo(charge.amount_kobo, charge.payment_allocations);
      return {
        ...charge,
        paid: BigInt(charge.amount_kobo) - outstanding,
        outstanding,
      };
    })
    .sort((a, b) => a.sequence - b.sequence);

  const totalOutstanding = schedule
    .filter((charge) => charge.status === 'open')
    .reduce((total, charge) => total + charge.outstanding, 0n);
  const deposit = lease.lease_deposits;

  return (
    <>
      <PageHeader
        title="Your tenancy"
        description="The terms you agreed, and what is still owed for each period."
        action={
          <LinkButton href="/tenancy/payments" variant="secondary">
            Payments and receipts
          </LinkButton>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Outstanding"
          value={<Money kobo={totalOutstanding.toString()} />}
          hint="Across open periods"
        />
        <Stat
          label="Rent"
          value={<Money kobo={String(lease.rent_kobo)} />}
          hint={statusLabel(lease.rent_frequency)}
        />
        <Stat
          label="Term"
          value={`${formatDate(lease.starts_on)} – ${formatDate(lease.ends_on)}`}
          hint={statusLabel(lease.status)}
        />
      </div>

      <Card className="mb-6">
        <CardHeader
          title={lease.units?.properties?.name ?? 'Property'}
          description={`${lease.units?.label ?? 'Unit'}${lease.units?.properties?.address_line === undefined ? '' : ` · ${lease.units.properties.address_line}`}`}
          action={<Badge tone={leaseStatusTone(lease.status)}>{statusLabel(lease.status)}</Badge>}
        />
        <CardBody>
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Tenancy reference</dt>
              <dd className="mt-0.5 text-text">{lease.reference ?? 'No reference'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Rent due</dt>
              <dd className="mt-0.5 text-text">
                {lease.rent_due_day === null
                  ? 'At the start of each period'
                  : `Day ${lease.rent_due_day} of the period month`}
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
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Rent schedule"
          description="Each period, what it costs and what has been paid against it."
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
                <TableEmpty colSpan={5} message="No rent schedule recorded." />
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
                      <Money kobo={charge.paid.toString()} tone="paid" />
                    </Td>
                    <Td numeric>
                      <Money kobo={charge.outstanding.toString()} tone="owed" />
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
