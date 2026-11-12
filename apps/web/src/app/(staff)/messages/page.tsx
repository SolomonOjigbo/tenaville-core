import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  Money,
  PageHeader,
  Stat,
  Table,
  TableEmpty,
  Td,
  Th,
  messageStatusTone,
  statusLabel,
} from '../../../components/ui';
import { SendMessageForm } from '../../../components/forms/send-message-form';
import { formatDateTime } from '../../../lib/format';
import { messageChannelLabel } from '../../../lib/comms';
import { currentViewer, supabaseForRequest } from '../../../server/session';

const STAFF_ROLES = new Set([
  'owner',
  'admin',
  'property_manager',
  'letting_agent',
  'caretaker',
  'maintenance_coordinator',
  'accountant',
]);

/** The message log and the send form (COMMS-2, COMMS-3, COMMS-8). */
export default async function MessagesPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!STAFF_ROLES.has(viewer.access.role)) {
    return (
      <Card>
        <EmptyState
          title="You cannot send messages"
          description="Messages are sent by agency staff."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const [{ data: messages }, { data: templates }, { data: memberships }] = await Promise.all([
    supabase
      .from('messages')
      .select(
        'id, channel, sent_channel, purpose, status, recipient_name, recipient_address, subject, cost_kobo, error, sent_at, created_at, template:message_templates(key, channel)',
      )
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('message_templates')
      .select('id, key, name, channel, approval_status')
      .eq('active', true)
      .order('key')
      .order('channel'),
    supabase
      .from('memberships')
      .select('user_id, role')
      .eq('organisation_id', viewer.organisationId)
      .eq('status', 'active'),
  ]);

  const memberIds = (memberships ?? []).map((member) => member.user_id);
  const profiles =
    memberIds.length === 0
      ? { data: [] }
      : await supabase.from('users').select('id, full_name, email, phone').in('id', memberIds);

  const recipients = (profiles.data ?? [])
    .filter((profile) => profile.email !== null || profile.phone !== null)
    .map((profile) => ({
      id: profile.id,
      label: `${profile.full_name ?? profile.email ?? 'Person'}${profile.email === null ? '' : ` · ${profile.email}`}`,
    }));

  const rows = messages ?? [];
  const sent = rows.filter((row) => row.status === 'sent' || row.status === 'delivered').length;
  const failed = rows.filter((row) => row.status === 'failed').length;
  const cost = rows.reduce((total, row) => total + BigInt(row.cost_kobo), 0n);

  const templateOptions = (templates ?? []).map((template) => ({
    id: template.id,
    label: `${template.name} · ${messageChannelLabel(template.channel)}`,
    channel: template.channel,
    approved: template.approval_status === 'approved',
  }));

  return (
    <>
      <PageHeader
        title="Messages"
        description="Every message goes through the log, including the channels that failed."
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/tasks" variant="secondary">
              Tasks
            </LinkButton>
            <LinkButton href="/messages/templates" variant="secondary">
              Templates
            </LinkButton>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Sent" value={sent} hint="Last 50 messages" />
        <Stat label="Failed" value={failed} hint="Every channel failed" />
        <Stat label="Message cost" value={<Money kobo={cost.toString()} />} hint="Where a provider reports it" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader
            title="Send a message"
            description="Uses the template's channel, then falls back to SMS and email."
          />
          <CardBody>
            {templateOptions.length === 0 || recipients.length === 0 ? (
              <p className="text-sm text-subtle">
                A message needs an active template and someone with a phone number or email.
              </p>
            ) : (
              <SendMessageForm templates={templateOptions} recipients={recipients} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Log" description="Newest first." />
          <CardBody className="p-0">
            <Table caption="Message log">
              <thead>
                <tr>
                  <Th>Recipient</Th>
                  <Th>Channel</Th>
                  <Th>Status</Th>
                  <Th>Sent</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <TableEmpty colSpan={4} message="No messages yet." />
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <Td>
                        {row.recipient_name}
                        <span className="block text-xs text-subtle">{row.recipient_address}</span>
                        {row.template !== null && (
                          <span className="block text-xs text-muted">
                            {row.template.key.replace(/_/g, ' ')}
                          </span>
                        )}
                      </Td>
                      <Td>
                        {messageChannelLabel(row.sent_channel ?? row.channel)}
                        {row.sent_channel !== null && row.sent_channel !== row.channel && (
                          <span className="block text-xs text-warning-text">fell back</span>
                        )}
                      </Td>
                      <Td>
                        <Badge tone={messageStatusTone(row.status)}>
                          {statusLabel(row.status)}
                        </Badge>
                        {row.error !== null && (
                          <span className="block max-w-xs truncate text-xs text-danger-text">
                            {row.error}
                          </span>
                        )}
                      </Td>
                      <Td>
                        {row.sent_at === null ? '—' : formatDateTime(row.sent_at)}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      </div>

      <p className="mt-4 text-xs text-subtle">
        WhatsApp templates stay unapproved until the provider approves them.{' '}
        <Link href="/messages/templates" className="text-info-text underline-offset-2 hover:underline">
          Review approval status
        </Link>
        .
      </p>
    </>
  );
}
