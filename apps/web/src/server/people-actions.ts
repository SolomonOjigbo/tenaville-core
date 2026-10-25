'use server';

import { revalidatePath } from 'next/cache';

import { inviteMember, revokeInvitation, acceptInvitation } from '@tenaville/core/org';
import { createAdminClient } from '@tenaville/db';

import { supabaseForRequest } from './session';
import type { ActionResult } from './auth-actions';

/**
 * Invitation actions (ORG-2, TV-143).
 */

const field = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
};

const siteOrigin = (): string =>
  (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const invitePerson = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const organisationId = field(form, 'organisationId');
  const email = field(form, 'email').trim().toLowerCase();
  const role = field(form, 'role');

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { fieldErrors: { email: 'Enter a valid email address' } };
  }

  const supabase = await supabaseForRequest();

  // The service-role client creates the account and sends the link — the one
  // step an anon-key client cannot do. inviteMember authorises through the
  // caller's own client *before* touching it, so an unauthorised request never
  // reaches the admin API (ADR 0002).
  const admin = createAdminClient('invite a staff member');

  try {
    const { emailSent } = await inviteMember(
      supabase,
      admin,
      // The role is validated by the use case against the app_role enum.
      { organisationId, email, role: role as Parameters<typeof inviteMember>[2]['role'] },
      `${siteOrigin()}/auth/callback?next=/accept-invitation`,
    );

    revalidatePath('/settings/people');
    return {
      message: emailSent
        ? `Invitation sent to ${email}.`
        : `${email} was added. They already had an account, so no new invitation email was sent — ask them to sign in.`,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not send the invitation' };
  }
};

export const revokePersonInvitation = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const membershipId = field(form, 'membershipId');
  const reason = field(form, 'reason').trim();

  const supabase = await supabaseForRequest();

  try {
    await revokeInvitation(supabase, {
      membershipId,
      reason: reason === '' ? 'Withdrawn by an administrator' : reason,
    });
    revalidatePath('/settings/people');
    return { message: 'Invitation withdrawn.' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not withdraw the invitation' };
  }
};

export const acceptOwnInvitation = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const organisationId = field(form, 'organisationId');
  const supabase = await supabaseForRequest();

  try {
    await acceptInvitation(supabase, { organisationId });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not accept the invitation' };
  }

  // Not a redirect() inside the try: redirect throws by design, and catching it
  // would turn a successful acceptance into an error message.
  revalidatePath('/dashboard');
  return { message: 'You have joined the organisation.' };
};
