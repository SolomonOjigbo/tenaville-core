import { redirect } from 'next/navigation';

import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
} from '../../../../components/ui';
import { TenantForm } from '../../../../components/forms/tenant-form';
import { currentViewer } from '../../../../server/session';

/** Add a tenant (LEASE-1). */
export default async function NewTenantPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('lease.write')) {
    return (
      <Card>
        <EmptyState
          title="You cannot add tenants"
          description="This is a tenancy permission. Ask an owner, administrator or property manager."
          action={
            <LinkButton href="/tenants" variant="secondary">
              Back to tenants
            </LinkButton>
          }
        />
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title="Add a tenant"
        description="At least a name is required. Contact details help with reminders and receipts."
        action={
          <LinkButton href="/tenants" variant="secondary">
            Back to tenants
          </LinkButton>
        }
      />

      <Card>
        <CardHeader title="Tenant details" description="Who is renting, and how to reach them." />
        <CardBody>
          <TenantForm />
        </CardBody>
      </Card>
    </>
  );
}
