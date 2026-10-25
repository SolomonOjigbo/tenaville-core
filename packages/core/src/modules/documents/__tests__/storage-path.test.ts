import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SIGNED_URL_TTL_SECONDS,
  MAX_SIGNED_URL_TTL_SECONDS,
  StoragePathError,
  buildObjectPath,
  organisationFromPath,
  pathBelongsTo,
  safeFilename,
  signedUrlTtl,
} from '../domain/storage-path';

const ORG = '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const OTHER = '9a8b7c6d-5e4f-4039-8271-6a5b4c3d2e1f';
const OBJECT = '11111111-2222-4333-8444-555555555555';

describe('safeFilename', () => {
  it('keeps a reasonable name and its extension', () => {
    expect(safeFilename('Tenancy Agreement.pdf')).toBe('tenancy-agreement.pdf');
    expect(safeFilename('basin-crack.JPEG')).toBe('basin-crack.jpeg');
  });

  it('strips directory components, including traversal', () => {
    // A filename comes from a person's device, so it is attacker-shaped.
    expect(safeFilename('../../etc/passwd')).toBe('passwd');
    expect(safeFilename('..\\..\\windows\\system32\\config')).toBe('config');
    expect(safeFilename('/absolute/path/deed.pdf')).toBe('deed.pdf');
  });

  it('removes characters that have meaning in a path or a URL', () => {
    expect(safeFilename('in voice #12 (final).pdf')).toBe('in-voice-12-final.pdf');
    expect(safeFilename('receipt?v=2&x=1.pdf')).toBe('receipt-v-2-x-1.pdf');
    expect(safeFilename('..hidden.pdf')).toBe('hidden.pdf');
  });

  it('handles names that are only punctuation', () => {
    expect(safeFilename('***.pdf')).toBe('file.pdf');
    expect(safeFilename('___')).toBe('file');
  });

  it('caps a name long enough to break a path limit', () => {
    const long = `${'a'.repeat(300)}.pdf`;
    const result = safeFilename(long);
    expect(result.length).toBeLessThanOrEqual(91);
    expect(result.endsWith('.pdf')).toBe(true);
  });

  it('transliterates accents rather than dropping the word', () => {
    expect(safeFilename('Résumé Olúwaseun.pdf')).toBe('resume-oluwaseun.pdf');
  });

  it('rejects a name with nothing usable in it', () => {
    expect(() => safeFilename('')).toThrow(StoragePathError);
    expect(() => safeFilename('   ')).toThrow(StoragePathError);
  });
});

describe('buildObjectPath', () => {
  const base = {
    bucket: 'maintenance' as const,
    organisationId: ORG,
    entityType: 'deposit_deduction' as const,
    entityId: 'd1',
    objectId: OBJECT,
    filename: 'basin.jpg',
  };

  it('puts the organisation first, so a storage policy can check the prefix alone', () => {
    expect(buildObjectPath(base)).toBe(`${ORG}/deposit_deduction/d1/${OBJECT}-basin.jpg`);
    expect(organisationFromPath(buildObjectPath(base))).toBe(ORG);
  });

  it('prefixes the object id, so two uploads of the same name do not collide', () => {
    const a = buildObjectPath(base);
    const b = buildObjectPath({ ...base, objectId: '22222222-3333-4444-8555-666666666666' });
    expect(a).not.toBe(b);
  });

  it('refuses ids that are not uuids', () => {
    expect(() => buildObjectPath({ ...base, organisationId: 'not-a-uuid' })).toThrow(
      /organisation id must be a uuid/,
    );
    expect(() => buildObjectPath({ ...base, objectId: '123' })).toThrow(/object id must be a uuid/);
  });

  it('refuses an entity id that would add path segments', () => {
    // Otherwise an entity id of "../otherorg" would place the object outside
    // the organisation prefix the policy checks.
    expect(() => buildObjectPath({ ...base, entityId: '../escape' })).toThrow(
      /single path segment/,
    );
    expect(() => buildObjectPath({ ...base, entityId: 'a/b' })).toThrow(/single path segment/);
    expect(() => buildObjectPath({ ...base, entityId: '' })).toThrow(/single path segment/);
  });

  it('sanitises the filename as part of building the path', () => {
    expect(buildObjectPath({ ...base, filename: '../../secret.pdf' })).toBe(
      `${ORG}/deposit_deduction/d1/${OBJECT}-secret.pdf`,
    );
  });
});

describe('organisationFromPath', () => {
  it('reads the first segment', () => {
    expect(organisationFromPath(`${ORG}/lease/l1/x.pdf`)).toBe(ORG);
  });

  it('returns null when the path does not start with an organisation', () => {
    // Null denies access: a path belonging to nobody is reachable by nobody.
    for (const bad of ['', 'lease/l1/x.pdf', 'not-a-uuid/x', '/leading-slash']) {
      expect(organisationFromPath(bad), bad).toBeNull();
    }
  });

  it('is decided by the first segment alone', () => {
    // A later segment naming another organisation changes nothing, which is
    // what makes the prefix check sufficient.
    expect(organisationFromPath(`${ORG}/../${OTHER}/secret.pdf`)).toBe(ORG);
  });
});

describe('pathBelongsTo', () => {
  it('admits a path inside one of the caller organisations', () => {
    expect(pathBelongsTo(`${ORG}/lease/l1/x.pdf`, [OTHER, ORG])).toBe(true);
  });

  it('rejects another organisation, and an ownerless path', () => {
    expect(pathBelongsTo(`${OTHER}/lease/l1/x.pdf`, [ORG])).toBe(false);
    expect(pathBelongsTo('lease/l1/x.pdf', [ORG])).toBe(false);
    expect(pathBelongsTo(`${ORG}/lease/l1/x.pdf`, [])).toBe(false);
  });

  it('compares case-insensitively, since uuid case is not meaningful', () => {
    expect(pathBelongsTo(`${ORG.toUpperCase()}/lease/l1/x.pdf`, [ORG])).toBe(true);
  });
});

describe('signedUrlTtl', () => {
  it('defaults to minutes, not hours', () => {
    // A signed URL is a bearer token: its lifetime is the window in which a
    // forwarded link still works for somebody else.
    expect(signedUrlTtl()).toBe(DEFAULT_SIGNED_URL_TTL_SECONDS);
    expect(DEFAULT_SIGNED_URL_TTL_SECONDS).toBeLessThanOrEqual(600);
  });

  it('caps an optimistic request rather than honouring it', () => {
    expect(signedUrlTtl(86_400)).toBe(MAX_SIGNED_URL_TTL_SECONDS);
    expect(signedUrlTtl(120)).toBe(120);
  });

  it('rejects a nonsensical lifetime', () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() => signedUrlTtl(bad), String(bad)).toThrow(StoragePathError);
    }
  });
});
