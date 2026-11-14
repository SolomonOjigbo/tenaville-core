import type { AdminClient, UserClient } from '@tenaville/db';

import {
  buildObjectPath,
  organisationFromPath,
  signedUrlTtl,
  StoragePathError,
  type Bucket,
  type DocumentEntity,
} from '../domain/storage-path';

/**
 * Issuing and storing documents (DOC-7).
 *
 * DOC-7 has two obligations — no guessable public URL, and authorisation at
 * download time — and they are met in different places:
 *
 *   Buckets are private, so there is no public URL to guess. That is
 *   configuration, in supabase/config.toml.
 *
 *   Authorisation happens here, at the moment a link is minted. The check is
 *   not a bespoke permission test: it reads the record the file belongs to
 *   through the *caller's own client*, so the row-level policies already
 *   covered by the pgTAP suite are what decide it. A caller who cannot see the
 *   lease cannot get a link to its agreement, and that follows from one
 *   mechanism rather than two that can drift apart.
 */

export interface DownloadRequest {
  readonly bucket: Bucket;
  readonly path: string;
  /** The record the file belongs to. Its visibility decides the answer. */
  readonly entityType: DocumentEntity;
  readonly entityId: string;
  readonly ttlSeconds?: number | undefined;
}

/**
 * Which table holds each kind of record, for the visibility check.
 *
 * Typed as literal table names so the client stays type-checked: a typo here
 * would otherwise become a runtime error on a download rather than a build
 * failure.
 */
const ENTITY_TABLES = {
  property: 'properties',
  unit: 'units',
  landlord: 'landlords',
  tenant: 'tenants',
  lease: 'leases',
  deposit_deduction: 'deposit_deductions',
  handover: 'lease_handovers',
  maintenance_request: 'maintenance_requests',
  payment: 'payments',
  ledger_entry: 'landlord_ledger_entries',
  screening_application: 'screening_applications',
} as const satisfies Record<DocumentEntity, string>;

export class DocumentAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentAccessError';
  }
}

/**
 * A short-lived link to one document.
 *
 * @param client - the caller's own client. Row-level security applies, and
 *   that is the authorisation.
 * @param admin - service-role client, used only to sign the URL and to record
 *   the access. Reached only after the check above has passed.
 */
export const issueDownloadUrl = async (
  client: UserClient,
  admin: AdminClient,
  request: DownloadRequest,
): Promise<{ url: string; expiresInSeconds: number }> => {
  const owner = organisationFromPath(request.path);
  if (owner === null) {
    // A path that begins with no organisation belongs to nobody. Refused
    // before anything else, because there is no record to check it against.
    throw new DocumentAccessError('that file does not exist');
  }

  const ttl = signedUrlTtl(request.ttlSeconds);
  const table = ENTITY_TABLES[request.entityType];

  // The authorisation. Read through the caller's client, so their policies
  // decide; a row they cannot see comes back null and is indistinguishable
  // from one that does not exist, which is the right answer to give.
  const { data: record, error: readError } = await client
    .from(table)
    .select('id, organisation_id')
    .eq('id', request.entityId)
    .maybeSingle();

  if (readError !== null) {
    throw new DocumentAccessError('that file does not exist');
  }
  if (record === null) {
    throw new DocumentAccessError('that file does not exist');
  }

  // The file must live under the same organisation as the record it claims to
  // belong to. Without this, a reachable record could be used to mint a link
  // to a path under another organisation's prefix.
  if (record.organisation_id.toLowerCase() !== owner.toLowerCase()) {
    throw new DocumentAccessError('that file does not exist');
  }

  const { data, error } = await admin.storage
    .from(request.bucket)
    .createSignedUrl(request.path, ttl);

  if (error !== null || data === null) {
    throw new DocumentAccessError('could not produce a download link');
  }

  // ORG-5: sensitive document access is recorded. Through the caller's client,
  // so the trail is attributed to them by auth.uid() rather than to the
  // service role.
  const { error: auditError } = await client.rpc('record_document_access', {
    target_organisation_id: record.organisation_id,
    object_bucket: request.bucket,
    object_path: request.path,
    entity_type: request.entityType,
    entity_id: request.entityId,
  });

  if (auditError !== null) {
    // A link that cannot be accounted for is not issued. ORG-5 makes the
    // record part of the act, not a side effect of it.
    throw new DocumentAccessError('could not record the access; no link was issued');
  }

  return { url: data.signedUrl, expiresInSeconds: ttl };
};

/**
 * Store a file against a record.
 *
 * Uploaded through the caller's own client, so the storage policies apply to
 * them rather than to the service role — the admin client has no part in this
 * path at all.
 */
export const uploadDocument = async (
  client: UserClient,
  params: {
    bucket: Bucket;
    organisationId: string;
    entityType: DocumentEntity;
    entityId: string;
    filename: string;
    body: Blob | ArrayBuffer | Uint8Array;
    contentType: string;
  },
): Promise<{ path: string }> => {
  const path = buildObjectPath({
    bucket: params.bucket,
    organisationId: params.organisationId,
    entityType: params.entityType,
    entityId: params.entityId,
    objectId: crypto.randomUUID(),
    filename: params.filename,
  });

  const { error } = await client.storage.from(params.bucket).upload(path, params.body, {
    contentType: params.contentType,
    // Never overwrite. A document attached to a lease or a deduction is
    // evidence, and replacing one silently is what an audit trail exists to
    // prevent (PRD §10.13).
    upsert: false,
  });

  if (error !== null) {
    throw new StoragePathError(`could not store the file: ${error.message}`);
  }

  return { path };
};
