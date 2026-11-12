import { redirect } from 'next/navigation';

import {
  Card,
  CardBody,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  TableEmpty,
  Td,
  Th,
} from '../../../components/ui';
import { currentViewer, supabaseForRequest } from '../../../server/session';

/** Landlords and how much of the portfolio each owns (OWN-1). */
export default async function LandlordsPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('landlord.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see landlords"
          description="Landlord records follow the property permission. Ask an owner or administrator."
          action={
            <LinkButton href="/dashboard" variant="secondary">
              Back to dashboard
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data } = await supabase
    .from('landlords')
    .select('id, display_name, is_organisation, phone, email, state_code, properties(id)')
    .order('display_name');

  const rows = data ?? [];

  return (
    <>
      <PageHeader
        title="Landlords"
        description="Who owns the properties you manage. Statements and commission are addressed to them."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/properties" variant="secondary">
              Properties
            </LinkButton>
            {viewer.access.can('landlord.write') && (
              <LinkButton href="/landlords/new">Add landlord</LinkButton>
            )}
          </div>
        }
      />

      <Card>
        <CardBody className="p-0">
          <Table caption="Landlords">
            <thead>
              <tr>
                <Th>Landlord</Th>
                <Th>Contact</Th>
                <Th>State</Th>
                <Th numeric>Properties</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={4} message="No landlords yet." />
              ) : (
                rows.map((landlord) => (
                  <tr key={landlord.id}>
                    <Td>
                      {landlord.display_name}
                      <span className="block text-xs text-subtle">
                        {landlord.is_organisation ? 'Organisation' : 'Individual'}
                      </span>
                    </Td>
                    <Td>
                      {landlord.phone ?? '—'}
                      <span className="block text-xs text-subtle">{landlord.email ?? ''}</span>
                    </Td>
                    <Td>{landlord.state_code ?? '—'}</Td>
                    <Td numeric>{landlord.properties.length}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
