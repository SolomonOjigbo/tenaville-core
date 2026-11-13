import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  LinkButton,
  PageHeader,
  Table,
  TableEmpty,
  Td,
  Th,
} from '../../../../components/ui';
import {
  RevokeAllSessionsForm,
  RevokeOtherSessionsForm,
  RevokeSessionForm,
} from '../../../../components/forms/session-forms';
import { DEVICE_COOKIE, SESSION_IDLE_DAYS } from '../../../../lib/device';
import { formatDateTime } from '../../../../lib/format';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** Devices signed in to this account (ORG-9). */
export default async function SessionsPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  const supabase = await supabaseForRequest();
  const currentKey = (await cookies()).get(DEVICE_COOKIE)?.value;

  const { data: sessions, error } = await supabase
    .from('device_sessions')
    .select('id, device_key, device_label, platform, last_seen_at, revoked_at, created_at')
    .eq('user_id', viewer.userId)
    .order('last_seen_at', { ascending: false });

  const rows = sessions ?? [];
  const active = rows.filter((session) => session.revoked_at === null);

  return (
    <>
      <PageHeader
        title="Devices and sessions"
        description="Where this account is signed in. Revoking a device stops it working at the next request."
        action={
          <LinkButton href="/dashboard" variant="secondary">
            Back to dashboard
          </LinkButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader
            title="Signed-in devices"
            description={`Inactive sessions expire after ${SESSION_IDLE_DAYS} days. Revoking a device closes its access here; the device is signed out at its next request.`}
            action={<Badge tone="info">{active.length} active</Badge>}
          />
          <CardBody className="p-0">
            <Table caption="Signed-in devices">
              <thead>
                <tr>
                  <Th>Device</Th>
                  <Th>Last seen</Th>
                  <Th>Added</Th>
                  <Th>Status</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {error !== null || rows.length === 0 ? (
                  <TableEmpty colSpan={5} message="No devices recorded yet." />
                ) : (
                  rows.map((session) => {
                    const current = session.device_key === currentKey;
                    return (
                      <tr key={session.id}>
                        <Td>
                          {session.device_label ?? 'Unknown browser'}
                          {current && (
                            <span className="ml-2">
                              <Badge tone="success">This device</Badge>
                            </span>
                          )}
                        </Td>
                        <Td>{formatDateTime(session.last_seen_at)}</Td>
                        <Td>{formatDateTime(session.created_at)}</Td>
                        <Td>
                          {session.revoked_at === null ? (
                            <Badge tone="success">Active</Badge>
                          ) : (
                            <Badge tone="neutral">Revoked</Badge>
                          )}
                        </Td>
                        <Td>
                          {session.revoked_at === null ? (
                            <RevokeSessionForm sessionId={session.id} />
                          ) : (
                            '—'
                          )}
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Sign out"
            description="Use this if a device is lost, shared or no longer trusted."
          />
          <CardBody className="space-y-4">
            <RevokeOtherSessionsForm />
            <RevokeAllSessionsForm />
            <p className="text-xs text-muted">
              Signing out everywhere also ends this session and returns you to the sign-in page.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
