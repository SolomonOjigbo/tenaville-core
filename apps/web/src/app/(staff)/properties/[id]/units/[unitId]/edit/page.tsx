import { notFound, redirect } from 'next/navigation';

import { formatNaira, fromTransport } from '@tenaville/money';

import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
} from '../../../../../../../components/ui';
import { UnitForm } from '../../../../../../../components/forms/unit-form';
import { currentViewer, supabaseForRequest } from '../../../../../../../server/session';

/** Edit a unit, including facilities (PROP-2). */
export default async function EditUnitPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id, unitId } = await params;
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('property.write')) {
    return (
      <Card>
        <EmptyState
          title="You cannot edit units"
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
  const [{ data: unit }, { data: property }] = await Promise.all([
    supabase
      .from('units')
      .select(
        'id, label, reference, unit_type, status, bedrooms, bathrooms, floor_area_sqm, asking_rent_kobo, facilities, notes, archived_at',
      )
      .eq('id', unitId)
      .eq('property_id', id)
      .maybeSingle(),
    supabase.from('properties').select('name').eq('id', id).maybeSingle(),
  ]);

  if (unit === null || property === null) notFound();
  if (unit.archived_at !== null) {
    return (
      <Card>
        <EmptyState
          title="This unit is archived"
          description="Archived records are read-only."
          action={
            <LinkButton href={`/properties/${id}`} variant="secondary">
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
        title={`Edit ${unit.label}`}
        description={`${property.name} · update the unit type, size, rent and facilities.`}
        action={
          <LinkButton href={`/properties/${id}`} variant="secondary">
            Back to property
          </LinkButton>
        }
      />
      <Card>
        <CardHeader title="Unit details" description="What is being let and what it includes." />
        <CardBody>
          <UnitForm
            propertyId={id}
            unitId={unit.id}
            defaults={{
              label: unit.label,
              reference: unit.reference,
              unitType: unit.unit_type,
              status: unit.status,
              bedrooms: unit.bedrooms,
              bathrooms: unit.bathrooms,
              floorAreaSqm: unit.floor_area_sqm === null ? null : Number(unit.floor_area_sqm),
              askingRent:
                unit.asking_rent_kobo === null
                  ? null
                  : formatNaira(fromTransport(String(unit.asking_rent_kobo)), {
                      symbol: false,
                    }),
              facilities: unit.facilities,
              notes: unit.notes,
            }}
          />
        </CardBody>
      </Card>
    </>
  );
}
