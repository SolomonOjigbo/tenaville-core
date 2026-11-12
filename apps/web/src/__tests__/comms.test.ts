import { describe, expect, it } from 'vitest';

import {
  isTaskOverdue,
  messageChannelLabel,
  messageStatusLabel,
  taskPriorityLabel,
  taskQueueSummary,
  templateApprovalLabel,
} from '../lib/comms';

describe('comms helpers', () => {
  it('labels channels, statuses and approval states', () => {
    expect(messageChannelLabel('whatsapp')).toBe('WhatsApp');
    expect(messageStatusLabel('failed')).toBe('Failed');
    expect(templateApprovalLabel('pending_approval')).toBe('Pending approval');
    expect(taskPriorityLabel('urgent')).toBe('Urgent');
  });

  it('falls back to the raw key for an unknown value', () => {
    expect(messageChannelLabel('carrier_pigeon')).toBe('carrier_pigeon');
  });

  it('counts overdue and due-today open tasks only', () => {
    const today = '2026-11-12';
    const tasks = [
      { status: 'open', due_on: '2026-11-10' },
      { status: 'open', due_on: today },
      { status: 'open', due_on: '2026-11-20' },
      { status: 'open', due_on: null },
      { status: 'done', due_on: '2026-11-01' },
    ];

    expect(taskQueueSummary(tasks, today)).toEqual({ open: 4, overdue: 1, dueToday: 1 });
    expect(isTaskOverdue(tasks[0]!, today)).toBe(true);
    expect(isTaskOverdue(tasks[4]!, today)).toBe(false);
  });
});
