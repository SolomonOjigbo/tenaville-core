import { redirect } from 'next/navigation';

import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
} from '../../../../components/ui';
import { ReminderSettingsForm } from '../../../../components/forms/reminder-settings-form';
import { formatDateTime } from '../../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** Alert thresholds and the last scheduled dispatch runs (LEASE-6, RENT-6). */
export default async function ReminderSettingsPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('org.update')) {
    return (
      <Card>
        <EmptyState
          title="You cannot change reminder settings"
          description="Only an owner or administrator can."
          action={
            <LinkButton href="/settings" variant="secondary">
              Back to settings
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const [{ data: organisation }, { data: runs }] = await Promise.all([
    supabase
      .from('organisations')
      .select('lease_alert_days, rent_reminder_days')
      .eq('id', viewer.organisationId)
      .maybeSingle(),
    supabase
      .from('reminder_runs')
      .select('id, source, tasks_created, ran_at')
      .eq('organisation_id', viewer.organisationId)
      .order('ran_at', { ascending: false })
      .limit(10),
  ]);

  return (
    <>
      <PageHeader
        title="Reminder settings"
        description="Lease expiry thresholds and the daily scheduler that turns dates into tasks and queued tenant messages."
        action={
          <LinkButton href="/settings" variant="secondary">
            Back to settings
          </LinkButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader
            title="Alert thresholds"
            description="A lease alert is created on the exact day each threshold is reached. The scheduler runs daily at 06:00 Africa/Lagos."
          />
          <CardBody>
            {organisation === null ? (
              <p className="text-sm text-muted">Could not load the organisation settings.</p>
            ) : (
              <ReminderSettingsForm
                leaseAlertDays={organisation.lease_alert_days}
                rentReminderDays={organisation.rent_reminder_days}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent runs"
            description="Manual and scheduled dispatches. Tenant messages are queued where a phone or email exists."
          />
          <CardBody className="space-y-3">
            {(runs ?? []).length === 0 ? (
              <p className="text-sm text-muted">No reminder runs yet.</p>
            ) : (
              (runs ?? []).map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between gap-3 border-b border-border pb-2 text-sm last:border-0"
                >
                  <span>
                    {formatDateTime(run.ran_at)}
                    <span className="block text-xs text-subtle">{run.source}</span>
                  </span>
                  <span className="text-text">{run.tasks_created} tasks</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
