/** The documents module's public surface (DOC-2, DOC-5, DOC-7). */
export { issueDownloadUrl, uploadDocument, type DownloadRequest } from './downloads';

export {
  daysUntilExpiry,
  documentExpiryLabel,
  documentExpiryStatus,
  type DocumentExpiryStatus,
} from '../domain/expiry';

export {
  buildObjectPath,
  organisationFromPath,
  pathBelongsTo,
  safeFilename,
  signedUrlTtl,
  StoragePathError,
  DEFAULT_SIGNED_URL_TTL_SECONDS,
  MAX_SIGNED_URL_TTL_SECONDS,
  type Bucket,
  type DocumentEntity,
  type ObjectLocation,
} from '../domain/storage-path';
