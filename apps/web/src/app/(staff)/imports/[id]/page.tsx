import { notFound, redirect } from 'next/navigation';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  Stat,
  Table,
  TableEmpty,
  Td,
  Th,
  statusLabel,
} from '../../../../components/ui';
import { ImportBatchActions } from '../../../../components/forms/import-batch-actions';
import { formatDateTime } from '../../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

const importTone = (status: string) => {
  if (status === 'applied') return 'success';
  if (status === 'validated') return 'info';
  if (status === 'failed') return 'danger';
  if (status === 'rolled_back') return 'neutral';
  return 'warning';
};

interface RowIssue {
  readonly field?: string;
  readonly message?: string;
}

const rawLabel = (raw: unknown): string => {
  if (raw === null || typeof raw !== 'object') return '—';
  const row = raw as Record<string, unknown>;
  const values = [
    row.tenantName,
    row.leaseReference,
    row.propertyName,
    row.unitLabel,
    row.accountType,
    row.landlordName,
  ].filter((value): value is string => typeof value === 'string' && value !== '');
  if (values.length > 0) return values.join(' · ');
  if (Array.isArray(row.cells)) return row.cells.join(' · ');
  return '—';
};

/** One dry-run batch: preview, errors, apply and rollback (MIG-3). */
export default async function ImportBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('org.update')) {
    return (
      <Card>
        <EmptyState
          title="You cannot view imports"
          description="Only an owner or administrator can manage imports."
          action={
            <LinkButton href="/imports" variant="secondary">
              Back to imports
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const [{ data: batch, error }, { data: rows }] = await Promise.all([
    supabase
      .from('import_batches')
      .select(
        'id, kind, status, file_name, row_count, valid_count, invalid_count, cutover_on, created_at, applied_at, rolled_back_at, source_headers',
      )
      .eq('id', id)
      .eq('organisation_id', viewer.organisationId)
      .maybeSingle(),
    supabase
      .from('import_rows')
      .select('id, row_number, status, raw, errors, created_entity_type, created_entity_id')
      .eq('batch_id', id)
      .order('row_number')
      .limit(500),
  ]);

  if (error !== null || batch === null) notFound();

  const rowData = rows ?? [];

  return (
    <>
      <PageHeader
        title={batch.file_name ?? 'Import batch'}
        description={`${statusLabel(batch.kind)} · ${formatDateTime(batch.created_at)}${batch.cutover_on === null ? '' : ` · cutover ${batch.cutover_on}`}`}
        action={
          <LinkButton href="/imports" variant="secondary">
            Back to imports
          </LinkButton>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Rows" value={batch.row_count} />
        <Stat label="Valid" value={batch.valid_count} />
        <Stat label="Invalid" value={batch.invalid_count} />
        <Stat
          label="Status"
          value={<Badge tone={importTone(batch.status)}>{statusLabel(batch.status)}</Badge>}
        />
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Batch actions"
          description="Apply only a fully valid batch. An applied batch can be rolled back while its records have no later history."
        />
        <CardBody>
          <ImportBatchActions batchId={batch.id} status={batch.status} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Rows"
          description="Every problem is reported against the row and field."
        />
        <CardBody className="p-0">
          <Table caption="Import rows">
            <thead>
              <tr>
                <Th>Row</Th>
                <Th>Record</Th>
                <Th>Status</Th>
                <Th>Problems</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {rowData.length === 0 ? (
                <TableEmpty colSpan={5} message="No rows stored." />
              ) : (
                rowData.map((row) => {
                  const issues = Array.isArray(row.errors) ? (row.errors as RowIssue[]) : [];
                  return (
                    <tr key={row.id}>
                      <Td>{row.row_number}</Td>
                      <Td>{rawLabel(row.raw)}</Td>
                      <Td>
                        <Badge
                          tone={
                            row.status === 'valid' || row.status === 'applied'
                              ? 'success'
                              : row.status === 'invalid'
                                ? 'danger'
                                : 'neutral'
                          }
                        >
                          {statusLabel(row.status)}
                        </Badge>
                      </Td>
                      <Td>
                        {issues.length === 0 ? (
                          '—'
                        ) : (
                          <ul className="space-y-1 text-xs text-danger-text">
                            {issues.map((issue, index) => (
                              <li key={`${row.id}-${index}`}>
                                {issue.field === undefined ? '' : `${issue.field}: `}
                                {issue.message ?? 'Invalid value'}
                              </li>
                            ))}
                          </ul>
                        )}
                      </Td>
                      <Td>
                        {row.created_entity_type === null ? (
                          '—'
                        ) : (
                          <>
                            {statusLabel(row.created_entity_type)}
                            {row.created_entity_id !== null && (
                              <span className="block max-w-xs truncate text-xs text-subtle">
                                {row.created_entity_id}
                              </span>
                            )}
                          </>
                        )}
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
