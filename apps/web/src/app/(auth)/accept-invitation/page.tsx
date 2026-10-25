import { redirect } from 'next/navigation';

import { AcceptInvitationForm } from '../../../components/people/accept-invitation-form';
import { Card, CardBody } from '../../../components/ui';
import { supabaseForRequest } from '../../../server/session';

/**
 * Where an invitation link lands (ORG-2).
 *
 * The invitee can see the organisation's name and nothing else about it until
 * they accept — a policy added with this ticket, because the usual
 * organisation policy counts only *active* memberships and would have shown
 * them an unnamed invitation.
 */
export default async function AcceptInvitationPage() {
  const supabase = await supabaseForRequest();

  const { data: auth } = await supabase.auth.getUser();
  if (auth.user === null) redirect('/sign-in');

  const { data: pending } = await supabase
    .from('memberships')
    .select('organisation_id, role')
    .eq('status', 'invited')
    .limit(1);

  const invitation = pending?.[0];

  if (invitation === undefined) {
    return (
      <Card>
        <CardBody className="space-y-3">
          <h1 className="font-display text-xl text-text">No pending invitation</h1>
          <p className="text-sm text-muted">
            This invitation may have been withdrawn, or you may have accepted it already.
          </p>
          <a href="/dashboard" className="text-sm text-primary underline">
            Continue
          </a>
        </CardBody>
      </Card>
    );
  }

  const { data: organisation } = await supabase
    .from('organisations')
    .select('name')
    .eq('id', invitation.organisation_id)
    .maybeSingle();

  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <h1 className="font-display text-xl text-text">You have been invited</h1>
          <p className="mt-1 text-sm text-muted">
            {organisation?.name ?? 'An organisation'} has invited you to join as{' '}
            {invitation.role.replace(/_/g, ' ')}.
          </p>
        </div>

        <AcceptInvitationForm
          organisationId={invitation.organisation_id}
          organisationName={organisation?.name ?? 'the organisation'}
        />
      </CardBody>
    </Card>
  );
}
