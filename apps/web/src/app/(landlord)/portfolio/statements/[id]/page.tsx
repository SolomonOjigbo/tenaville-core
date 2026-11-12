import { notFound, redirect } from 'next/navigation';

import { Card, EmptyState, LinkButton, PageHeader } from '../../../../../components/ui';
import { PrintButton } from '../../../../../components/payments/print-button';
import { StatementDocument, type StatementLineView } from '../../../../../components/statements/statement-document';
import { formatDate } from '../../../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../../../server/session';

/**
 * A statement as the landlord receives it (OWN-6).
 *
 * RLS shows only issued statements, so this cannot render a draft even by a
 * typed URL. The document is the shared printable one.
 */
export default async function LandlordStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('statement.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see this statement"
          description="Statements follow the statement permission."
          action={
            <LinkButton href="/portfolio/statements" variant="secondary">
              Back to statements
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
      'id, period_start, period_end, revision_number, supersedes_statement_id, status, opening_balance_kobo, closing_balance_kobo, lines, issued_at, landlords(display_name)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error !== null || statement === null) notFound();

  const { data: supersedes } =
    statement.supersedes_statement_id === null
      ? { data: null }
      : await supabase
          .from('statements')
          .select('id, revision_number, status')
          .eq('id', statement.supersedes_statement_id)
          .maybeSingle();

  const { data: supersededBy } = await supabase
    .from('statements')
    .select('id, revision_number, status')
    .eq('supersedes_statement_id', id)
    .maybeSingle();

  const lines = Array.isArray(statement.lines) ? (statement.lines as unknown as StatementLineView[]) : [];

  return (
    <>
      <PageHeader
        title="Statement"
        description={`${formatDate(statement.period_start)} to ${formatDate(statement.period_end)}`}
        action={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <LinkButton href="/portfolio/statements" variant="secondary">
              Back to statements
            </LinkButton>
            <PrintButton />
          </div>
        }
      />

      <StatementDocument
        organisationName={viewer.organisationName}
        landlordName={statement.landlords?.display_name ?? 'You'}
        statement={{
          periodStart: statement.period_start,
          periodEnd: statement.period_end,
          revisionNumber: statement.revision_number,
          status: statement.status,
          openingKobo: statement.opening_balance_kobo,
          closingKobo: statement.closing_balance_kobo,
          issuedOn: statement.issued_at === null ? null : statement.issued_at.slice(0, 10),
        }}
        lines={lines}
        supersedes={
          supersedes === null
            ? null
            : {
                id: supersedes.id,
                revisionNumber: supersedes.revision_number,
                status: supersedes.status,
              }
        }
        supersededBy={
          supersededBy === null
            ? null
            : {
                id: supersededBy.id,
                revisionNumber: supersededBy.revision_number,
                status: supersededBy.status,
              }
        }
      />
    </>
  );
}
