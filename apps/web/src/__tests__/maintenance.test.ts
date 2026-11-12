import { describe, expect, it } from 'vitest';

import {
  allowedTransitions,
  isOverdue,
  maintenanceCategoryLabel,
  maintenanceCostTotalKobo,
  maintenanceQueueStats,
  maintenanceStatusLabel,
} from '../lib/maintenance';

describe('maintenance helpers', () => {
  it('marks only open, dated requests past their due date as overdue', () => {
    const today = '2026-11-10';
    expect(isOverdue({ status: 'assigned', due_on: '2026-11-09' }, today)).toBe(true);
    expect(isOverdue({ status: 'assigned', due_on: '2026-11-10' }, today)).toBe(false);
    expect(isOverdue({ status: 'completed', due_on: '2026-11-01' }, today)).toBe(false);
    expect(isOverdue({ status: 'assigned', due_on: null }, today)).toBe(false);
  });

  it('shows the queue at a glance', () => {
    const stats = maintenanceQueueStats(
      [
        { status: 'submitted', due_on: '2026-11-01', is_safety_issue: true },
        { status: 'assigned', due_on: '2026-11-20', assignee_user_id: 'user-1' },
        { status: 'awaiting_approval', due_on: '2026-11-20', vendor_id: 'vendor-1' },
        { status: 'completed', due_on: '2026-11-01' },
        { status: 'closed', due_on: null },
      ],
      '2026-11-10',
    );
    expect(stats).toEqual({
      open: 3,
      unassigned: 1,
      overdue: 1,
      awaitingApproval: 1,
      safety: 1,
    });
  });

  it('totals itemised costs in kobo without floating point', () => {
    expect(maintenanceCostTotalKobo([{ amount_kobo: 1000000 }, { amount_kobo: '250000' }])).toBe(
      1250000n,
    );
  });

  it('labels known values and falls back to the raw key', () => {
    expect(maintenanceStatusLabel('awaiting_approval')).toBe('Awaiting approval');
    expect(maintenanceCategoryLabel('plumbing')).toBe('Plumbing');
    expect(maintenanceStatusLabel('something_new')).toBe('something new');
  });

  it('offers only transitions the database accepts', () => {
    expect(allowedTransitions('submitted')).toEqual(['acknowledged', 'assigned', 'rejected']);
    expect(allowedTransitions('awaiting_approval')).toEqual(['in_progress', 'on_hold']);
    expect(allowedTransitions('closed')).toEqual([]);
  });
});
