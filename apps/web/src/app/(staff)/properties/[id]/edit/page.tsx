import { notFound, redirect } from 'next/navigation';

import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
} from '../../../../../components/ui';
import { PropertyForm } from '../../../../../components/forms/property-form';
import { currentViewer, supabaseForRequest } from '../../../../../server/session';

/** Edit a property (PROP-1). */
export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('property.write')) {
    return (
      <Card>
        <EmptyState
          title="You cannot edit properties"
          description="This is a property permission. Ask an owner or administrator."
          action={
            <LinkButton href={`/properties/${id}`} variant="secondary">
              Back to property
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const [{ data: property }, { data: landlords }, { data: states }] = await Promise.all([
    supabase
      .from('properties')
      .select(
        'id, landlord_id, name, property_type, reference, address_line, state_code, lga, area, latitude, longitude, notes, archived_at',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('landlords').select('id, display_name').order('display_name'),
    supabase.from('nigerian_states').select('code, name').order('name'),
  ]);

  if (property === null) notFound();
  if (property.archived_at !== null) {
    return (
      <Card>
        <EmptyState
          title="This property is archived"
          description="Archived records are read-only. Add a new property or restore it in the database."
          action={
            <LinkButton href={`/properties/${property.id}`} variant="secondary">
              Back to property
            </LinkButton>
          }
        />
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title={`Edit ${property.name}`}
        description="Correct the address, ownership, type or notes. Units are edited on the property screen."
        action={
          <LinkButton href={`/properties/${property.id}`} variant="secondary">
            Back to property
          </LinkButton>
        }
      />
      <Card>
        <CardHeader title="Property details" description="Address and ownership." />
        <CardBody>
          <PropertyForm
            propertyId={property.id}
            landlords={(landlords ?? []).map((landlord) => ({
              id: landlord.id,
              label: landlord.display_name,
            }))}
            states={states ?? []}
            defaults={{
              landlordId: property.landlord_id,
              name: property.name,
              propertyType: property.property_type,
              reference: property.reference,
              addressLine: property.address_line,
              stateCode: property.state_code,
              lga: property.lga,
              area: property.area,
              latitude: property.latitude === null ? null : Number(property.latitude),
              longitude: property.longitude === null ? null : Number(property.longitude),
              notes: property.notes,
            }}
          />
        </CardBody>
      </Card>
    </>
  );
}
