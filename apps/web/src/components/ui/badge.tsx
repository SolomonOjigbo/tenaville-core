import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface2 text-muted',
  info: 'bg-info-soft text-info-text',
  success: 'bg-success-soft text-success-text',
  warning: 'bg-warning-soft text-warning-text',
  danger: 'bg-danger-soft text-danger-text',
};

export const Badge = ({
  tone = 'neutral',
  children,
}: {
  readonly tone?: BadgeTone | undefined;
  readonly children: ReactNode;
}) => (
  <span
    className={clsx(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      TONES[tone],
    )}
  >
    {children}
  </span>
);

/**
 * Tone for a unit status (PROP-3).
 *
 * Vacant is a warning rather than an error: an empty unit is lost rent, not a
 * fault. Inactive is neutral because it is a deliberate choice.
 */
const UNIT_STATUS_TONES: Record<string, BadgeTone> = {
  occupied: 'success',
  vacant: 'warning',
  reserved: 'info',
  under_maintenance: 'info',
  inactive: 'neutral',
};

export const unitStatusTone = (status: string): BadgeTone => UNIT_STATUS_TONES[status] ?? 'neutral';

/** Tone for a lease display status, including the derived expiring_soon. */
const LEASE_STATUS_TONES: Record<string, BadgeTone> = {
  active: 'success',
  expiring_soon: 'warning',
  expired: 'danger',
  terminated: 'neutral',
  renewed: 'info',
  draft: 'neutral',
};

export const leaseStatusTone = (status: string): BadgeTone =>
  LEASE_STATUS_TONES[status] ?? 'neutral';

/**
 * Tone for a payment status.
 *
 * `recorded` is a warning because the money has been entered but not yet
 * reconciled against a bank statement — the state RENT-2 exists to distinguish
 * from `confirmed`. A reversal is neutral: it is a correction with a trail,
 * not a failure.
 */
const PAYMENT_STATUS_TONES: Record<string, BadgeTone> = {
  recorded: 'warning',
  confirmed: 'success',
  reversed: 'neutral',
};

export const paymentStatusTone = (status: string): BadgeTone =>
  PAYMENT_STATUS_TONES[status] ?? 'neutral';

const RECEIPT_STATUS_TONES: Record<string, BadgeTone> = {
  issued: 'success',
  void: 'warning',
  reversed: 'neutral',
};

export const receiptStatusTone = (status: string): BadgeTone =>
  RECEIPT_STATUS_TONES[status] ?? 'neutral';

const STATEMENT_STATUS_TONES: Record<string, BadgeTone> = {
  draft: 'neutral',
  reviewed: 'info',
  issued: 'success',
};

export const statementStatusTone = (status: string): BadgeTone =>
  STATEMENT_STATUS_TONES[status] ?? 'neutral';

/** Maintenance status (MAINT-3). Awaiting approval is a warning, not a failure. */
const MAINTENANCE_STATUS_TONES: Record<string, BadgeTone> = {
  submitted: 'info',
  acknowledged: 'info',
  assigned: 'info',
  in_progress: 'warning',
  on_hold: 'warning',
  awaiting_approval: 'warning',
  completed: 'success',
  rejected: 'danger',
  closed: 'neutral',
};

export const maintenanceStatusTone = (status: string): BadgeTone =>
  MAINTENANCE_STATUS_TONES[status] ?? 'neutral';

const MAINTENANCE_URGENCY_TONES: Record<string, BadgeTone> = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  emergency: 'danger',
};

export const maintenanceUrgencyTone = (urgency: string): BadgeTone =>
  MAINTENANCE_URGENCY_TONES[urgency] ?? 'neutral';

const MAINTENANCE_PRIORITY_TONES: Record<string, BadgeTone> = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  urgent: 'danger',
};

export const maintenancePriorityTone = (priority: string): BadgeTone =>
  MAINTENANCE_PRIORITY_TONES[priority] ?? 'neutral';

const MAINTENANCE_APPROVAL_TONES: Record<string, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export const maintenanceApprovalTone = (status: string): BadgeTone =>
  MAINTENANCE_APPROVAL_TONES[status] ?? 'neutral';

const VENDOR_STATUS_TONES: Record<string, BadgeTone> = {
  active: 'success',
  inactive: 'neutral',
};

export const vendorStatusTone = (status: string): BadgeTone =>
  VENDOR_STATUS_TONES[status] ?? 'neutral';

const MESSAGE_STATUS_TONES: Record<string, BadgeTone> = {
  queued: 'info',
  sent: 'success',
  delivered: 'success',
  failed: 'danger',
  skipped: 'neutral',
};

export const messageStatusTone = (status: string): BadgeTone =>
  MESSAGE_STATUS_TONES[status] ?? 'neutral';

const TEMPLATE_APPROVAL_TONES: Record<string, BadgeTone> = {
  draft: 'neutral',
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export const templateApprovalTone = (status: string): BadgeTone =>
  TEMPLATE_APPROVAL_TONES[status] ?? 'neutral';

const TASK_PRIORITY_TONES: Record<string, BadgeTone> = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  urgent: 'danger',
};

export const taskPriorityTone = (priority: string): BadgeTone =>
  TASK_PRIORITY_TONES[priority] ?? 'neutral';

/** Human label for a status key. */
export const statusLabel = (status: string): string =>
  status.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
