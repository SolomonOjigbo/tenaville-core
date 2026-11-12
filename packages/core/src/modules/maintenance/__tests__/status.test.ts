import { describe, expect, it } from 'vitest';

import {
  canTransition,
  isOpenStatus,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TRANSITIONS,
} from '../domain/status';

describe('maintenance workflow', () => {
  it('allows the documented forward path', () => {
    expect(canTransition('submitted', 'assigned')).toBe(true);
    expect(canTransition('assigned', 'in_progress')).toBe(true);
    expect(canTransition('in_progress', 'completed')).toBe(true);
    expect(canTransition('completed', 'closed')).toBe(true);
  });

  it('does not let a new request jump straight to completed', () => {
    expect(canTransition('submitted', 'completed')).toBe(false);
    expect(canTransition('acknowledged', 'completed')).toBe(false);
    expect(canTransition('closed', 'in_progress')).toBe(false);
  });

  it('requires the approval gate between awaiting approval and completion', () => {
    expect(canTransition('awaiting_approval', 'completed')).toBe(false);
    expect(canTransition('awaiting_approval', 'in_progress')).toBe(true);
  });

  it('lets a tenant reopen through the completed-to-in-progress edge', () => {
    expect(canTransition('completed', 'in_progress')).toBe(true);
  });

  it('never lists a transition to a status it does not know', () => {
    for (const status of MAINTENANCE_STATUSES) {
      for (const to of MAINTENANCE_TRANSITIONS[status]) {
        expect(MAINTENANCE_STATUSES, `${status} → ${to}`).toContain(to);
      }
      expect(MAINTENANCE_TRANSITIONS[status]).not.toContain(status);
    }
  });

  it('treats completed, rejected and closed as finished', () => {
    expect(isOpenStatus('completed')).toBe(false);
    expect(isOpenStatus('rejected')).toBe(false);
    expect(isOpenStatus('closed')).toBe(false);
    expect(isOpenStatus('awaiting_approval')).toBe(true);
  });
});
