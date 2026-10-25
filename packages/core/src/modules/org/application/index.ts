/**
 * The org module's public surface. Other modules, route handlers and server
 * components call these; nothing else in this directory tree is importable
 * from outside (enforced by the ESLint boundary rule in @tenaville/config).
 */
export { createOrganisation } from './create-organisation';
export { changeMemberRole } from './change-member-role';
export { resolveAccess, type Access } from './resolve-access';
export {
  inviteMember,
  acceptInvitation,
  revokeInvitation,
  listPendingInvitations,
  type PendingInvitation,
} from './invitations';

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
} from '../domain/roles';

export {
  AUDIT_ACTIONS,
  requiresReason,
  assertReasonProvided,
  MissingAuditReasonError,
  type AuditAction,
} from '../domain/audit';

export {
  createOrganisationSchema,
  inviteMemberSchema,
  changeMemberRoleSchema,
  revokeSessionSchema,
  revokeInvitationSchema,
  acceptInvitationSchema,
  appRoleSchema,
  organisationTypeSchema,
  type CreateOrganisationInput,
  type InviteMemberInput,
  type ChangeMemberRoleInput,
  type RevokeSessionInput,
  type RevokeInvitationInput,
  type AcceptInvitationInput,
} from '../schema/index';
