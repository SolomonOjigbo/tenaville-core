import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

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
import { PrintButton } from '../../../../components/payments/print-button';
import { StatementForm } from '../../../../components/forms/statement-form';
import { StatementTransitionButton } from '../../../../components/statements/statement-transition-button';
import { formatDate } from '../../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

interface StatementLine {
  readonly id: string;
  readonly occurredOn: string;
  readonly kind: string;
  readonly fundsClass: string;
  readonly description: string;
  readonly amountKobo: number;
  readonly paymentId: string | null;
  readonly remittanceId: string | null;
}

/**
 * One landlord statement (LEDGER-2, LEDGER-8).
 *
 * The lines come from the snapshot on the row, not from the ledger, so this
 * page shows what was said even after later entries. Workflow buttons follow
 * draft → reviewed → issued; an issued statement offers a revision instead.
 */
export default async function StatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('statement.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see statements"
          description="Statements follow the statement permission."
          action={
            <LinkButton href="/ledger" variant="secondary">
              Back to ledger
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data: statement, error } = await supabase
    .from('statements')
    .select(
      'id, landlord_id, period_start, period_end, revision_number, supersedes_statement_id, status, opening_balance_kobo, closing_balance_kobo, lines, reviewed_at, issued_at, created_at, landlords(display_name)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error !== null || statement === null) notFound();

  const { data: supersedes } =
    statement.supersedes_statement_id === null
      ? { data: null }
      : await supabase
          .from('statements')
          .select('id, revision_number, period_start, period_end')
          .eq('id', statement.supersedes_statement_id)
          .maybeSingle();

  const { data: supersededBy } = await supabase
    .from('statements')
    .select('id, revision_number, status')
    .eq('supersedes_statement_id', id)
    .maybeSingle();

  const lines = Array.isArray(statement.lines)
    ? (statement.lines as unknown as StatementLine[])
    : [];
  const movement = lines.reduce((total, line) => total + BigInt(line.amountKobo), 0n);
  const canIssue = viewer.access.can('statement.issue');
  const landlordName = statement.landlords?.display_name ?? 'Landlord';

  return (
    <>
      <PageHeader
        title="Landlord statement"
        description={`${landlordName} · ${formatDate(statement.period_start)} to ${formatDate(statement.period_end)}`}
        action={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <LinkButton href={`/ledger/${statement.landlord_id}`} variant="secondary">
              Back to ledger
            </LinkButton>
            <PrintButton />
          </div>
        }
      />

      <Card className="mx-auto max-w-3xl print:max-w-none print:border-0 print:shadow-none">
        <CardBody className="space-y-6 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="font-display text-lg text-text">{viewer.organisationName}</p>
              <p className="text-sm text-muted">Landlord statement · {landlordName}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg text-text">Revision {statement.revision_number}</p>
              <Badge tone={statementStatusTone(statement.status)}>
                {statusLabel(statement.status)}
              </Badge>
            </div>
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Opening balance</dt>
              <dd className="mt-0.5 text-text">
                <Money kobo={String(statement.opening_balance_kobo)} />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Movements</dt>
              <dd className="mt-0.5 text-text">
                <Money kobo={movement.toString()} />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Closing balance</dt>
              <dd className="mt-0.5 text-text">
                <Money kobo={String(statement.closing_balance_kobo)} />
              </dd>
            </div>
          </dl>

          <Table caption="Statement lines">
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Description</Th>
                <Th>Funds</Th>
                <Th numeric>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <TableEmpty colSpan={4} message="No movements in this period." />
              ) : (
                lines.map((line) => (
                  <tr key={line.id}>
                    <Td>{formatDate(line.occurredOn)}</Td>
                    <Td>
                      {line.description}
                      <span className="block text-xs text-subtle">{statusLabel(line.kind)}</span>
                    </Td>
                    <Td>
                      <Badge tone={line.fundsClass === 'agency_income' ? 'warning' : 'info'}>
                        {statusLabel(line.fundsClass)}
                      </Badge>
                    </Td>
                    <Td numeric>
                      <Money kobo={String(line.amountKobo)} />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>

          <div className="border-t border-border pt-4 text-xs text-subtle">
            <p>
              {statement.issued_at === null
                ? 'Not yet issued. A draft is a working copy; issue it when the figures are checked.'
                : `Issued ${formatDate(statement.issued_at.slice(0, 10))}. An issued statement cannot be changed.`}
            </p>
            {supersedes !== null && (
              <p className="mt-1">
                Replaces{' '}
                <Link
                  href={`/statements/${supersedes.id}`}
                  className="text-info-text underline-offset-2 hover:underline"
                >
                  revision {supersedes.revision_number}
                </Link>
                .
              </p>
            )}
            {supersededBy !== null && (
              <p className="mt-1">
                Superseded by{' '}
                <Link
                  href={`/statements/${supersededBy.id}`}
                  className="text-info-text underline-offset-2 hover:underline"
                >
                  revision {supersededBy.revision_number} ({statusLabel(supersededBy.status)})
                </Link>
                .
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {canIssue && (
        <Card className="mx-auto mt-6 max-w-3xl print:hidden">
          <CardHeader
            title={
              statement.status === 'draft'
                ? 'Review this statement'
                : statement.status === 'reviewed'
                  ? 'Issue this statement'
                  : 'Correct this statement'
            }
            description={
              statement.status === 'issued'
                ? 'An issued statement is immutable. Create a revision for the same period; the original stays as sent.'
                : 'Review checks the figures; issuing locks them and makes the statement final.'
            }
          />
          <CardBody className="space-y-4">
            {statement.status === 'draft' && (
              <StatementTransitionButton statementId={statement.id} mode="review" />
            )}
            {statement.status === 'reviewed' && (
              <StatementTransitionButton statementId={statement.id} mode="issue" />
            )}
            {statement.status === 'issued' && (
              <StatementForm
                landlordId={statement.landlord_id}
                defaultStart={statement.period_start}
                defaultEnd={statement.period_end}
                supersedesId={statement.id}
              />
            )}
          </CardBody>
        </Card>
      )}
    </>
  );
}
