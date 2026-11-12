import { redirect } from 'next/navigation';

import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
} from '../../../../components/ui';
import { MaintenanceRequestForm } from '../../../../components/forms/maintenance-request-form';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** Log a repair from the office (MAINT-1). */
export default async function NewMaintenancePage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('maintenance.write')) {
    return (
      <Card>
        <EmptyState
          title="You cannot log repairs"
          description="This is a maintenance permission. Ask an owner, administrator or coordinator."
          action={
            <LinkButton href="/maintenance" variant="secondary">
              Back to maintenance
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, units(id, label)')
    .order('name');

  const options = (properties ?? []).map((property) => ({
    id: property.id,
    label: property.name,
    units: property.units.map((unit) => ({ id: unit.id, label: unit.label })),
  }));

  return (
    <>
      <PageHeader
        title="Log a repair"
        description="Record what is wrong, how urgent it is and how to get access."
        action={
          <LinkButton href="/maintenance" variant="secondary">
            Back to maintenance
          </LinkButton>
        }
      />

      {options.length === 0 ? (
        <Card>
          <EmptyState
            title="Add a property first"
            description="A repair belongs to a property or unit."
            action={<LinkButton href="/properties/new">Add a property</LinkButton>}
          />
        </Card>
      ) : (
        <Card>
          <CardHeader title="Repair details" />
          <CardBody>
            <MaintenanceRequestForm mode="staff" properties={options} />
          </CardBody>
        </Card>
      )}
    </>
  );
}
