/**
 * Where a file lives in storage (DOC-7).
 *
 *   <organisation_id>/<entity_type>/<entity_id>/<object_id>-<filename>
 *
 * The organisation comes first so a storage policy can enforce tenant
 * isolation on the prefix alone. Everything here is pure, so the rules can be
 * tested without a bucket — which matters, because the storage policies
 * themselves cannot be tested in a bare Postgres image.
 */

export type Bucket = 'documents' | 'maintenance';

/**
 * What a document can be attached to (DOC-1).
 *
 * Only records that exist today. Maintenance jobs and payments are also named
 * by DOC-1 and will join this union when those tables land in R1 steps 4 and
 * 8 — listing them now would let a caller name an entity the visibility check
 * cannot look up.
 */
export type DocumentEntity =
  'property' | 'unit' | 'landlord' | 'tenant' | 'lease' | 'deposit_deduction' | 'handover';

export class StoragePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoragePathError';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reduce an uploaded filename to something safe to store.
 *
 * A filename arrives from a person's device and is therefore attacker-shaped:
 * path separators, traversal sequences, control characters, leading dots and
 * names long enough to break a path limit all turn up in real uploads. The
 * extension is preserved because it is what tells a viewer how to open the
 * file; everything else is reduced to a conservative set.
 */
export const safeFilename = (filename: string): string => {
  const trimmed = filename.trim();
  if (trimmed === '') throw new StoragePathError('a file must have a name');

  // Take the last segment, so "../../etc/passwd" becomes "passwd".
  const base = trimmed.split(/[/\\]/).pop() ?? '';

  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const extension = dot > 0 ? base.slice(dot + 1).toLowerCase() : '';

  const cleanStem = stem
    .normalize('NFKD')
    // Drop the combining marks NFKD just separated out. Without this a
    // decomposed accent counts as a non-letter and becomes a hyphen, so
    // "Olúwaseun" would be stored as "olu-waseun" — mangling exactly the
    // names this product handles most.
    .replace(/\p{Mark}+/gu, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    .toLowerCase();

  const cleanExtension = extension.replace(/[^a-z0-9]/g, '').slice(0, 10);

  // A name made entirely of punctuation is odd but not an error: the upload
  // should still succeed under a neutral name rather than failing in a
  // caretaker's hands on site. Only a genuinely empty input is rejected, and
  // that is caught above.
  const safeStem = cleanStem === '' ? 'file' : cleanStem;
  return cleanExtension === '' ? safeStem : `${safeStem}.${cleanExtension}`;
};

export interface ObjectLocation {
  readonly bucket: Bucket;
  readonly organisationId: string;
  readonly entityType: DocumentEntity;
  readonly entityId: string;
  readonly objectId: string;
  readonly filename: string;
}

/** Build the storage path for a new object. */
export const buildObjectPath = (location: ObjectLocation): string => {
  if (!UUID.test(location.organisationId)) {
    throw new StoragePathError('the organisation id must be a uuid');
  }
  if (!UUID.test(location.objectId)) {
    throw new StoragePathError('the object id must be a uuid');
  }
  if (location.entityId.trim() === '' || /[/\\]/.test(location.entityId)) {
    throw new StoragePathError('the entity id must be a single path segment');
  }

  return [
    location.organisationId,
    location.entityType,
    location.entityId,
    `${location.objectId}-${safeFilename(location.filename)}`,
  ].join('/');
};

/**
 * The organisation a path belongs to, or null.
 *
 * Mirrors `app.storage_organisation_id` in the database, so the same answer is
 * available without a round trip. Null denies access — a path that does not
 * begin with an organisation belongs to nobody.
 */
export const organisationFromPath = (path: string): string | null => {
  const first = path.split('/')[0] ?? '';
  return UUID.test(first) ? first.toLowerCase() : null;
};

/** Whether a path sits inside one of the caller's organisations. */
export const pathBelongsTo = (path: string, organisationIds: readonly string[]): boolean => {
  const owner = organisationFromPath(path);
  if (owner === null) return false;
  return organisationIds.some((id) => id.toLowerCase() === owner);
};

/**
 * How long a signed download link lives.
 *
 * Minutes, not hours. A signed URL is a bearer token: once minted it works for
 * whoever holds it, so its lifetime is the window in which a forwarded link or
 * a logged referrer is still useful to somebody else. Long enough to open a
 * PDF on a slow connection, short enough that a pasted link is stale.
 */
export const DEFAULT_SIGNED_URL_TTL_SECONDS = 300;
export const MAX_SIGNED_URL_TTL_SECONDS = 3600;

export const signedUrlTtl = (requested?: number): number => {
  if (requested === undefined) return DEFAULT_SIGNED_URL_TTL_SECONDS;
  if (!Number.isInteger(requested) || requested <= 0) {
    throw new StoragePathError('a link lifetime must be a positive whole number of seconds');
  }
  // Capped rather than rejected: a caller asking for a day gets an hour, and
  // the cap is the policy rather than the caller's optimism.
  return Math.min(requested, MAX_SIGNED_URL_TTL_SECONDS);
};
