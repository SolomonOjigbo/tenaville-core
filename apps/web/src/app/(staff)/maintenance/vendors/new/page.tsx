import { redirect } from 'next/navigation';

import { Card, CardBody, CardHeader, LinkButton, PageHeader } from '../../../../../components/ui';
import { VendorForm } from '../../../../../components/forms/vendor-form';
import { currentViewer } from '../../../../../server/session';

/** Add a vendor (MAINT-6). */
export default async function NewVendorPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  return (
    <>
      <PageHeader
        title="Add a vendor"
        description="A trade the agency can call for this portfolio."
        action={
          <LinkButton href="/maintenance/vendors" variant="secondary">
            Back to vendors
          </LinkButton>
        }
      />

      <Card>
        <CardHeader title="Vendor details" />
        <CardBody>
          <VendorForm />
        </CardBody>
      </Card>
    </>
  );
}
