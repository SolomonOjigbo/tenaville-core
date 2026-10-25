/**
 * The org module's public surface. Other modules, route handlers and server
 * components call these; nothing else in this directory tree is importable
 * from outside (enforced by the ESLint boundary rule in @tenaville/config).
 */
export { createOrganisation } from './create-organisation.js';
export { changeMemberRole } from './change-member-role.js';
export { resolveAccess, type Access } from './resolve-access.js';

export {
  can,
  isAdmin,
  isStaff,
  canAssignRole,
  permissionsFor,
  PERMISSIONS,
  APP_ROLES,
  STAFF_ROLES,
  ADMIN_ROLES,
  type Permission,
} from '../domain/roles.js';

export {
  AUDIT_ACTIONS,
  requiresReason,
  assertReasonProvided,
  MissingAuditReasonError,
  type AuditAction,
} from '../domain/audit.js';

export {
  createOrganisationSchema,
  inviteMemberSchema,
  changeMemberRoleSchema,
  revokeSessionSchema,
  appRoleSchema,
  organisationTypeSchema,
  type CreateOrganisationInput,
  type InviteMemberInput,
  type ChangeMemberRoleInput,
  type RevokeSessionInput,
} from '../schema/index.js';
