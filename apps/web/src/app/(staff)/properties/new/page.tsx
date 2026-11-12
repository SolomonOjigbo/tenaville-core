import { redirect } from 'next/navigation';

import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
} from '../../../../components/ui';
import { PropertyForm } from '../../../../components/forms/property-form';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** Add a property (PROP-1). */
export default async function NewPropertyPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('property.write')) {
    return (
      <Card>
        <EmptyState
          title="You cannot add properties"
          description="This is a property permission. Ask an owner or administrator."
          action={
            <LinkButton href="/properties" variant="secondary">
              Back to properties
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();

  const [{ data: landlords }, { data: states }] = await Promise.all([
    supabase.from('landlords').select('id, display_name').order('display_name'),
    supabase.from('nigerian_states').select('code, name').order('name'),
  ]);

  const landlordRows = landlords ?? [];

  return (
    <>
      <PageHeader
        title="Add a property"
        description="A property belongs to one landlord in this release. Units come next, on the property's screen."
        action={
          <LinkButton href="/properties" variant="secondary">
            Back to properties
          </LinkButton>
        }
      />

      {landlordRows.length === 0 ? (
        <Card>
          <EmptyState
            title="Add the landlord first"
            description="Every property belongs to a landlord, and statements are addressed to them. Add one, then come back."
            action={<LinkButton href="/landlords/new">Add a landlord</LinkButton>}
          />
        </Card>
      ) : (
        <Card>
          <CardHeader title="Property details" description="Address and ownership." />
          <CardBody>
            <PropertyForm
              landlords={landlordRows.map((landlord) => ({
                id: landlord.id,
                label: landlord.display_name,
              }))}
              states={states ?? []}
            />
          </CardBody>
        </Card>
      )}
    </>
  );
}
