import Link from 'next/link';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  Money,
  Table,
  TableEmpty,
  Td,
  Th,
  statementStatusTone,
  statusLabel,
} from '../ui';
import { StatementForm } from '../forms/statement-form';
import { formatDate, monthBounds } from '../../lib/format';
import { supabaseForRequest } from '../../server/session';

/**
 * Statements for one landlord, and the offer to create the current month's.
 *
 * It reads through the request client like every other screen; the statements
 * policy decides whether the landlord or staff sees them.
 */
export const LandlordStatements = async ({
  landlordId,
  canIssue,
  today,
}: {
  readonly landlordId: string;
  readonly canIssue: boolean;
  readonly today: string;
}) => {
  const supabase = await supabaseForRequest();
  const { data } = await supabase
    .from('statements')
    .select(
      'id, status, period_start, period_end, revision_number, closing_balance_kobo, issued_at',
    )
    .eq('landlord_id', landlordId)
    .order('period_end', { ascending: false })
    .limit(24);

  const rows = data ?? [];
  const bounds = monthBounds(today);

  return (
    <Card className="mb-6">
      <CardHeader
        title="Statements"
        description="Frozen period snapshots. A draft can still be discarded by creating a new one; an issued statement cannot change."
        action={<Badge tone="neutral">{rows.length}</Badge>}
      />
      <CardBody className="space-y-6">
        {canIssue && (
          <StatementForm
            landlordId={landlordId}
            defaultStart={bounds.start}
            defaultEnd={bounds.end}
          />
        )}

        <div className="border-t border-border pt-2">
          <Table caption="Statements">
            <thead>
              <tr>
                <Th>Period</Th>
                <Th numeric>Revision</Th>
                <Th numeric>Closing</Th>
                <Th>Status</Th>
                <Th>Issued</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5} message="No statements yet." />
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <Td>
                      <Link
                        href={`/statements/${row.id}`}
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
        </div>
      </CardBody>
    </Card>
  );
};
