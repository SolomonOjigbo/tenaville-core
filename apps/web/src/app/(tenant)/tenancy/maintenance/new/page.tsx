import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
} from '../../../../../components/ui';
import { MaintenanceRequestForm } from '../../../../../components/forms/maintenance-request-form';
import { currentViewer, supabaseForRequest } from '../../../../../server/session';

/** Report a repair from the tenant portal (TENANT-4). */
export default async function NewTenantMaintenancePage() {
  const viewer = await currentViewer();
  if (!viewer?.access.can('self.maintenance.request')) {
    return (
      <Card>
        <EmptyState
          title="No maintenance access"
          description="This area is for tenants. Ask the agency to link your account to your tenancy."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data } = await supabase
    .from('leases')
    .select('id, reference, units(id, label, properties(id, name))')
    .eq('status', 'active')
    .order('starts_on', { ascending: false });

  const leases = (data ?? []).map((lease) => ({
    id: lease.id,
    label: `${lease.reference ?? 'Tenancy'} · ${lease.units?.properties?.name ?? 'Property'} · ${lease.units?.label ?? 'Unit'}`,
    propertyId: lease.units?.properties?.id ?? '',
    propertyLabel: lease.units?.properties?.name ?? 'Property',
    unitId: lease.units?.id ?? '',
    unitLabel: lease.units?.label ?? 'Unit',
  }));

  return (
    <>
      <PageHeader
        title="Report a repair"
        description="Tell the agency what is wrong. They will see it in their maintenance queue."
        action={
          <LinkButton href="/tenancy/maintenance" variant="secondary">
            Back to maintenance
          </LinkButton>
        }
      />

      {leases.length === 0 ? (
        <Card>
          <EmptyState
            title="No active tenancy"
            description="A repair request needs an active tenancy. The agency will restore access when your tenancy is active."
          />
        </Card>
      ) : (
        <Card>
          <CardHeader title="Repair details" description="Access notes help the vendor arrive prepared." />
          <CardBody>
            <MaintenanceRequestForm mode="tenant" leases={leases} />
          </CardBody>
        </Card>
      )}
    </>
  );
}
