import type { AppRole, UserClient } from '@tenaville/db';

import { can, isAdmin, isStaff, type Permission } from '../domain/roles.js';

export interface Access {
  readonly userId: string;
  readonly organisationId: string;
  readonly role: AppRole;
  readonly branchId: string | null;
  readonly can: (permission: Permission) => boolean;
  readonly isStaff: boolean;
  readonly isAdmin: boolean;
}

/**
 * Resolve what the calling user may do in one organisation (ORG-4).
 *
 * The membership is read through the user's own client, so RLS decides whether
 * they can see it at all. A caller who names an organisation they do not belong
 * to gets no rows, and this returns null — the same answer as for an
 * organisation that does not exist, which is deliberate: distinguishing the two
 * would confirm the existence of another tenant's organisation.
 */
export const resolveAccess = async (
  client: UserClient,
  organisationId: string,
): Promise<Access | null> => {
  const { data, error } = await client
    .from('memberships')
    .select('user_id, organisation_id, role, branch_id')
    .eq('organisation_id', organisationId)
    .eq('status', 'active')
    .maybeSingle();

  if (error !== null) {
    throw new Error(`could not resolve access: ${error.message}`);
  }
  if (data === null) {
    return null;
  }

  const role = data.role;
  return {
    userId: data.user_id,
    organisationId: data.organisation_id,
    role,
    branchId: data.branch_id,
    can: (permission: Permission) => can(role, permission),
    isStaff: isStaff(role),
    isAdmin: isAdmin(role),
  };
};
