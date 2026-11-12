import {
  canTransition,
  isOpenStatus,
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_PAYER_LABELS,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TRANSITIONS,
  MAINTENANCE_URGENCY_LABELS,
  type MaintenanceCategory,
  type MaintenancePayer,
  type MaintenancePriority,
  type MaintenanceStatus,
  type MaintenanceUrgency,
} from '@tenaville/core/maintenance';

import { todayIso } from './payments';

export const maintenanceStatusLabel = (status: string): string =>
  MAINTENANCE_STATUS_LABELS[status as MaintenanceStatus] ?? status.replace(/_/g, ' ');

export const maintenanceCategoryLabel = (category: string): string =>
  MAINTENANCE_CATEGORY_LABELS[category as MaintenanceCategory] ?? category;

export const maintenanceUrgencyLabel = (urgency: string): string =>
  MAINTENANCE_URGENCY_LABELS[urgency as MaintenanceUrgency] ?? urgency;

export const maintenancePriorityLabel = (priority: string): string =>
  MAINTENANCE_PRIORITY_LABELS[priority as MaintenancePriority] ?? priority;

export const maintenancePayerLabel = (payer: string): string =>
  MAINTENANCE_PAYER_LABELS[payer as MaintenancePayer] ?? payer;

export const allowedTransitions = (status: string): readonly MaintenanceStatus[] =>
  isMaintenanceStatus(status) ? MAINTENANCE_TRANSITIONS[status] : [];

const isMaintenanceStatus = (status: string): status is MaintenanceStatus =>
  status in MAINTENANCE_STATUS_LABELS;

export interface MaintenanceQueueRow {
  readonly status: string;
  readonly priority?: string;
  readonly due_on: string | null;
  readonly assignee_user_id?: string | null;
  readonly vendor_id?: string | null;
  readonly is_safety_issue?: boolean;
}

export const isOverdue = (row: MaintenanceQueueRow, today = todayIso()): boolean =>
  row.due_on !== null &&
  isMaintenanceStatus(row.status) &&
  isOpenStatus(row.status) &&
  row.due_on < today;

export const maintenanceQueueStats = (
  rows: readonly MaintenanceQueueRow[],
  today = todayIso(),
): {
  open: number;
  unassigned: number;
  overdue: number;
  awaitingApproval: number;
  safety: number;
} => ({
  open: rows.filter((row) => isMaintenanceStatus(row.status) && isOpenStatus(row.status)).length,
  unassigned: rows.filter(
    (row) =>
      isMaintenanceStatus(row.status) &&
      isOpenStatus(row.status) &&
      (row.assignee_user_id ?? null) === null &&
      (row.vendor_id ?? null) === null,
  ).length,
  overdue: rows.filter((row) => isOverdue(row, today)).length,
  awaitingApproval: rows.filter((row) => row.status === 'awaiting_approval').length,
  safety: rows.filter(
    (row) =>
      row.is_safety_issue === true && isMaintenanceStatus(row.status) && isOpenStatus(row.status),
  ).length,
});

export const maintenanceCostTotalKobo = (
  costs: readonly { readonly amount_kobo: number | string }[],
): bigint => costs.reduce((total, cost) => total + BigInt(cost.amount_kobo), 0n);

export { canTransition };
