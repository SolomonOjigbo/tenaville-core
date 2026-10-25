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
  readonly tone?: BadgeTone;
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

/** Human label for a status key. */
export const statusLabel = (status: string): string =>
  status.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
