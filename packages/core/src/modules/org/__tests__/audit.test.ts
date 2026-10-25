import { describe, expect, it } from 'vitest';

import {
  AUDIT_ACTIONS,
  MissingAuditReasonError,
  assertReasonProvided,
  requiresReason,
} from '../domain/audit';

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

  it('requires a reason for changing where a landlord is paid', () => {
    expect(requiresReason('remittance_details.updated')).toBe(true);
    expect(requiresReason('remittance_details.removed')).toBe(true);
    // Creating the first record is not a redirection of existing instructions.
    expect(requiresReason('remittance_details.created')).toBe(false);
  });

  it('requires a reason for rolling back an import', () => {
    expect(requiresReason('import.rolled_back')).toBe(true);
    expect(requiresReason('import.applied')).toBe(false);
  });

  it('requires a reason for taking access or money away', () => {
    // Removing someone's property assignment, and changing what an agency
    // takes from a landlord's rent, both need an explanation that outlives
    // whoever made the change.
    expect(requiresReason('assignment.removed')).toBe(true);
    expect(requiresReason('management_mandate.updated')).toBe(true);
    expect(requiresReason('lease.status_changed')).toBe(true);
  });

  it('covers the actions the database triggers actually write', () => {
    // A trigger writing an action the catalogue does not know means the
    // reason rules silently do not apply to it.
    for (const action of [
      'lease.created',
      'lease.updated',
      'lease_party.created',
      'lease_deposit.status_changed',
      'assignment.created',
      'document.accessed',
      'management_mandate.updated',
      'organisation.updated',
    ] as const) {
      expect(AUDIT_ACTIONS).toContain(action);
    }
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
