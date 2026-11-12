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
  Stat,
  Table,
  TableEmpty,
  Td,
  Th,
  taskPriorityTone,
} from '../../../components/ui';
import {
  GenerateRemindersForm,
  TaskForm,
  TaskStatusForm,
} from '../../../components/forms/task-form';
import { formatDate } from '../../../lib/format';
import { isTaskOverdue, taskQueueSummary } from '../../../lib/comms';
import { todayIso } from '../../../lib/payments';
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

/** The task queue and reminder generation (COMMS-4, RENT-6). */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!STAFF_ROLES.has(viewer.access.role)) {
    return (
      <Card>
        <EmptyState title="You cannot see tasks" description="Tasks belong to agency staff." />
      </Card>
    );
  }

  const params = await searchParams;
  const showDone = params.status === 'done';
  const today = todayIso();
  const supabase = await supabaseForRequest();

  const [{ data: tasks }, { data: memberships }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, notes, owner_user_id, due_on, priority, status, related_type, related_id, created_at')
      .eq('status', showDone ? 'done' : 'open')
      .order('due_on', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('memberships')
      .select('user_id, role')
      .eq('organisation_id', viewer.organisationId)
      .eq('status', 'active'),
  ]);

  const memberRows = (memberships ?? []).filter((member) => STAFF_ROLES.has(member.role));
  const profiles =
    memberRows.length === 0
      ? { data: [] }
      : await supabase
          .from('users')
          .select('id, full_name, email')
          .in(
            'id',
            memberRows.map((member) => member.user_id),
          );

  const nameById = new Map(
    (profiles.data ?? []).map((profile) => [profile.id, profile.full_name ?? profile.email ?? 'Colleague']),
  );

  const rows = tasks ?? [];
  const summary = taskQueueSummary(rows, today);

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Follow-ups the agency owes somebody, including the ones a reminder cannot send."
        action={
          <LinkButton href="/messages" variant="secondary">
            Messages
          </LinkButton>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Open" value={summary.open} />
        <Stat label="Due today" value={summary.dueToday} />
        <Stat label="Overdue" value={summary.overdue} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title={showDone ? 'Completed' : 'Open tasks'}
            description={
              showDone
                ? 'Finished and cancelled work.'
                : 'Overdue first, then by due date.'
            }
            action={
              <Link
                href={showDone ? '/tasks' : '/tasks?status=done'}
                className="text-sm text-info-text underline-offset-2 hover:underline"
              >
                {showDone ? 'Show open' : 'Show completed'}
              </Link>
            }
          />
          <CardBody className="p-0">
            <Table caption="Tasks">
              <thead>
                <tr>
                  <Th>Task</Th>
                  <Th>Owner</Th>
                  <Th>Due</Th>
                  <Th>Priority</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <TableEmpty
                    colSpan={5}
                    message={showDone ? 'Nothing completed yet.' : 'No open tasks.'}
                  />
                ) : (
                  rows.map((task) => {
                    const overdue = isTaskOverdue(task, today);
                    return (
                      <tr key={task.id} className={overdue ? 'bg-warning-soft/40' : undefined}>
                        <Td>
                          {task.title}
                          {task.notes !== null && (
                            <span className="block max-w-md text-xs text-muted">{task.notes}</span>
                          )}
                          {task.related_type !== null && (
                            <span className="block text-xs text-subtle">
                              Related: {task.related_type.replace(/_/g, ' ')}
                            </span>
                          )}
                        </Td>
                        <Td>
                          {task.owner_user_id === null
                            ? 'Unassigned'
                            : (nameById.get(task.owner_user_id) ?? 'Colleague')}
                        </Td>
                        <Td>
                          {task.due_on === null ? '—' : formatDate(task.due_on)}
                          {overdue && <span className="block text-xs text-danger-text">Overdue</span>}
                        </Td>
                        <Td>
                          <Badge tone={taskPriorityTone(task.priority)}>
                            {task.priority}
                          </Badge>
                        </Td>
                        <Td>
                          {task.status === 'open' && <TaskStatusForm taskId={task.id} />}
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Add a task"
              description="For anything a message cannot settle."
            />
            <CardBody>
              <TaskForm
                owners={memberRows.map((member) => ({
                  id: member.user_id,
                  label: nameById.get(member.user_id) ?? 'Colleague',
                }))}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Reminders"
              description="Turn rent due soon and lease end dates into tasks. Running it again creates no duplicates."
            />
            <CardBody>
              <GenerateRemindersForm />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
