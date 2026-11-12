import { redirect } from 'next/navigation';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Money,
  PageHeader,
  Stat,
  statusLabel,
  unitStatusTone,
} from '../../../components/ui';
import { formatDate } from '../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../server/session';

/**
 * The landlord's portfolio (OWN-3).
 *
 * Read-only by design: the agency manages the records, and the landlord sees
 * what is happening in their buildings. RLS restricts every row to properties
 * they own, including the tenant names on active leases.
 */
export default async function LandlordPortfolioPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('self.portfolio.read')) {
    return (
      <Card>
        <EmptyState
          title="You do not have a landlord portfolio"
          description="This area is for landlords. Staff manage the portfolio from the agency console."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data } = await supabase
    .from('properties')
    .select(
      'id, name, address_line, lga, state_code, units(id, label, unit_type, status, asking_rent_kobo, leases(id, reference, status, starts_on, ends_on, rent_kobo, rent_frequency, lease_parties(role, tenants(display_name))))',
    )
    .order('name');

  const properties = data ?? [];
  const units = properties.flatMap((property) => property.units);
  const occupied = units.filter((unit) => unit.status === 'occupied').length;
  const activeRent = units
    .flatMap((unit) => unit.leases)
    .filter((lease) => lease.status === 'active')
    .reduce((total, lease) => total + BigInt(lease.rent_kobo), 0n);

  return (
    <>
      <PageHeader
        title="Your portfolio"
        description="The properties the agency manages for you, and what is happening in each unit."
        action={
          <a
            href="/portfolio/statements"
            className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-surface px-4 font-medium text-text hover:bg-surface2"
          >
            Statements
          </a>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Properties" value={properties.length} />
        <Stat
          label="Occupancy"
          value={`${occupied}/${units.length}`}
          hint="Units with an active tenancy"
        />
        <Stat
          label="Active rent"
          value={<Money kobo={activeRent.toString()} />}
          hint="Per period"
        />
      </div>

      {properties.length === 0 ? (
        <Card>
          <EmptyState
            title="No properties yet"
            description="Once the agency records a property for you, it appears here with its units and tenancies."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {properties.map((property) => (
            <Card key={property.id}>
              <CardHeader
                title={property.name}
                description={`${property.address_line}${property.lga === null ? '' : `, ${property.lga}`} · ${property.state_code}`}
                action={<Badge tone="neutral">{property.units.length} units</Badge>}
              />
              <CardBody className="space-y-3">
                {property.units.length === 0 ? (
                  <p className="text-sm text-subtle">No units recorded.</p>
                ) : (
                  property.units.map((unit) => {
                    const activeLease = unit.leases.find((lease) => lease.status === 'active');
                    const tenant =
                      activeLease?.lease_parties.find((party) => party.role === 'tenant')?.tenants
                        ?.display_name ?? null;

                    return (
                      <div
                        key={unit.id}
                        className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border px-4 py-3"
                      >
                        <div>
                          <p className="text-sm text-text">{unit.label}</p>
                          <p className="text-xs text-subtle">{statusLabel(unit.unit_type)}</p>
                        </div>
                        <div className="text-right">
                          <Badge tone={unitStatusTone(unit.status)}>
                            {statusLabel(unit.status)}
                          </Badge>
                          {activeLease === undefined ? (
                            <p className="mt-1 text-xs text-subtle">
                              Vacant
                              {unit.asking_rent_kobo === null ? '' : ' · asking '}
                              {unit.asking_rent_kobo === null ? null : (
                                <Money kobo={String(unit.asking_rent_kobo)} className="text-xs" />
                              )}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-subtle">
                              {tenant ?? 'Tenant'} · {formatDate(activeLease.starts_on)} to{' '}
                              {formatDate(activeLease.ends_on)}
                              <span className="block">
                                Rent <Money kobo={String(activeLease.rent_kobo)} />
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
