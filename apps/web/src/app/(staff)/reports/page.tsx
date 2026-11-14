import { redirect } from 'next/navigation';

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
  statusLabel,
} from '../../../components/ui';
import {
  buildArrears,
  buildCollections,
  buildLeaseExpiry,
  buildMaintenanceQueue,
  buildOccupancy,
  buildRentRoll,
  monthsBack,
  summariseArrears,
  totalRent,
} from '../../../lib/reports';
import { formatDate } from '../../../lib/format';
import { todayIso } from '../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../server/session';
import {
  fetchArrears,
  fetchCollections,
  fetchLeaseExpiry,
  fetchMaintenanceQueue,
  fetchOccupancy,
  fetchRentRoll,
} from '../../../server/reports-data';

/**
 * Reports (AN-1, AN-4, RENT-5).
 *
 * Three questions an agency asks at month end: what is let and for how much,
 * who is behind and by how long, and what came in. Each is backed by the same
 * derived figures as the working screens, and each exports the CSV this page
 * displays — one calculation, two views.
 */
export default async function ReportsPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('statement.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see reports"
          description="Reports follow the statement permission. Ask an owner, administrator or accountant."
          action={
            <LinkButton href="/dashboard" variant="secondary">
              Back to dashboard
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const today = todayIso();
  const since = monthsBack(today, 6);

  const [
    rentRollData,
    arrearsData,
    collectionsData,
    occupancyData,
    expiryData,
    maintenanceData,
  ] = await Promise.all([
    fetchRentRoll(supabase),
    fetchArrears(supabase),
    fetchCollections(supabase, since),
    fetchOccupancy(supabase),
    fetchLeaseExpiry(supabase),
    fetchMaintenanceQueue(supabase),
  ]);

  const rentRoll = buildRentRoll(rentRollData.data ?? []);
  const arrears = buildArrears(arrearsData.data ?? [], today);
  const buckets = summariseArrears(arrears);
  const collections = buildCollections(collectionsData.data ?? []);
  const occupancy = buildOccupancy(occupancyData.data ?? []);
  const expiring = buildLeaseExpiry(expiryData.data ?? []);
  const maintenance = buildMaintenanceQueue(maintenanceData.data ?? []);

  const totalOutstanding = arrears.reduce((total, row) => total + row.outstandingKobo, 0n);
  const totalNet = collections.reduce((total, month) => total + month.netKobo, 0n);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Rent roll, arrears and collections. Each export is the same figures shown here, as CSV."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active leases" value={rentRoll.length} />
        <Stat
          label="Rent roll"
          value={<Money kobo={totalRent(rentRoll).toString()} />}
          hint="Per period, as agreed"
        />
        <Stat
          label="Outstanding"
          value={<Money kobo={totalOutstanding.toString()} />}
          hint={`${arrears.length} open charge${arrears.length === 1 ? '' : 's'}`}
        />
        <Stat
          label="Collected, last 6 months"
          value={<Money kobo={totalNet.toString()} />}
          hint="Net of reversals"
        />
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Rent roll"
          description="Active tenancies and what each is charged per period."
          action={
            <LinkButton href="/api/v1/reports/rent-roll" variant="secondary" size="sm">
              Export CSV
            </LinkButton>
          }
        />
        <CardBody className="p-0">
          <Table caption="Rent roll">
            <thead>
              <tr>
                <Th>Tenant</Th>
                <Th>Lease</Th>
                <Th>Property and unit</Th>
                <Th>Term</Th>
                <Th numeric>Rent</Th>
              </tr>
            </thead>
            <tbody>
              {rentRoll.length === 0 ? (
                <TableEmpty colSpan={5} message="No active leases." />
              ) : (
                rentRoll.map((row) => (
                  <tr key={row.leaseId}>
                    <Td>{row.tenant}</Td>
                    <Td>{row.reference}</Td>
                    <Td>
                      {row.property}
                      <span className="block text-xs text-subtle">{row.unit}</span>
                    </Td>
                    <Td>
                      {formatDate(row.startsOn)}
                      <span className="block text-xs text-subtle">to {formatDate(row.endsOn)}</span>
                    </Td>
                    <Td numeric>
                      <Money kobo={row.rentKobo.toString()} />
                      <span className="block text-xs text-subtle">
                        {statusLabel(row.frequency)}
                      </span>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="Arrears ageing"
          description="Every open charge with money left on it, bucketed by how late it is."
          action={
            <LinkButton href="/api/v1/reports/arrears" variant="secondary" size="sm">
              Export CSV
            </LinkButton>
          }
        />
        <CardBody className="p-0">
          <Table caption="Arrears ageing">
            <thead>
              <tr>
                <Th>Age</Th>
                <Th numeric>Charges</Th>
                <Th numeric>Outstanding</Th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((bucket) => (
                <tr key={bucket.key}>
                  <Td>{bucket.label}</Td>
                  <Td numeric>{bucket.count}</Td>
                  <Td numeric>
                    <Money kobo={bucket.amountKobo.toString()} tone="owed" />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {arrears.length === 0 && (
            <p className="px-5 py-3 text-sm text-muted">
              Nothing outstanding: every open charge is covered.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Collections"
          description="Money received by the month it changed hands, with reversals kept separate."
          action={
            <LinkButton href="/api/v1/reports/collections" variant="secondary" size="sm">
              Export CSV
            </LinkButton>
          }
        />
        <CardBody className="p-0">
          <Table caption="Collections by month">
            <thead>
              <tr>
                <Th>Month</Th>
                <Th numeric>Payments</Th>
                <Th numeric>Gross</Th>
                <Th numeric>Reversals</Th>
                <Th numeric>Net</Th>
              </tr>
            </thead>
            <tbody>
              {collections.length === 0 ? (
                <TableEmpty colSpan={5} message="No payments in the last six months." />
              ) : (
                collections.map((month) => (
                  <tr key={month.month}>
                    <Td>{month.month}</Td>
                    <Td numeric>{month.count}</Td>
                    <Td numeric>
                      <Money kobo={month.grossKobo.toString()} />
                    </Td>
                    <Td numeric>
                      <Money kobo={month.reversalKobo.toString()} tone="owed" />
                    </Td>
                    <Td numeric>
                      <Money kobo={month.netKobo.toString()} />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Occupancy"
          description="Units by property and occupancy rate. Archived units and properties are excluded."
          action={
            <LinkButton href="/api/v1/reports/occupancy" variant="secondary" size="sm">
              Export CSV
            </LinkButton>
          }
        />
        <CardBody className="p-0">
          <Table caption="Occupancy by property">
            <thead>
              <tr>
                <Th>Property</Th>
                <Th numeric>Units</Th>
                <Th numeric>Occupied</Th>
                <Th numeric>Vacant</Th>
                <Th numeric>Reserved</Th>
                <Th numeric>Under repair</Th>
                <Th numeric>Occupancy</Th>
              </tr>
            </thead>
            <tbody>
              {occupancy.length === 0 ? (
                <TableEmpty colSpan={7} message="No active units." />
              ) : (
                occupancy.map((row) => (
                  <tr key={row.propertyId}>
                    <Td>{row.property}</Td>
                    <Td numeric>{row.total}</Td>
                    <Td numeric>{row.occupied}</Td>
                    <Td numeric>{row.vacant}</Td>
                    <Td numeric>{row.reserved}</Td>
                    <Td numeric>{row.underMaintenance}</Td>
                    <Td numeric>{row.occupancyRate}%</Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Lease expiry"
          description="Active tenancies by time to expiry, soonest first."
          action={
            <LinkButton href="/api/v1/reports/lease-expiry" variant="secondary" size="sm">
              Export CSV
            </LinkButton>
          }
        />
        <CardBody className="p-0">
          <Table caption="Lease expiry">
            <thead>
              <tr>
                <Th>Tenant</Th>
                <Th>Tenancy</Th>
                <Th>Property</Th>
                <Th>Ends</Th>
                <Th>Window</Th>
                <Th numeric>Rent</Th>
              </tr>
            </thead>
            <tbody>
              {expiring.length === 0 ? (
                <TableEmpty colSpan={6} message="No active tenancies." />
              ) : (
                expiring.map((row) => (
                  <tr key={row.leaseId}>
                    <Td>{row.tenant}</Td>
                    <Td>{row.reference}</Td>
                    <Td>
                      {row.property}
                      <span className="block text-xs text-subtle">{row.unit}</span>
                    </Td>
                    <Td>
                      {formatDate(row.endsOn)}
                      <span className="block text-xs text-subtle">
                        {row.daysToExpiry < 0
                          ? `${Math.abs(row.daysToExpiry)} days ago`
                          : `${row.daysToExpiry} days`}
                      </span>
                    </Td>
                    <Td>
                      <Badge tone={row.daysToExpiry <= 30 ? 'warning' : 'neutral'}>
                        {row.window}
                      </Badge>
                    </Td>
                    <Td numeric>
                      <Money kobo={row.rentKobo.toString()} />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Maintenance queue"
          description="Unclosed repairs, most overdue first."
          action={
            <LinkButton href="/api/v1/reports/maintenance-queue" variant="secondary" size="sm">
              Export CSV
            </LinkButton>
          }
        />
        <CardBody className="p-0">
          <Table caption="Maintenance queue">
            <thead>
              <tr>
                <Th>Property</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th>Priority</Th>
                <Th>Due</Th>
                <Th numeric>Days overdue</Th>
              </tr>
            </thead>
            <tbody>
              {maintenance.length === 0 ? (
                <TableEmpty colSpan={6} message="No open repairs." />
              ) : (
                maintenance.map((row) => (
                  <tr key={row.requestId}>
                    <Td>
                      {row.property}
                      <span className="block text-xs text-subtle">{row.unit}</span>
                    </Td>
                    <Td>{statusLabel(row.category)}</Td>
                    <Td>{statusLabel(row.status)}</Td>
                    <Td>{statusLabel(row.priority)}</Td>
                    <Td>{row.dueOn === null ? 'Not set' : formatDate(row.dueOn)}</Td>
                    <Td numeric>
                      {row.overdue ? (
                        <span className="text-danger-text">{row.daysOverdue}</span>
                      ) : (
                        '—'
                      )}
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
