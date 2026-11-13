'use client';

import { useActionState } from 'react';

import { Button } from '../ui';
import { FormBanner } from './form-banner';
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '../../server/notification-actions';
import type { ActionResult } from '../../server/auth-actions';

export const MarkNotificationReadForm = ({ id }: { readonly id: string }) => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    markNotificationReadAction,
    {},
  );
  return (
    <form action={action}>
      <FormBanner state={state} />
      <input type="hidden" name="notificationId" value={id} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Mark read'}
      </Button>
    </form>
  );
};

export const MarkAllNotificationsReadForm = () => {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    markAllNotificationsReadAction,
    {},
  );
  return (
    <form action={action} className="space-y-2">
      <FormBanner state={state} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Mark all read'}
      </Button>
    </form>
  );
};
