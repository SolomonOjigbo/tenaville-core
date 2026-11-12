/**
 * Display helpers for communications (COMMS-1, COMMS-8).
 */
import {
  MESSAGE_CHANNEL_LABELS,
  MESSAGE_STATUS_LABELS,
  MESSAGE_PURPOSE_LABELS,
  TEMPLATE_APPROVAL_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type MessageChannel,
  type MessagePurpose,
  type MessageStatus,
  type TaskPriority,
  type TaskStatus,
  type TemplateApprovalStatus,
} from '@tenaville/core/comms';

export const messageChannelLabel = (channel: string): string =>
  MESSAGE_CHANNEL_LABELS[channel as MessageChannel] ?? channel;

export const messageStatusLabel = (status: string): string =>
  MESSAGE_STATUS_LABELS[status as MessageStatus] ?? status;

export const messagePurposeLabel = (purpose: string): string =>
  MESSAGE_PURPOSE_LABELS[purpose as MessagePurpose] ?? purpose;

export const templateApprovalLabel = (status: string): string =>
  TEMPLATE_APPROVAL_LABELS[status as TemplateApprovalStatus] ?? status;

export const taskPriorityLabel = (priority: string): string =>
  TASK_PRIORITY_LABELS[priority as TaskPriority] ?? priority;

export const taskStatusLabel = (status: string): string =>
  TASK_STATUS_LABELS[status as TaskStatus] ?? status;

export interface TaskRow {
  readonly status: string;
  readonly due_on: string | null;
  readonly priority?: string;
}

export const isTaskOverdue = (task: TaskRow, today: string): boolean =>
  task.status === 'open' && task.due_on !== null && task.due_on < today;

export const taskQueueSummary = (
  tasks: readonly TaskRow[],
  today: string,
): { open: number; overdue: number; dueToday: number } => ({
  open: tasks.filter((task) => task.status === 'open').length,
  overdue: tasks.filter((task) => isTaskOverdue(task, today)).length,
  dueToday: tasks.filter((task) => task.status === 'open' && task.due_on === today).length,
});
