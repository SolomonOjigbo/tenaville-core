import { redirect } from 'next/navigation';

import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
} from '../../../../components/ui';
import { LandlordForm } from '../../../../components/forms/landlord-form';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** Add a landlord (OWN-1). */
export default async function NewLandlordPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('landlord.write')) {
    return (
      <Card>
        <EmptyState
          title="You cannot add landlords"
          description="This is a property permission. Ask an owner or administrator."
          action={
            <LinkButton href="/landlords" variant="secondary">
              Back to landlords
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data: states } = await supabase
    .from('nigerian_states')
    .select('code, name')
    .order('name');

  return (
    <>
      <PageHeader
        title="Add a landlord"
        description="The owner of one or more properties. Remittance details are added separately."
        action={
          <LinkButton href="/landlords" variant="secondary">
            Back to landlords
          </LinkButton>
        }
      />

      <Card>
        <CardHeader title="Landlord details" description="At least a name is required." />
        <CardBody>
          <LandlordForm states={states ?? []} />
        </CardBody>
      </Card>
    </>
  );
}
