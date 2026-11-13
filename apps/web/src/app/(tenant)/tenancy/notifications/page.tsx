import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
} from '../../../../components/ui';
import {
  MarkAllNotificationsReadForm,
  MarkNotificationReadForm,
} from '../../../../components/forms/notification-forms';
import { formatDateTime } from '../../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** In-app notices for a tenant (MAINT-12). */
export default async function TenantNotificationsPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('self.tenancy.read')) {
    return (
      <Card>
        <EmptyState
          title="No notifications"
          description="This area is for tenants."
          action={
            <LinkButton href="/tenancy" variant="secondary">
              Back to tenancy
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, kind, title, body, related_type, related_id, read_at, created_at')
    .eq('user_id', viewer.userId)
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = notifications ?? [];
  const unread = rows.filter((notification) => notification.read_at === null).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Repair updates, deposit settlements and tenancy notices."
        action={
          <LinkButton href="/tenancy" variant="secondary">
            Back to tenancy
          </LinkButton>
        }
      />

      <Card>
        <CardHeader
          title="Recent notices"
          description="You see notices addressed to this account only."
          action={
            <div className="flex items-center gap-2">
              <Badge tone={unread === 0 ? 'neutral' : 'info'}>{unread} unread</Badge>
              {unread > 0 && <MarkAllNotificationsReadForm />}
            </div>
          }
        />
        <CardBody>
          {rows.length === 0 ? (
            <EmptyState
              title="Nothing yet"
              description="Updates about your tenancy and repairs will appear here."
            />
          ) : (
            <ul className="space-y-3">
              {rows.map((notification) => (
                <li
                  key={notification.id}
                  className={
                    notification.read_at === null
                      ? 'rounded-md border border-border bg-info-soft px-4 py-3'
                      : 'rounded-md border border-border px-4 py-3'
                  }
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">{notification.title}</p>
                      <p className="mt-1 text-sm text-muted">{notification.body}</p>
                      <p className="mt-2 text-xs text-subtle">
                        {formatDateTime(notification.created_at)}
                        {notification.related_type === 'maintenance_request' &&
                          notification.related_id !== null && (
                            <>
                              {' · '}
                              <Link
                                href={`/tenancy/maintenance/${notification.related_id}`}
                                className="text-info-text underline-offset-2 hover:underline"
                              >
                                Open repair
                              </Link>
                            </>
                          )}
                        {notification.related_type === 'lease' && <> · Tenancy notice</>}
                      </p>
                    </div>
                    {notification.read_at === null && (
                      <MarkNotificationReadForm id={notification.id} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
