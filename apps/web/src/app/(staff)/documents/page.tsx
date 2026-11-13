import { redirect } from 'next/navigation';

import { documentExpiryStatus } from '@tenaville/core/documents';

import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  Stat,
} from '../../../components/ui';
import {
  DocumentUploadForm,
  GenerateDocumentAlertsForm,
  type DocumentEntityGroup,
} from '../../../components/forms/document-upload-form';
import { DocumentsTable, type DocumentRow } from '../../../components/documents/documents-table';
import { todayIso } from '../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../server/session';

/** The document register (DOC-1, DOC-2, DOC-5). */
export default async function DocumentsPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('document.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see documents"
          description="This is a document permission. Ask an owner or administrator."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const [
    { data: documents },
    { data: properties },
    { data: units },
    { data: landlords },
    { data: tenants },
    { data: leases },
    { data: maintenance },
    { data: deductions },
    { data: handovers },
    { data: ledgerEntries },
  ] = await Promise.all([
    supabase
      .from('documents')
      .select(
        'id, entity_type, entity_id, bucket, storage_path, file_name, document_type, title, expiry_date, size_bytes, sensitive',
      )
      .order('created_at', { ascending: false }),
    supabase.from('properties').select('id, name').order('name'),
    supabase.from('units').select('id, label, properties(name)').order('label'),
    supabase.from('landlords').select('id, display_name').order('display_name'),
    supabase.from('tenants').select('id, display_name').order('display_name'),
    supabase
      .from('leases')
      .select('id, reference, units(label, properties(name))')
      .order('created_at', { ascending: false }),
    supabase
      .from('maintenance_requests')
      .select('id, category, property:properties(name), units(label)')
      .order('created_at', { ascending: false }),
    supabase
      .from('deposit_deductions')
      .select(
        'id, reason, amount_kobo, lease:lease_deposits!deposit_deductions_deposit_id_fkey(lease:leases!lease_deposits_lease_id_fkey(reference))',
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('lease_handovers')
      .select('id, kind, happened_on, lease:leases(reference)')
      .order('happened_on', { ascending: false }),
    supabase
      .from('landlord_ledger_entries')
      .select('id, entry_kind, occurred_on, description, landlord:landlords(display_name)')
      .order('occurred_on', { ascending: false })
      .limit(100),
  ]);

  const groups: DocumentEntityGroup[] = [
    {
      type: 'property',
      label: 'Property',
      items: (properties ?? []).map((row) => ({ id: row.id, label: row.name })),
    },
    {
      type: 'unit',
      label: 'Unit',
      items: (units ?? []).map((row) => ({
        id: row.id,
        label: `${row.properties?.name ?? 'Property'} · ${row.label}`,
      })),
    },
    {
      type: 'landlord',
      label: 'Landlord',
      items: (landlords ?? []).map((row) => ({ id: row.id, label: row.display_name })),
    },
    {
      type: 'tenant',
      label: 'Tenant',
      items: (tenants ?? []).map((row) => ({ id: row.id, label: row.display_name })),
    },
    {
      type: 'lease',
      label: 'Lease',
      items: (leases ?? []).map((row) => ({
        id: row.id,
        label: `${row.reference ?? 'Lease'} · ${row.units?.properties?.name ?? 'Property'} · ${row.units?.label ?? 'Unit'}`,
      })),
    },
    {
      type: 'maintenance_request',
      label: 'Maintenance request',
      items: (maintenance ?? []).map((row) => ({
        id: row.id,
        label: `${row.category.replace(/_/g, ' ')} · ${row.property?.name ?? 'Property'} · ${row.units?.label ?? 'Whole property'}`,
      })),
    },
    {
      type: 'deposit_deduction',
      label: 'Deposit deduction',
      items: (deductions ?? []).map((row) => ({
        id: row.id,
        label: `${row.lease?.lease?.reference ?? 'Lease'} · ${row.reason}`,
      })),
    },
    {
      type: 'handover',
      label: 'Handover',
      items: (handovers ?? []).map((row) => ({
        id: row.id,
        label: `${row.lease?.reference ?? 'Lease'} · ${row.kind.replace(/_/g, ' ')} · ${row.happened_on}`,
      })),
    },
    {
      type: 'ledger_entry',
      label: 'Ledger entry',
      items: (ledgerEntries ?? []).map((row) => ({
        id: row.id,
        label: `${row.landlord?.display_name ?? 'Landlord'} · ${row.occurred_on} · ${row.description}`,
      })),
    },
  ].filter((group) => group.items.length > 0);

  const rows = (documents ?? []) as DocumentRow[];
  const today = todayIso();
  const expiring = rows.filter(
    (row) => documentExpiryStatus(row.expiry_date, today) === 'expiring_soon',
  ).length;
  const expired = rows.filter(
    (row) => documentExpiryStatus(row.expiry_date, today) === 'expired',
  ).length;

  return (
    <>
      <PageHeader
        title="Documents"
        description="Private files attached to the records they belong to. A download link is short-lived and audited."
        action={
          viewer.access.can('document.write') ? (
            <a
              href="#upload"
              className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-surface px-4 font-medium text-text hover:bg-surface2"
            >
              Upload a document
            </a>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Documents" value={rows.length} />
        <Stat label="Expiring soon" value={expiring} hint="Within 30 days" />
        <Stat label="Expired" value={expired} />
      </div>

      {viewer.access.can('document.write') && groups.length > 0 && (
        <div id="upload">
          <Card className="mb-6">
            <CardHeader
              title="Upload a document"
              description="The file is stored privately; only people who can reach the record can download it."
            />
            <CardBody>
              <DocumentUploadForm groups={groups} />
            </CardBody>
          </Card>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader
          title="Expiry alerts"
          description="Create tasks for documents that are expired or expire within 30 days."
        />
        <CardBody>
          <GenerateDocumentAlertsForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Register" description="Newest first." />
        <CardBody className="p-0">
          <DocumentsTable documents={rows} />
        </CardBody>
      </Card>
    </>
  );
}
