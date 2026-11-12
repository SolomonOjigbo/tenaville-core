import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  TableEmpty,
  Td,
  Th,
  messageStatusTone,
  statusLabel,
} from '../../../../components/ui';
import { NotificationPreferenceForm } from '../../../../components/forms/notification-preference-form';
import { formatDateTime } from '../../../../lib/format';
import { messageChannelLabel } from '../../../../lib/comms';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** Messages the agency has sent this tenant, and their preferences (COMMS-3, COMMS-6, TENANT-7). */
export default async function TenantMessagesPage() {
  const viewer = await currentViewer();
  if (!viewer?.access.can('self.tenancy.read')) {
    return (
      <Card>
        <EmptyState
          title="No message access"
          description="This area is for tenants. Ask the agency to link your account to your tenancy."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const [{ data: messages }, { data: preferences }] = await Promise.all([
    supabase
      .from('messages')
      .select('id, channel, sent_channel, status, subject, body, created_at, sent_at, template:message_templates(key)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('notification_preferences')
      .select('channel, purpose, opted_in')
      .eq('user_id', viewer.userId),
  ]);

  const rows = messages ?? [];

  return (
    <>
      <PageHeader
        title="Messages"
        description="What the agency has sent you, and how you prefer to be contacted."
        action={
          <LinkButton href="/tenancy" variant="secondary">
            Back to tenancy
          </LinkButton>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="From the agency" description="Newest first." />
          <CardBody className="p-0">
            <Table caption="Messages">
              <thead>
                <tr>
                  <Th>Message</Th>
                  <Th>Channel</Th>
                  <Th>Status</Th>
                  <Th>Sent</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <TableEmpty colSpan={4} message="Nothing yet." />
                ) : (
                  rows.map((message) => (
                    <tr key={message.id}>
                      <Td>
                        <span className="text-text">
                          {message.subject ?? message.template?.key.replace(/_/g, ' ') ?? 'Message'}
                        </span>
                        <span className="block max-w-md whitespace-pre-line text-xs text-muted">
                          {message.body}
                        </span>
                      </Td>
                      <Td>{messageChannelLabel(message.sent_channel ?? message.channel)}</Td>
                      <Td>
                        <Badge tone={messageStatusTone(message.status)}>
                          {statusLabel(message.status)}
                        </Badge>
                      </Td>
                      <Td>
                        {message.sent_at === null
                          ? '—'
                          : formatDateTime(message.sent_at)}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="How you hear from us"
            description="Operational messages cover your tenancy. Marketing messages need your permission."
          />
          <CardBody>
            <NotificationPreferenceForm
              preferences={(preferences ?? []).map((preference) => ({
                channel: preference.channel,
                purpose: preference.purpose,
                optedIn: preference.opted_in,
              }))}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
