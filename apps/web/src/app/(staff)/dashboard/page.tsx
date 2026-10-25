import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Money,
  PageHeader,
  Stat,
  leaseStatusTone,
  statusLabel,
  unitStatusTone,
} from '../../../components/ui/index';
import { percentLabel } from '../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../server/session';

/**
 * The portfolio dashboard.
 *
 * Reads through the viewer's own client, so what appears is what their
 * assignments allow (ORG-4) — a property manager scoped to one building sees
 * one building's numbers, not the agency's.
 *
 * Every query here is a count or a small page. The rent roll, arrears ageing
 * and collections figures (AN-1, AN-4) arrive with the money work; showing a
 * zero for them now would read as "nothing owed" rather than "not built".
 */
export default async function DashboardPage() {
  const viewer = await currentViewer();
  if (viewer === null) return null; // The layout has already handled this.

  const supabase = await supabaseForRequest();

  const [units, leases, landlords] = await Promise.all([
    supabase.from('units').select('id, label, status, asking_rent_kobo'),
    supabase
      .from('lease_overview')
      .select('id, reference, display_status, ends_on, days_to_expiry, rent_kobo')
      .order('ends_on')
      .limit(5),
    supabase.from('landlords').select('id', { count: 'exact', head: true }),
  ]);

  const unitRows = units.data ?? [];
  const occupied = unitRows.filter((u) => u.status === 'occupied').length;
  // AN-3: the denominator excludes units deliberately marked inactive, and the
  // figure says so rather than leaving the reader to guess.
  const lettable = unitRows.filter((u) => u.status !== 'inactive').length;

  const askingTotal = unitRows
    .filter((u) => u.status === 'vacant')
    .reduce((total, u) => total + BigInt(u.asking_rent_kobo ?? 0), 0n);

  const expiring = (leases.data ?? []).filter((l) => l.display_status === 'expiring_soon');

  return (
    <>
      <PageHeader
        title={`Good day, ${viewer.organisationName}`}
        description="Your portfolio at a glance. Collections and arrears arrive with the money work."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Units under management" value={unitRows.length} />
        <Stat
          label="Occupancy"
          value={percentLabel(occupied, lettable)}
          hint="Excludes units marked inactive"
        />
        <Stat label="Landlords" value={landlords.count ?? 0} />
        <Stat
          label="Asking rent, vacant units"
          value={<Money kobo={askingTotal.toString()} />}
          hint="Annualised, as advertised"
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
                      Ends {lease.ends_on}
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
            </CardBody>
          )}
        </Card>
      </div>
    </>
  );
}
