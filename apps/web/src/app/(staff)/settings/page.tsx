import { redirect } from 'next/navigation';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  statusLabel,
} from '../../../components/ui';
import { formatDate } from '../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../server/session';

/**
 * Organisation settings.
 *
 * The landing page for the admin area: who we are, and the two settings screens
 * that exist. It deliberately does not offer an organisation editor yet —
 * renaming an organisation is immutable in the audit trail and belongs with the
 * rest of ORG-6 rather than as a half-screen here.
 */
export default async function SettingsPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('org.update')) {
    return (
      <Card>
        <EmptyState
          title="You cannot change organisation settings"
          description="Only an owner or administrator can. People and plan details you can see are under their own links."
          action={
            <LinkButton href="/dashboard" variant="secondary">
              Back to dashboard
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();

  const { data: organisation } = await supabase
    .from('organisations')
    .select('name, type, country_code, timezone, receipt_prefix, created_at')
    .eq('id', viewer.organisationId)
    .maybeSingle();

  return (
    <>
      <PageHeader
        title="Settings"
        description="How this organisation is configured, and who can work in it."
      />

      <Card className="mb-6">
        <CardHeader
          title="Organisation"
          description="Used on receipts, statements and every date the system records."
        />
        <CardBody>
          {organisation === null ? (
            <p className="text-sm text-muted">Could not load the organisation details.</p>
          ) : (
            <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-subtle">Name</dt>
                <dd className="mt-0.5 text-text">{organisation.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-subtle">Type</dt>
                <dd className="mt-0.5">
                  <Badge tone="info">{statusLabel(organisation.type)}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-subtle">Timezone</dt>
                <dd className="mt-0.5 text-text">{organisation.timezone}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-subtle">Country</dt>
                <dd className="mt-0.5 text-text">{organisation.country_code}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-subtle">Receipt prefix</dt>
                <dd className="mt-0.5 text-text">
                  {organisation.receipt_prefix}
                  <span className="block text-xs text-muted">
                    Locked once the first receipt is issued.
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-subtle">Created</dt>
                <dd className="mt-0.5 text-text">
                  {formatDate(organisation.created_at.slice(0, 10))}
                </dd>
              </div>
            </dl>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {viewer.access.can('org.member.invite') && (
          <Card>
            <CardHeader title="People" description="Who can sign in, and with which role." />
            <CardBody>
              <LinkButton href="/settings/people" variant="secondary">
                Manage people
              </LinkButton>
            </CardBody>
          </Card>
        )}
        {viewer.access.can('org.billing.read') && (
          <Card>
            <CardHeader
              title="Plan and limits"
              description="Entitlements and usage against them."
            />
            <CardBody>
              <LinkButton href="/settings/plan" variant="secondary">
                View plan
              </LinkButton>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
