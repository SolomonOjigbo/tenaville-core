import { redirect } from 'next/navigation';

import { addDays, formatDate, parseDate } from '@tenaville/core/leases';

import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
} from '../../../../components/ui';
import { LeaseForm } from '../../../../components/forms/lease-form';
import { todayIso } from '../../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** Start a tenancy (LEASE-12). Vacant units only; tenants must exist first. */
export default async function NewLeasePage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('lease.write')) {
    return (
      <Card>
        <EmptyState
          title="You cannot create leases"
          description="This is a tenancy permission. Ask an owner, administrator or property manager."
          action={
            <LinkButton href="/leases" variant="secondary">
              Back to leases
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();

  const [{ data: units }, { data: tenants }] = await Promise.all([
    supabase
      .from('units')
      .select('id, label, properties(name, address_line)')
      .eq('status', 'vacant')
      .order('label'),
    supabase.from('tenants').select('id, display_name').order('display_name'),
  ]);

  const today = todayIso();
  const suggestedEnd = formatDate(addDays(parseDate(today), 364));

  const unitOptions = (units ?? []).map((unit) => ({
    id: unit.id,
    label: `${unit.properties?.name ?? 'Property'} · ${unit.label}`,
  }));
  const tenantOptions = (tenants ?? []).map((tenant) => ({
    id: tenant.id,
    label: tenant.display_name,
  }));

  const missing: string[] = [];
  if (unitOptions.length === 0) missing.push('a vacant unit');
  if (tenantOptions.length === 0) missing.push('a tenant');

  return (
    <>
      <PageHeader
        title="New lease"
        description="The lease is created and its rent schedule raised together, so an active tenancy never owes nothing."
        action={
          <LinkButton href="/leases" variant="secondary">
            Back to leases
          </LinkButton>
        }
      />

      {missing.length > 0 ? (
        <Card>
          <EmptyState
            title="A lease needs a unit and a tenant"
            description={`Add ${missing.join(' and ')} first. Units are added on the property screen; tenants have their own.`}
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <LinkButton href="/properties">Properties</LinkButton>
                <LinkButton href="/tenants" variant="secondary">
                  Tenants
                </LinkButton>
              </div>
            }
          />
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Terms"
            description="The schedule is derived from these dates and rent."
          />
          <CardBody>
            <LeaseForm
              units={unitOptions}
              tenants={tenantOptions}
              today={today}
              suggestedEnd={suggestedEnd}
            />
          </CardBody>
        </Card>
      )}
    </>
  );
}
