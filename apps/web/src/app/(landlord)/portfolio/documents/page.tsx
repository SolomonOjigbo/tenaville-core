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

/** Documents on the landlord's properties (OWN-3, DOC-2). */
export default async function LandlordDocumentsPage() {
  const viewer = await currentViewer();
  if (!viewer?.access.can('maintenance.read')) {
    return (
      <Card>
        <EmptyState
          title="No document access"
          description="This area is for the landlord on the property."
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
        description="Files attached to your properties and tenancies."
        action={
          <LinkButton href="/portfolio" variant="secondary">
            Back to portfolio
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
