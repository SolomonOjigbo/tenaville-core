/**
 * Audit action catalogue (ORG-5, PRD §10.7).
 *
 * The database records actor, time and before/after. What it cannot decide is
 * which actions are sensitive enough to *require* a stated reason — that is a
 * product judgement, so it lives here and is enforced before the write.
 *
 * Action keys are `area.event`, matching the database's check constraint.
 */

export const AUDIT_ACTIONS = [
  'organisation.created',
  'organisation.updated',
  'membership.created',
  'membership.removed',
  'membership.role_changed',
  'membership.status_changed',
  'assignment.created',
  'assignment.removed',
  'session.revoked',
  'subscription.changed',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * Actions that must carry a reason.
 *
 * Each of these takes something away from someone, or changes who holds
 * authority. "Why" is the question asked months later in a dispute, and it
 * cannot be reconstructed from before/after values alone.
 */
const REASON_REQUIRED: readonly AuditAction[] = [
  'membership.role_changed',
  'membership.status_changed',
  'membership.removed',
  'session.revoked',
];

export const requiresReason = (action: AuditAction): boolean => REASON_REQUIRED.includes(action);

export class MissingAuditReasonError extends Error {
  constructor(public readonly action: AuditAction) {
    super(`${action} requires a reason (PRD §10.7)`);
    this.name = 'MissingAuditReasonError';
  }
}

/** Throws unless a sensitive action carries a non-empty reason. */
export const assertReasonProvided = (
  action: AuditAction,
  reason: string | null | undefined,
): void => {
  if (requiresReason(action) && (reason === null || reason === undefined || reason.trim() === '')) {
    throw new MissingAuditReasonError(action);
  }
};
