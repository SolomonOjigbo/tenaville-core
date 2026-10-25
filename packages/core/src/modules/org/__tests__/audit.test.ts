import { describe, expect, it } from 'vitest';

import {
  AUDIT_ACTIONS,
  MissingAuditReasonError,
  assertReasonProvided,
  requiresReason,
} from '../domain/audit.js';

describe('audit actions', () => {
  it('matches the database action key format', () => {
    // audit_events has a check constraint of ^[a-z_]+\.[a-z_]+$; an action that
    // fails it would be rejected at write time rather than here.
    for (const action of AUDIT_ACTIONS) {
      expect(action, `${action} does not match the database constraint`).toMatch(
        /^[a-z_]+\.[a-z_]+$/,
      );
    }
  });

  it('requires a reason for actions that remove access or move authority', () => {
    expect(requiresReason('membership.role_changed')).toBe(true);
    expect(requiresReason('membership.status_changed')).toBe(true);
    expect(requiresReason('membership.removed')).toBe(true);
    expect(requiresReason('session.revoked')).toBe(true);
  });

  it('does not demand a reason for ordinary creation', () => {
    expect(requiresReason('organisation.created')).toBe(false);
    expect(requiresReason('membership.created')).toBe(false);
  });

  it('rejects missing, empty and whitespace-only reasons', () => {
    for (const reason of [undefined, null, '', '   ', '\n\t']) {
      expect(() => assertReasonProvided('membership.role_changed', reason)).toThrow(
        MissingAuditReasonError,
      );
    }
  });

  it('accepts a real reason', () => {
    expect(() =>
      assertReasonProvided('membership.role_changed', 'Took over the Ikeja portfolio'),
    ).not.toThrow();
  });

  it('ignores a reason where none is required', () => {
    expect(() => assertReasonProvided('organisation.created', undefined)).not.toThrow();
  });
});
