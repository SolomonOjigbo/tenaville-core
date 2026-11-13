'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { DEVICE_COOKIE } from '../lib/device';
import { field } from './form-fields';
import { currentViewer, supabaseForRequest } from './session';
import type { ActionResult } from './auth-actions';

const currentDeviceKey = async (): Promise<string | undefined> =>
  (await cookies()).get(DEVICE_COOKIE)?.value;

export const revokeSessionAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };

  const sessionId = field(form, 'sessionId').trim();
  const key = await currentDeviceKey();
  const supabase = await supabaseForRequest();

  const { data: target } = await supabase
    .from('device_sessions')
    .select('id, device_key')
    .eq('id', sessionId)
    .eq('user_id', viewer.userId)
    .maybeSingle();

  if (target === null) return { error: 'That session could not be found.' };

  const { error } = await supabase
    .from('device_sessions')
    .update({ revoked_at: new Date().toISOString(), revoked_by: viewer.userId })
    .eq('id', target.id)
    .eq('user_id', viewer.userId);

  if (error !== null) return { error: 'Could not revoke that session.' };

  if (target.device_key !== null && target.device_key === key) {
    await supabase.auth.signOut();
    redirect('/sign-in?error=session-revoked');
  }

  revalidatePath('/settings/sessions');
  return { message: 'Device signed out.' };
};

export const revokeOtherSessionsAction = async (): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };

  const key = await currentDeviceKey();
  const supabase = await supabaseForRequest();
  const revokedAt = new Date().toISOString();

  let query = supabase
    .from('device_sessions')
    .update({ revoked_at: revokedAt, revoked_by: viewer.userId })
    .eq('user_id', viewer.userId)
    .is('revoked_at', null);

  if (key !== undefined) query = query.neq('device_key', key);

  const { error } = await query;
  if (error !== null) return { error: 'Could not sign out the other devices.' };

  revalidatePath('/settings/sessions');
  return { message: 'Other devices signed out.' };
};

export const revokeAllSessionsAction = async (): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };

  const supabase = await supabaseForRequest();
  const { error } = await supabase
    .from('device_sessions')
    .update({ revoked_at: new Date().toISOString(), revoked_by: viewer.userId })
    .eq('user_id', viewer.userId)
    .is('revoked_at', null);

  if (error !== null) return { error: 'Could not sign out everywhere.' };

  await supabase.auth.signOut();
  redirect('/sign-in?error=session-revoked');
};
