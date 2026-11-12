import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  Money,
  PageHeader,
  Table,
  TableEmpty,
  Td,
  Th,
  statementStatusTone,
  statusLabel,
} from '../../../../components/ui';
import { formatDate } from '../../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** Statements the agency has issued to this landlord (LEDGER-5, OWN-6). */
export default async function LandlordStatementsPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('statement.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see statements"
          description="Statements follow the statement permission."
          action={
            <LinkButton href="/portfolio" variant="secondary">
              Back to portfolio
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data } = await supabase
    .from('statements')
    .select(
      'id, status, period_start, period_end, revision_number, closing_balance_kobo, issued_at',
    )
    .order('period_end', { ascending: false });

  const rows = data ?? [];

  return (
    <>
      <PageHeader
        title="Statements"
        description="Issued statements for your properties. A correction appears as a numbered revision."
        action={
          <LinkButton href="/portfolio" variant="secondary">
            Back to portfolio
          </LinkButton>
        }
      />

      <Card>
        <CardHeader
          title="Issued statements"
          description="Only issued statements appear here; drafts are the agency's working copies."
        />
        <CardBody className="p-0">
          <Table caption="Statements">
            <thead>
              <tr>
                <Th>Period</Th>
                <Th numeric>Revision</Th>
                <Th numeric>Closing balance</Th>
                <Th>Status</Th>
                <Th>Issued</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5} message="No statements issued yet." />
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <Td>
                      <Link
                        href={`/portfolio/statements/${row.id}`}
                        className="text-info-text underline-offset-2 hover:underline"
                      >
                        {formatDate(row.period_start)} to {formatDate(row.period_end)}
                      </Link>
                    </Td>
                    <Td numeric>{row.revision_number}</Td>
                    <Td numeric>
                      <Money kobo={String(row.closing_balance_kobo)} />
                    </Td>
                    <Td>
                      <Badge tone={statementStatusTone(row.status)}>
                        {statusLabel(row.status)}
                      </Badge>
                    </Td>
                    <Td>{row.issued_at === null ? '—' : formatDate(row.issued_at.slice(0, 10))}</Td>
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
