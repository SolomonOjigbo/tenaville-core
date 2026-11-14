import Link from 'next/link';

import {
  Badge,
  Card,
  CardBody,
  EmptyState,
  LinkButton,
  Money,
  PageHeader,
  statusLabel,
  unitStatusTone,
} from '../../../components/ui/index';
import { currentViewer, supabaseForRequest } from '../../../server/session';

/**
 * Properties and their units (PROP-1, PROP-2).
 *
 * The list links into each property's screen, where units are added. Private
 * file storage for photos is TV-014.
 */
export default async function PropertiesPage() {
  const viewer = await currentViewer();
  const supabase = await supabaseForRequest();

  const { data: properties } = await supabase
    .from('properties')
    .select(
      'id, name, reference, property_type, address_line, state_code, lga, units(id, label, status, asking_rent_kobo, archived_at)',
    )
    .is('archived_at', null)
    .order('name');

  const rows = properties ?? [];

  return (
    <>
      <PageHeader
        title="Properties"
        description="What you manage, and the units inside each one. Internal records only — never published anywhere."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/landlords" variant="secondary">
              Landlords
            </LinkButton>
            {viewer?.access.can('org.update') === true && (
              <LinkButton href="/imports" variant="secondary">
                Import
              </LinkButton>
            )}
            {viewer?.access.can('property.write') === true && (
              <LinkButton href="/properties/new">Add property</LinkButton>
            )}
          </div>
        }
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title="No properties yet"
            description="Add a landlord, then their property and units. An import is a dry run first, so you see exactly what will be created."
            action={
              viewer?.access.can('property.write') === true ? (
                <LinkButton href="/properties/new">Add property</LinkButton>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((property) => (
            <Card key={property.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg text-text">
                      <Link
                        href={`/properties/${property.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {property.name}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted">
                      {property.address_line}
                      {property.lga !== null && `, ${property.lga}`} · {property.state_code}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="info">{statusLabel(property.property_type)}</Badge>
                    {property.reference !== null && (
                      <span className="text-xs text-subtle">{property.reference}</span>
                    )}
                  </div>
                </div>

                {property.units.length === 0 ? (
                  <p className="text-sm text-subtle">No units recorded.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {property.units.map((unit) => (
                      <span
                        key={unit.id}
                        className="inline-flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm"
                      >
                        <span className="text-text">{unit.label}</span>
                        <Badge tone={unitStatusTone(unit.status)}>{statusLabel(unit.status)}</Badge>
                        {unit.asking_rent_kobo !== null && (
                          <Money kobo={String(unit.asking_rent_kobo)} className="text-xs" />
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
