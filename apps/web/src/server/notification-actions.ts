'use server';

import { revalidatePath } from 'next/cache';

import { field } from './form-fields';
import { currentViewer, supabaseForRequest } from './session';
import type { ActionResult } from './auth-actions';

export const markNotificationReadAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };

  const id = field(form, 'notificationId').trim();
  const supabase = await supabaseForRequest();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', viewer.userId)
    .is('read_at', null);

  if (error !== null) return { error: 'Could not mark that notice as read.' };

  revalidatePath('/tenancy/notifications');
  revalidatePath('/tenancy');
  return { message: 'Marked as read.' };
};

export const markAllNotificationsReadAction = async (): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };

  const supabase = await supabaseForRequest();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', viewer.userId)
    .is('read_at', null);

  if (error !== null) return { error: 'Could not mark the notices as read.' };

  revalidatePath('/tenancy/notifications');
  revalidatePath('/tenancy');
  return { message: 'All notices marked as read.' };
};
