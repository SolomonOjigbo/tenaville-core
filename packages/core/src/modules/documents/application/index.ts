/** The documents module's public surface (DOC-7, TV-014). */
export { issueDownloadUrl, uploadDocument, type DownloadRequest } from './downloads';

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
