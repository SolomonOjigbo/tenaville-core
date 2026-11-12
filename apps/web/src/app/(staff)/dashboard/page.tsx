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
  leaseStatusTone,
  statusLabel,
  unitStatusTone,
} from '../../../components/ui';
import { formatDate, percentLabel } from '../../../lib/format';
import {
  daysOverdue,
  monthStartIso,
  outstandingKobo,
  sumKobo,
  todayIso,
} from '../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../server/session';

/**
 * The portfolio dashboard.
 *
 * Reads through the viewer's own client, so what appears is what their
 * assignments allow (ORG-4) — a property manager scoped to one building sees
 * one building's numbers, not the agency's.
 *
 * Outstanding is derived from allocations, never read from a stored balance
 * (PRD §10.4). The rent roll and ageing buckets (AN-1, AN-4) still belong to
 * the reporting work; the figures here are the three questions an agency asks
 * on opening the app: what is let, what is owed, what came in.
 */
export default async function DashboardPage() {
  const viewer = await currentViewer();
  if (viewer === null) return null; // The layout has already handled this.

  const supabase = await supabaseForRequest();
  const today = todayIso();
  const monthStart = monthStartIso(today);

  const [units, leases, landlords, charges, collected] = await Promise.all([
    supabase.from('units').select('id, label, status, asking_rent_kobo'),
    supabase
      .from('lease_overview')
      .select('id, reference, display_status, ends_on, days_to_expiry, rent_kobo')
      .order('ends_on')
      .limit(5),
    supabase.from('landlords').select('id', { count: 'exact', head: true }),
    supabase
      .from('charges')
      .select('due_on, amount_kobo, payment_allocations(amount_kobo)')
      .eq('status', 'open'),
    supabase.from('payments').select('amount_kobo, paid_on').gte('paid_on', monthStart),
  ]);

  const unitRows = units.data ?? [];
  const occupied = unitRows.filter((u) => u.status === 'occupied').length;
  // AN-3: the denominator excludes units deliberately marked inactive, and the
  // figure says so rather than leaving the reader to guess.
  const lettable = unitRows.filter((u) => u.status !== 'inactive').length;

  const askingTotal = unitRows
    .filter((u) => u.status === 'vacant')
    .reduce((total, u) => total + BigInt(u.asking_rent_kobo ?? 0), 0n);

  const outstanding = (charges.data ?? []).reduce(
    (total, charge) => total + outstandingKobo(charge.amount_kobo, charge.payment_allocations),
    0n,
  );
  const overdueCount = (charges.data ?? []).filter(
    (charge) =>
      daysOverdue(charge.due_on, today) > 0 &&
      outstandingKobo(charge.amount_kobo, charge.payment_allocations) > 0n,
  ).length;
  const collectedKobo = sumKobo((collected.data ?? []).map((payment) => payment.amount_kobo));

  const expiring = (leases.data ?? []).filter((l) => l.display_status === 'expiring_soon');

  return (
    <>
      <PageHeader
        title={`Good day, ${viewer.organisationName}`}
        description="Your portfolio at a glance, with what is outstanding and what came in this month."
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Units under management" value={unitRows.length} />
        <Stat
          label="Occupancy"
          value={percentLabel(occupied, lettable)}
          hint="Excludes units marked inactive"
        />
        <Stat
          label="Outstanding"
          value={<Money kobo={outstanding.toString()} />}
          hint={
            overdueCount === 0
              ? 'Nothing overdue'
              : `${overdueCount} charge${overdueCount === 1 ? '' : 's'} overdue`
          }
        />
        <Stat
          label="Collected this month"
          value={<Money kobo={collectedKobo.toString()} />}
          hint="Net of reversals"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Leases ending soonest"
            description="Derived from each lease's end date and your alert thresholds."
            action={
              expiring.length > 0 ? (
                <Badge tone="warning">{expiring.length} expiring soon</Badge>
              ) : undefined
            }
          />
          {leases.data === null || leases.data.length === 0 ? (
            <EmptyState
              title="No leases yet"
              description="Once a lease exists, the ones ending soonest appear here so a renewal conversation can start before the tenancy runs out."
            />
          ) : (
            <CardBody className="divide-y divide-border p-0">
              {leases.data.map((lease) => (
                <div key={lease.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text">
                      {lease.reference ?? 'No reference'}
                    </p>
                    <p className="text-xs text-subtle">
                      Ends {formatDate(lease.ends_on)}
                      {lease.days_to_expiry !== null && ` · ${lease.days_to_expiry} days`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Money kobo={String(lease.rent_kobo ?? 0)} />
                    <Badge tone={leaseStatusTone(lease.display_status ?? '')}>
                      {statusLabel(lease.display_status ?? 'unknown')}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardBody>
          )}
        </Card>

        <Card>
          <CardHeader title="Units by status" description="Occupancy follows the lease." />
          {unitRows.length === 0 ? (
            <EmptyState
              title="No units yet"
              description="Import a spreadsheet or add a property to begin. The importer reports every problem per row, so one upload tells you everything to fix."
            />
          ) : (
            <CardBody className="flex flex-wrap gap-2">
              {Object.entries(
                unitRows.reduce<Record<string, number>>((acc, unit) => {
                  acc[unit.status] = (acc[unit.status] ?? 0) + 1;
                  return acc;
                }, {}),
              ).map(([status, count]) => (
                <Badge key={status} tone={unitStatusTone(status)}>
                  {statusLabel(status)}: {count}
                </Badge>
              ))}
              <span className="w-full pt-2 text-xs text-subtle">
                {landlords.count ?? 0} landlord{landlords.count === 1 ? '' : 's'} · Vacant asking
                rent <Money kobo={askingTotal.toString()} />
              </span>
            </CardBody>
          )}
        </Card>
      </div>
    </>
  );
}
