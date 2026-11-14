import { documentExpiryLabel, documentExpiryStatus } from '@tenaville/core/documents';

import { Badge, Table, TableEmpty, Td, Th } from '../ui';
import { formatDate } from '../../lib/format';
import { todayIso } from '../../lib/payments';
import { DocumentDownloadButton } from './document-download-button';

export interface DocumentRow {
  readonly id: string;
  readonly entity_type: string;
  readonly entity_id: string;
  readonly bucket: string;
  readonly storage_path: string;
  readonly file_name: string;
  readonly document_type: string;
  readonly title: string | null;
  readonly expiry_date: string | null;
  readonly size_bytes: number;
  readonly sensitive: boolean;
  readonly scan_status?: string | null;
}

const EXPIRY_TONES = {
  expired: 'danger',
  expiring_soon: 'warning',
  valid: 'success',
  none: 'neutral',
} as const;

const sizeLabel = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

/** The document register table shared by staff, landlords and tenants. */
export const DocumentsTable = ({ documents }: { readonly documents: readonly DocumentRow[] }) => {
  const today = todayIso();

  return (
    <Table caption="Documents">
      <thead>
        <tr>
          <Th>Document</Th>
          <Th>Attached to</Th>
          <Th>Expiry</Th>
          <Th>Size</Th>
          <Th>File</Th>
        </tr>
      </thead>
      <tbody>
        {documents.length === 0 ? (
          <TableEmpty colSpan={5} message="No documents yet." />
        ) : (
          documents.map((document) => {
            const status = documentExpiryStatus(document.expiry_date, today);
            return (
              <tr key={document.id}>
                <Td>
                  <span className="text-text">
                    {document.title ?? document.file_name}
                    {document.sensitive && <Badge tone="warning">Sensitive</Badge>}
                    {document.scan_status === 'unscanned' && (
                      <Badge tone="warning">Not scanned</Badge>
                    )}
                    {document.scan_status === 'infected' && (
                      <Badge tone="danger">Infected</Badge>
                    )}
                  </span>
                  <span className="block text-xs text-subtle">
                    {document.document_type.replace(/_/g, ' ')}
                  </span>
                </Td>
                <Td>
                  {document.entity_type.replace(/_/g, ' ')}
                  <span className="block max-w-xs truncate text-xs text-subtle">
                    {document.entity_id}
                  </span>
                </Td>
                <Td>
                  {document.expiry_date === null ? (
                    <Badge tone="neutral">{documentExpiryLabel(status)}</Badge>
                  ) : (
                    <>
                      {formatDate(document.expiry_date)}
                      <span className="mt-1 block">
                        <Badge tone={EXPIRY_TONES[status]}>{documentExpiryLabel(status)}</Badge>
                      </span>
                    </>
                  )}
                </Td>
                <Td>{sizeLabel(document.size_bytes)}</Td>
                <Td>
                  <DocumentDownloadButton
                    bucket={document.bucket}
                    path={document.storage_path}
                    entityType={document.entity_type}
                    entityId={document.entity_id}
                  />
                </Td>
              </tr>
            );
          })
        )}
      </tbody>
    </Table>
  );
};
