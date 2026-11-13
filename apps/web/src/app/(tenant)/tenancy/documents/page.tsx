import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
} from '../../../../components/ui';
import { DocumentsTable } from '../../../../components/documents/documents-table';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** Documents the agency has shared with this tenant (TENANT-6, DOC-2). */
export default async function TenantDocumentsPage() {
  const viewer = await currentViewer();
  if (!viewer?.access.can('self.tenancy.read')) {
    return (
      <Card>
        <EmptyState
          title="No document access"
          description="This area is for tenants. Ask the agency to link your account to your tenancy."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data } = await supabase
    .from('documents')
    .select(
      'id, entity_type, entity_id, bucket, storage_path, file_name, document_type, title, expiry_date, size_bytes, sensitive',
    )
    .order('created_at', { ascending: false });

  return (
    <>
      <PageHeader
        title="Documents"
        description="Files the agency has attached to your tenancy or your record."
        action={
          <LinkButton href="/tenancy" variant="secondary">
            Back to tenancy
          </LinkButton>
        }
      />

      <Card>
        <CardHeader title="Your documents" description="Downloads are short-lived and recorded." />
        <CardBody className="p-0">
          <DocumentsTable documents={data ?? []} />
        </CardBody>
      </Card>
    </>
  );
}
