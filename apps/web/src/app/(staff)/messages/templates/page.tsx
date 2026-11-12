import { redirect } from 'next/navigation';

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
  statusLabel,
  templateApprovalTone,
} from '../../../../components/ui';
import { TemplateForm } from '../../../../components/forms/template-form';
import { messageChannelLabel } from '../../../../lib/comms';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

const STAFF_ROLES = new Set([
  'owner',
  'admin',
  'property_manager',
  'letting_agent',
  'caretaker',
  'maintenance_coordinator',
  'accountant',
]);

/** Message templates and their approval state (COMMS-1, COMMS-8). */
export default async function TemplatesPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!STAFF_ROLES.has(viewer.access.role)) {
    return (
      <Card>
        <EmptyState title="You cannot see templates" description="Templates belong to agency staff." />
      </Card>
    );
  }

  const canEdit = viewer.access.can('org.update');
  const supabase = await supabaseForRequest();
  const { data } = await supabase
    .from('message_templates')
    .select('id, key, name, channel, subject, body, approval_status, whatsapp_template_name, active')
    .order('key')
    .order('channel');

  const templates = data ?? [];
  const byKey = new Map<string, typeof templates>();
  for (const template of templates) {
    const list = byKey.get(template.key) ?? [];
    list.push(template);
    byKey.set(template.key, list);
  }

  return (
    <>
      <PageHeader
        title="Templates"
        description="WhatsApp needs an approved template before a business-initiated message can use it."
        action={
          <LinkButton href="/messages" variant="secondary">
            Back to messages
          </LinkButton>
        }
      />

      <Card className="mb-6">
        <CardHeader title="Coverage" />
        <CardBody className="p-0">
          <Table caption="Templates">
            <thead>
              <tr>
                <Th>Template</Th>
                <Th>Channel</Th>
                <Th>Approval</Th>
                <Th>Active</Th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <TableEmpty colSpan={4} message="No templates yet." />
              ) : (
                templates.map((template) => (
                  <tr key={template.id}>
                    <Td>
                      {template.name}
                      <span className="block text-xs text-subtle">{template.key}</span>
                    </Td>
                    <Td>{messageChannelLabel(template.channel)}</Td>
                    <Td>
                      <Badge tone={templateApprovalTone(template.approval_status)}>
                        {statusLabel(template.approval_status)}
                      </Badge>
                      {template.whatsapp_template_name !== null && (
                        <span className="block text-xs text-subtle">
                          {template.whatsapp_template_name}
                        </span>
                      )}
                    </Td>
                    <Td>{template.active ? 'Yes' : 'No'}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      {canEdit ? (
        <div className="space-y-6">
          {[...byKey.entries()].map(([key, group]) => (
            <Card key={key}>
              <CardHeader title={group[0]?.name ?? key} description={`Fields: ${key}`} />
              <CardBody className="grid gap-6 lg:grid-cols-3">
                {group.map((template) => (
                  <TemplateForm
                    key={template.id}
                    template={{
                      id: template.id,
                      name: template.name,
                      channel: template.channel,
                      subject: template.subject,
                      body: template.body,
                      active: template.active,
                    }}
                  />
                ))}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-subtle">Only an owner or administrator can edit templates.</p>
      )}
    </>
  );
}
