import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  TableEmpty,
  Td,
  Th,
  statusLabel,
} from '../../../components/ui';
import { ImportForm } from '../../../components/forms/import-form';
import { formatDateTime } from '../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../server/session';

const importTone = (status: string) => {
  if (status === 'applied') return 'success';
  if (status === 'validated') return 'info';
  if (status === 'failed') return 'danger';
  if (status === 'rolled_back') return 'neutral';
  return 'warning';
};

/** Import centre for properties, tenancies and opening balances (PROP-4, MIG-1..MIG-3). */
export default async function ImportsPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('org.update')) {
    return (
      <Card>
        <EmptyState
          title="You cannot import data"
          description="Only an owner or administrator can import records."
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
  const { data: batches } = await supabase
    .from('import_batches')
    .select(
      'id, kind, status, file_name, row_count, valid_count, invalid_count, cutover_on, created_at, applied_at',
    )
    .eq('organisation_id', viewer.organisationId)
    .order('created_at', { ascending: false })
    .limit(30);

  const rows = batches ?? [];

  return (
    <>
      <PageHeader
        title="Imports"
        description="Every import is validated first, then applied and audited as one batch. Nothing is created until you choose Apply."
        action={
          <LinkButton href="/properties" variant="secondary">
            Back to properties
          </LinkButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader
            title="Import batches"
            description="Dry runs, applied imports and rolled-back batches."
          />
          <CardBody className="p-0">
            <Table caption="Import batches">
              <thead>
                <tr>
                  <Th>File</Th>
                  <Th>Kind</Th>
                  <Th>Rows</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <TableEmpty colSpan={5} message="No imports yet." />
                ) : (
                  rows.map((batch) => (
                    <tr key={batch.id}>
                      <Td>
                        <Link
                          href={`/imports/${batch.id}`}
                          className="text-info-text underline-offset-2 hover:underline"
                        >
                          {batch.file_name ?? 'Untitled import'}
                        </Link>
                        {batch.cutover_on !== null && (
                          <span className="block text-xs text-subtle">
                            cutover {batch.cutover_on}
                          </span>
                        )}
                      </Td>
                      <Td>{statusLabel(batch.kind)}</Td>
                      <Td>
                        {batch.valid_count} valid · {batch.invalid_count} invalid
                        <span className="block text-xs text-subtle">{batch.row_count} total</span>
                      </Td>
                      <Td>
                        <Badge tone={importTone(batch.status)}>{statusLabel(batch.status)}</Badge>
                      </Td>
                      <Td>{formatDateTime(batch.created_at)}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="New import"
            description="Choose a CSV, validate it, then review the rows before applying."
          />
          <CardBody>
            <ImportForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
