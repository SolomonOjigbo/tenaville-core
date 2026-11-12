import { notFound, redirect } from 'next/navigation';

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
  statusLabel,
  unitStatusTone,
} from '../../../../components/ui';
import { UnitForm } from '../../../../components/forms/unit-form';
import { formatDate } from '../../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** One property, its landlord and its units (PROP-1, PROP-2). */
export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('property.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see this property"
          description="Property records follow the portfolio permission."
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
  const { data: property, error } = await supabase
    .from('properties')
    .select(
      'id, name, reference, property_type, address_line, lga, state_code, notes, created_at, landlords(display_name, phone, email), units(id, label, unit_type, status, asking_rent_kobo)',
    )
    .eq('id', id)
    .order('label', { referencedTable: 'units' })
    .maybeSingle();

  if (error !== null || property === null) notFound();

  const units = property.units;
  const landlord = property.landlords;

  return (
    <>
      <PageHeader
        title={property.name}
        description={`${property.address_line}${property.lga === null ? '' : `, ${property.lga}`} · ${property.state_code}`}
        action={
          <LinkButton href="/properties" variant="secondary">
            Back to properties
          </LinkButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Units"
              description="What can be let. A unit's occupancy follows its lease, not this screen."
            />
            <CardBody className="p-0">
              <Table caption="Units">
                <thead>
                  <tr>
                    <Th>Unit</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th numeric>Asking rent</Th>
                  </tr>
                </thead>
                <tbody>
                  {units.length === 0 ? (
                    <TableEmpty colSpan={4} message="No units yet." />
                  ) : (
                    units.map((unit) => (
                      <tr key={unit.id}>
                        <Td>{unit.label}</Td>
                        <Td>{statusLabel(unit.unit_type)}</Td>
                        <Td>
                          <Badge tone={unitStatusTone(unit.status)}>
                            {statusLabel(unit.status)}
                          </Badge>
                        </Td>
                        <Td numeric>
                          {unit.asking_rent_kobo === null ? (
                            '—'
                          ) : (
                            <Money kobo={String(unit.asking_rent_kobo)} />
                          )}
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </CardBody>
          </Card>

          {viewer.access.can('property.write') && (
            <Card>
              <CardHeader title="Add a unit" description="You can add another at any time." />
              <CardBody>
                <UnitForm propertyId={property.id} />
              </CardBody>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader title="Property" description="Ownership and reference." />
          <CardBody>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-subtle">Landlord</dt>
                <dd className="mt-0.5 text-text">{landlord?.display_name ?? 'Not recorded'}</dd>
                {landlord?.phone !== null && landlord?.phone !== undefined && (
                  <dd className="text-xs text-muted">{landlord.phone}</dd>
                )}
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-subtle">Type</dt>
                <dd className="mt-0.5 text-text">{statusLabel(property.property_type)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-subtle">Reference</dt>
                <dd className="mt-0.5 text-text">{property.reference ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-subtle">Added</dt>
                <dd className="mt-0.5 text-text">{formatDate(property.created_at.slice(0, 10))}</dd>
              </div>
              {property.notes !== null && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Notes</dt>
                  <dd className="mt-0.5 text-text">{property.notes}</dd>
                </div>
              )}
            </dl>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
