import type { AdminClient, AppRole, UserClient } from '@tenaville/db';

import { canAssignRole, isStaff } from '../domain/roles';
import {
  acceptInvitationSchema,
  inviteMemberSchema,
  revokeInvitationSchema,
  type AcceptInvitationInput,
  type InviteMemberInput,
  type RevokeInvitationInput,
} from '../schema/index';
import { resolveAccess } from './resolve-access';

/**
 * Staff invitations (ORG-2, TV-143).
 *
 * An agency starts with one owner. Without this they stay that way, so this is
 * the difference between a product one person can try and one an agency can
 * actually run.
 */

export interface PendingInvitation {
  readonly membershipId: string;
  readonly email: string | null;
  readonly role: AppRole;
  readonly invitedAt: string | null;
}

/**
 * Invite someone to the organisation.
 *
 * The order here is deliberate, and it is the reason this is not two lines:
 *
 *  1. Authorise through the caller's own client, so RLS and the permission
 *     catalogue both apply before anything else happens.
 *  2. Create the auth account with the admin client. This is the one step that
 *     genuinely needs the service-role key — only an admin API can create a
 *     user and send them a link — and it happens *after* authorisation, never
 *     before (ADR 0002).
 *  3. Insert the membership as the caller again, so the memberships policy and
 *     the owner-assignment trigger decide whether this role may be given.
 *
 * Doing step 2 first would let an unauthorised caller create accounts.
 *
 * @param admin - service-role client, used only to create the account and send
 *   the invitation email.
 */
export const inviteMember = async (
  client: UserClient,
  admin: AdminClient,
  input: InviteMemberInput,
  redirectTo: string,
): Promise<{ membershipId: string; emailSent: boolean }> => {
  const parsed = inviteMemberSchema.parse(input);

  const access = await resolveAccess(client, parsed.organisationId);
  if (access === null) throw new Error('organisation not found');
  if (!access.can('org.member.invite')) {
    throw new Error('not permitted to invite people');
  }
  if (!canAssignRole(access.role, parsed.role)) {
    throw new Error(`a ${access.role} may not invite a ${parsed.role}`);
  }
  if (!isStaff(parsed.role) && parsed.role !== 'landlord' && parsed.role !== 'tenant') {
    throw new Error(`${parsed.role} is not a role that can be invited`);
  }

  // Creates the account if it is new, or returns the existing one. Either way
  // the invitee receives a link.
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.email,
    { redirectTo },
  );

  let userId = invited?.user?.id;
  const emailSent = inviteError === null;

  if (inviteError !== null) {
    // The usual cause is an address that already has an account, which is a
    // normal case: an existing user joining a second organisation. Find them
    // rather than failing.
    const { data: existing } = await admin.auth.admin.listUsers();
    userId = existing?.users.find((u) => u.email?.toLowerCase() === parsed.email)?.id;
    if (userId === undefined) {
      throw new Error('could not create or find an account for that address');
    }
  }
  if (userId === undefined) throw new Error('the invitation did not return an account');

  const { data: membership, error } = await client
    .from('memberships')
    .insert({
      organisation_id: parsed.organisationId,
      user_id: userId,
      role: parsed.role,
      status: 'invited',
      invited_by: access.userId,
      invited_at: new Date().toISOString(),
      ...(parsed.branchId === undefined ? {} : { branch_id: parsed.branchId }),
    })
    .select('id')
    .single();

  if (error !== null) {
    // A unique violation means they are already a member or already invited.
    if (error.code === '23505') {
      throw new Error('that person is already a member of this organisation');
    }
    throw new Error(`could not create the invitation: ${error.message}`);
  }

  return { membershipId: membership.id, emailSent };
};

/**
 * Accept an invitation (ORG-2).
 *
 * Delegates to `accept_invitation`, which moves the caller's own membership
 * from invited to active and nothing else. A policy could not express that:
 * policies choose rows, not columns, so a policy permissive enough to let an
 * invitee accept would also let them change the role they were offered.
 */
export const acceptInvitation = async (
  client: UserClient,
  input: AcceptInvitationInput,
): Promise<void> => {
  const parsed = acceptInvitationSchema.parse(input);

  const { error } = await client.rpc('accept_invitation', {
    target_organisation_id: parsed.organisationId,
  });

  if (error !== null) {
    throw new Error('that invitation is no longer available');
  }
};

/**
 * Withdraw a pending invitation.
 *
 * Deletes the membership rather than suspending it, because nothing has
 * happened yet — there is no history to preserve, unlike a member who has been
 * working in the organisation. The audit trigger records the removal, and the
 * reason travels with it.
 */
export const revokeInvitation = async (
  client: UserClient,
  input: RevokeInvitationInput,
): Promise<void> => {
  const parsed = revokeInvitationSchema.parse(input);

  const { data: membership, error: readError } = await client
    .from('memberships')
    .select('id, status')
    .eq('id', parsed.membershipId)
    .maybeSingle();

  if (readError !== null) throw new Error(`could not read the invitation: ${readError.message}`);
  if (membership === null) throw new Error('invitation not found');
  if (membership.status !== 'invited') {
    // Removing an active member is a different act with different
    // consequences, and it is not this function.
    throw new Error('that person has already accepted; remove them instead');
  }

  const { error } = await client.from('memberships').delete().eq('id', parsed.membershipId);
  if (error !== null) throw new Error(`could not revoke the invitation: ${error.message}`);
};

/** Pending invitations for the people screen. */
export const listPendingInvitations = async (
  client: UserClient,
  organisationId: string,
): Promise<readonly PendingInvitation[]> => {
  const { data, error } = await client
    .from('memberships')
    .select('id, user_id, role, invited_at')
    .eq('organisation_id', organisationId)
    .eq('status', 'invited')
    .order('invited_at', { ascending: false });

  if (error !== null) throw new Error(`could not list invitations: ${error.message}`);
  const rows = data ?? [];
  if (rows.length === 0) return [];

  // Two queries rather than an embed: memberships.user_id references
  // auth.users, so PostgREST has no foreign key to follow into public.users
  // and cannot join them for us.
  const { data: profiles, error: profileError } = await client
    .from('users')
    .select('id, email')
    .in(
      'id',
      rows.map((r) => r.user_id),
    );

  if (profileError !== null) {
    throw new Error(`could not read invited accounts: ${profileError.message}`);
  }

  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  return rows.map((row) => ({
    membershipId: row.id,
    // Null when the invitee has no profile row yet, which is the normal state
    // before they accept.
    email: emailById.get(row.user_id) ?? null,
    role: row.role,
    invitedAt: row.invited_at,
  }));
};
