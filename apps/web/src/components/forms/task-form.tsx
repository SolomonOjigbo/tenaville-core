'use client';

import { useActionState } from 'react';

import { Button, Field, Select, TextInput } from '../ui';
import { FormBanner } from './form-banner';
import {
  completeTaskAction,
  createTaskAction,
  generateRemindersAction,
} from '../../server/comms-actions';
import type { ActionResult } from '../../server/auth-actions';

export interface OwnerOption {
  readonly id: string;
  readonly label: string;
}

const textareaClass =
  'min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-subtle';

/** Create a task with owner, due date and priority (COMMS-4). */
export const TaskForm = ({ owners }: { readonly owners: readonly OwnerOption[] }) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createTaskAction, {});

  return (
    <form action={action} className="space-y-4">
      <FormBanner state={state} />

      <Field id="task-title" label="Task" required error={state.fieldErrors?.title}>
        <TextInput
          id="task-title"
          name="title"
          required
          placeholder="e.g. Call the landlord about the roof"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="task-owner" label="Owner">
          <Select id="task-owner" name="ownerUserId" defaultValue={owners[0]?.id ?? ''}>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="task-due" label="Due">
          <TextInput id="task-due" name="dueOn" type="date" />
        </Field>
        <Field id="task-priority" label="Priority">
          <Select id="task-priority" name="priority" defaultValue="normal">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </Field>
      </div>

      <Field id="task-notes" label="Notes">
        <textarea
          id="task-notes"
          name="notes"
          className={textareaClass}
          placeholder="Context for whoever picks it up"
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add task'}
      </Button>
    </form>
  );
};

/** Complete or cancel a task (COMMS-4). */
export const TaskStatusForm = ({ taskId }: { readonly taskId: string }) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(completeTaskAction, {});

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <FormBanner state={state} />
      <input type="hidden" name="taskId" value={taskId} />
      <Button type="submit" name="status" value="done" variant="secondary" disabled={pending}>
        Done
      </Button>
      <Button type="submit" name="status" value="cancelled" variant="secondary" disabled={pending}>
        Cancel
      </Button>
    </form>
  );
};

/** Generate reminder tasks from rent and lease dates (RENT-6). */
export const GenerateRemindersForm = () => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    async () => generateRemindersAction(),
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <FormBanner state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Checking…' : 'Generate reminders'}
      </Button>
    </form>
  );
};
