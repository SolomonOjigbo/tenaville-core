/**
 * Authentication helpers that do not touch the network.
 *
 * Kept separate so the rules can be tested without a running auth service:
 * where a user is sent after signing in, which redirects are safe to follow,
 * and what a password must satisfy.
 */

/** Where a signed-in user belongs, given what we know about them. */
export type Destination =
  | { readonly kind: 'sign-in' }
  | { readonly kind: 'verify-email'; readonly email: string }
  | { readonly kind: 'create-organisation' }
  | { readonly kind: 'app'; readonly path: string };

export interface ViewerState {
  readonly signedIn: boolean;
  readonly emailConfirmed: boolean;
  readonly email: string | null;
  readonly hasOrganisation: boolean;
}

/**
 * Resolve where to send someone.
 *
 * One function rather than a chain of redirects scattered across layouts, so
 * the order is visible and testable: an unverified account must not reach the
 * organisation-creation step, and a verified account with no organisation must
 * not land on a dashboard that would show nothing.
 */
export const destinationFor = (state: ViewerState, requestedPath = '/dashboard'): Destination => {
  if (!state.signedIn) return { kind: 'sign-in' };
  if (!state.emailConfirmed) {
    return { kind: 'verify-email', email: state.email ?? '' };
  }
  if (!state.hasOrganisation) return { kind: 'create-organisation' };
  return { kind: 'app', path: safeRedirect(requestedPath) };
};

/**
 * Reduce a redirect target to something safe to follow.
 *
 * Only same-origin absolute paths. An unchecked `?next=` is an open redirect:
 * a link that looks like Tenaville and lands on someone else's sign-in page is
 * how a staff password gets phished, and the agency's rent ledger sits behind
 * that password.
 *
 * Protocol-relative URLs (`//evil.test`) and backslash variants are rejected
 * explicitly, because both are read as absolute by some browsers.
 */
export const safeRedirect = (
  target: string | null | undefined,
  fallback = '/dashboard',
): string => {
  if (target === null || target === undefined) return fallback;
  const trimmed = target.trim();
  if (trimmed === '') return fallback;
  // A single leading slash, followed by something that is not a slash or a
  // backslash.
  if (!/^\/(?![/\\])/.test(trimmed)) return fallback;
  if (trimmed.includes('\\')) return fallback;
  // Control characters can split a header or smuggle a second URL. Checked by
  // code point rather than a regex, so no control character appears in source.
  for (const character of trimmed) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return fallback;
  }
  return trimmed;
};

export interface PasswordCheck {
  readonly ok: boolean;
  readonly problems: readonly string[];
}

/**
 * Password rules.
 *
 * Length first, because length is what actually resists guessing. No character
 * class requirements: they push people towards `Password1!` and a predictable
 * shape, and NIST has advised against them for years. The obvious choices are
 * rejected by name instead.
 */
export const MINIMUM_PASSWORD_LENGTH = 12;

const OBVIOUS = [
  'password',
  'passw0rd',
  'tenaville',
  '12345678',
  'qwertyui',
  'letmein',
  'iloveyou',
];

export const checkPassword = (password: string, email?: string): PasswordCheck => {
  const problems: string[] = [];

  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    problems.push(`Use at least ${MINIMUM_PASSWORD_LENGTH} characters`);
  }
  if (password.length > 72) {
    // bcrypt silently truncates beyond 72 bytes, so anything longer would give
    // a false sense of strength.
    problems.push('Use 72 characters or fewer');
  }
  const lower = password.toLowerCase();
  if (OBVIOUS.some((word) => lower.includes(word))) {
    problems.push('Avoid common words like "password" or the product name');
  }
  if (email !== undefined && email !== '') {
    const localPart = email.split('@')[0]?.toLowerCase() ?? '';
    if (localPart.length >= 3 && lower.includes(localPart)) {
      problems.push('Do not use your email address in your password');
    }
  }
  if (/^(.)\1+$/.test(password)) {
    problems.push('Do not repeat a single character');
  }

  return { ok: problems.length === 0, problems };
};

/**
 * The message shown after a password reset request.
 *
 * Deliberately identical whether or not the address has an account. Telling an
 * attacker which addresses are registered turns a reset form into an account
 * enumeration tool, and agency staff emails are easy to guess.
 */
export const RESET_REQUESTED_MESSAGE =
  'If that email address has an account, a reset link is on its way. Check your inbox and your spam folder.';
