import { redirect } from 'next/navigation';

import { APP_ROLES, canAssignRole, listPendingInvitations, statusLabelFor } from './roles';
import { fetchUsageWarnings } from '@tenaville/core/billing';

import { UsageNotice } from '../../../../components/billing/usage-notice';
import { InviteForm } from '../../../../components/people/invite-form';
import { RevokeButton } from '../../../../components/people/revoke-button';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  Table,
  TableEmpty,
  Td,
  Th,
  statusLabel,
} from '../../../../components/ui';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/**
 * People and pending invitations (ORG-2, ORG-3, TV-143).
 *
 * An agency starts with one owner. This is where it stops being one.
 */
export default async function PeoplePage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  // The nav already hides this page from roles that cannot invite, but a
  // typed URL is not the nav — the check belongs here too.
  if (!viewer.access.can('org.member.invite')) {
    return (
      <Card>
        <EmptyState
          title="You cannot manage people"
          description="Only an owner or an administrator can invite colleagues and change roles."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();

  // Seats are the limit this page runs into, so the prompt belongs here rather
  // than only in settings: an agency at 3 of 3 users should learn it before
  // typing a colleague's address, not after the invitation is refused
  // (BILL-3 §3.7).
  const [{ data: members }, invitations, warnings] = await Promise.all([
    supabase
      .from('memberships')
      .select('id, user_id, role, status, accepted_at')
      .eq('organisation_id', viewer.organisationId)
      .in('status', ['active', 'suspended'])
      .order('role'),
    listPendingInvitations(supabase, viewer.organisationId),
    fetchUsageWarnings(supabase, viewer.organisationId),
  ]);

  const memberRows = members ?? [];
  const profiles =
    memberRows.length === 0
      ? { data: [] }
      : await supabase
          .from('users')
          .select('id, email, full_name')
          .in(
            'id',
            memberRows.map((m) => m.user_id),
          );
  const profileById = new Map((profiles.data ?? []).map((p) => [p.id, p]));

  const assignableRoles = APP_ROLES.filter((role) => canAssignRole(viewer.access.role, role)).map(
    (role) => ({ value: role, label: statusLabelFor(role) }),
  );

  return (
    <>
      <PageHeader
        title="People"
        description="Who can work in this organisation, and what they can reach."
      />

      <UsageNotice warnings={warnings} only="users" />

      <Card className="mb-6">
        <CardHeader
          title="Invite a colleague"
          description="They receive a link, choose a password and join with the role you pick."
        />
        <CardBody>
          <InviteForm organisationId={viewer.organisationId} assignableRoles={assignableRoles} />
        </CardBody>
      </Card>

      {invitations.length > 0 && (
        <Card className="mb-6">
          <CardHeader
            title="Pending invitations"
            description="Sent, but not yet accepted."
            action={<Badge tone="warning">{invitations.length} pending</Badge>}
          />
          <CardBody className="p-0">
            <Table caption="Pending invitations">
              <thead>
                <tr>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Invited</Th>
                  <Th>{''}</Th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.membershipId}>
                    <Td>{invitation.email ?? 'Not yet registered'}</Td>
                    <Td>
                      <Badge tone="info">{statusLabel(invitation.role)}</Badge>
                    </Td>
                    <Td>{invitation.invitedAt?.slice(0, 10) ?? '—'}</Td>
                    <Td>
                      <RevokeButton membershipId={invitation.membershipId} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Members" description="People who have accepted and can sign in." />
        <CardBody className="p-0">
          <Table caption="Organisation members">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {memberRows.length === 0 ? (
                <TableEmpty colSpan={4} message="No members yet." />
              ) : (
                memberRows.map((member) => {
                  const profile = profileById.get(member.user_id);
                  return (
                    <tr key={member.id}>
                      <Td>{profile?.full_name ?? '—'}</Td>
                      <Td>{profile?.email ?? '—'}</Td>
                      <Td>
                        <Badge tone="info">{statusLabel(member.role)}</Badge>
                      </Td>
                      <Td>
                        <Badge tone={member.status === 'active' ? 'success' : 'neutral'}>
                          {statusLabel(member.status)}
                        </Badge>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
