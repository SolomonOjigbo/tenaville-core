import type { UserClient } from '@tenaville/db';

import { assertReasonProvided } from '../domain/audit.js';
import { changeMemberRoleSchema, type ChangeMemberRoleInput } from '../schema/index.js';

/**
 * Change a member's role (ORG-3, ORG-4, ORG-5).
 *
 * Delegates to `change_membership_role`, because the update and its audit
 * reason must land in one transaction: the audit trigger fires on the update
 * and reads the reason from a transaction-local setting the function supplies.
 * Doing it as two round trips from here would leave the audit row without a
 * reason whenever the second call failed — and an unexplained role change is
 * the thing the requirement exists to prevent.
 *
 * The reason is validated here too, so the caller gets a useful message before
 * a round trip rather than a database error afterwards.
 */
export const changeMemberRole = async (
  client: UserClient,
  input: ChangeMemberRoleInput,
): Promise<void> => {
  const { membershipId, role, reason } = changeMemberRoleSchema.parse(input);

  assertReasonProvided('membership.role_changed', reason);

  const { error } = await client.rpc('change_membership_role', {
    target_membership_id: membershipId,
    new_role: role,
    change_reason: reason,
  });

  if (error !== null) {
    throw new Error(`could not change role: ${error.message}`);
  }
};
