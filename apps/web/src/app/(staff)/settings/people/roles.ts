/**
 * Re-exports for the people screen.
 *
 * The role catalogue and the invitation use cases live in @tenaville/core/org;
 * this keeps the page's imports short and in one place.
 */
export { APP_ROLES, canAssignRole, listPendingInvitations } from '@tenaville/core/org';

/** A role key as a person would read it: `property_manager` to "Property manager". */
export const statusLabelFor = (role: string): string =>
  role.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
