import { describe, expect, it } from 'vitest';

import {
  MINIMUM_PASSWORD_LENGTH,
  checkPassword,
  destinationFor,
  safeRedirect,
  type ViewerState,
} from '../lib/auth';

const state = (overrides: Partial<ViewerState> = {}): ViewerState => ({
  signedIn: true,
  emailConfirmed: true,
  email: 'owner@ikoyirealty.ng',
  hasOrganisation: true,
  ...overrides,
});

describe('destinationFor', () => {
  it('sends an anonymous visitor to sign in', () => {
    expect(destinationFor(state({ signedIn: false }))).toEqual({ kind: 'sign-in' });
  });

  it('holds an unverified account at the confirmation step', () => {
    // An unverified account must not reach organisation creation: the address
    // is how every later notice and receipt reaches them (ORG-2).
    expect(destinationFor(state({ emailConfirmed: false }))).toEqual({
      kind: 'verify-email',
      email: 'owner@ikoyirealty.ng',
    });
  });

  it('checks verification before organisation membership', () => {
    // Order matters: someone unverified with no organisation sees the
    // confirmation step, not the setup form.
    expect(destinationFor(state({ emailConfirmed: false, hasOrganisation: false })).kind).toBe(
      'verify-email',
    );
  });

  it('sends a verified account with no organisation to set one up', () => {
    expect(destinationFor(state({ hasOrganisation: false }))).toEqual({
      kind: 'create-organisation',
    });
  });

  it('sends a complete account to the app', () => {
    expect(destinationFor(state())).toEqual({ kind: 'app', path: '/dashboard' });
    expect(destinationFor(state(), '/properties')).toEqual({ kind: 'app', path: '/properties' });
  });

  it('sanitises the requested path on the way through', () => {
    expect(destinationFor(state(), 'https://evil.test/steal')).toEqual({
      kind: 'app',
      path: '/dashboard',
    });
  });

  it('copes with a signed-in account that has no email on record', () => {
    expect(destinationFor(state({ emailConfirmed: false, email: null }))).toEqual({
      kind: 'verify-email',
      email: '',
    });
  });
});

describe('safeRedirect', () => {
  it('allows a same-origin path', () => {
    expect(safeRedirect('/properties')).toBe('/properties');
    expect(safeRedirect('/settings/people?tab=invited')).toBe('/settings/people?tab=invited');
  });

  it('rejects absolute and protocol-relative URLs', () => {
    // These links arrive from email clients, so the value is
    // attacker-influenced. An unchecked redirect turns every confirmation email
    // into a route to a phishing page.
    for (const bad of [
      'https://evil.test',
      'http://evil.test/x',
      '//evil.test',
      '//evil.test/path',
      'javascript:alert(1)',
      'data:text/html,hi',
      'evil.test',
    ]) {
      expect(safeRedirect(bad), bad).toBe('/dashboard');
    }
  });

  it('rejects backslash variants that some browsers read as absolute', () => {
    for (const bad of ['/\\evil.test', '\\\\evil.test', '/path\\..\\x']) {
      expect(safeRedirect(bad), bad).toBe('/dashboard');
    }
  });

  it('rejects control characters that could split a header', () => {
    // Escape sequences, so no control character appears in this source file.
    expect(safeRedirect('/ok\nSet-Cookie: a=b')).toBe('/dashboard');
    expect(safeRedirect('/ok\r\nLocation: https://evil.test')).toBe('/dashboard');
    // An interior tab is rejected; a trailing one is only whitespace and is
    // trimmed away before the check, leaving a legitimate path.
    expect(safeRedirect('/ok\tmore')).toBe('/dashboard');
    expect(safeRedirect('/ok\u0000')).toBe('/dashboard');
    expect(safeRedirect('/ok\u007f')).toBe('/dashboard');
  });

  it('leaves an ordinary path untouched, trimming surrounding whitespace', () => {
    expect(safeRedirect('/ok')).toBe('/ok');
    expect(safeRedirect('  /ok  ')).toBe('/ok');
    expect(safeRedirect('/ok\t')).toBe('/ok');
  });

  it('falls back for empty, missing and whitespace values', () => {
    expect(safeRedirect(null)).toBe('/dashboard');
    expect(safeRedirect(undefined)).toBe('/dashboard');
    expect(safeRedirect('')).toBe('/dashboard');
    expect(safeRedirect('   ')).toBe('/dashboard');
  });

  it('honours a caller-supplied fallback', () => {
    expect(safeRedirect('https://evil.test', '/sign-in')).toBe('/sign-in');
  });
});

describe('checkPassword', () => {
  it('accepts a long passphrase', () => {
    expect(checkPassword('correct horse battery staple').ok).toBe(true);
  });

  it('requires real length rather than symbol variety', () => {
    // Short-but-complex is weaker than long-and-plain, and demanding symbols
    // produces Password1! everywhere.
    expect(checkPassword('Ab1!xyz').ok).toBe(false);
    expect(checkPassword('Ab1!xyz').problems[0]).toContain(String(MINIMUM_PASSWORD_LENGTH));
    expect(checkPassword('alltheselowercaseletters').ok).toBe(true);
  });

  it('rejects the obvious choices by name', () => {
    expect(checkPassword('mypasswordisgood').ok).toBe(false);
    expect(checkPassword('tenaville2026!!').ok).toBe(false);
  });

  it('rejects a password containing the email local part', () => {
    expect(checkPassword('adaezeadaezeadaeze', 'adaeze@ikoyirealty.ng').ok).toBe(false);
    // A very short local part is not distinctive enough to bother with.
    expect(checkPassword('abalonefishcakes', 'ab@ikoyirealty.ng').ok).toBe(true);
  });

  it('rejects a single repeated character and over-long input', () => {
    expect(checkPassword('aaaaaaaaaaaaaaaa').ok).toBe(false);
    // bcrypt truncates past 72 bytes, so a longer value would only look strong.
    expect(checkPassword('a'.repeat(73) + 'Zq9').ok).toBe(false);
  });

  it('reports every problem at once', () => {
    const result = checkPassword('password', 'password@x.ng');
    expect(result.problems.length).toBeGreaterThanOrEqual(2);
  });
});
