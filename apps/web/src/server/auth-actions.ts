'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { createOrganisation } from '@tenaville/core/org';

import { RESET_REQUESTED_MESSAGE, checkPassword, safeRedirect } from '../lib/auth';
import { supabaseForRequest } from './session';

/**
 * Server actions for the authentication flows (ORG-1, ORG-2).
 *
 * All of them run on the server so the anon key is the only credential the
 * browser ever holds, and so validation cannot be skipped by posting directly.
 *
 * Each returns a plain object rather than throwing: these drive forms, and a
 * thrown error in a server action becomes an opaque "something went wrong"
 * rather than a message naming the field to fix.
 */

export interface ActionResult {
  readonly error?: string;
  readonly message?: string;
  readonly fieldErrors?: Readonly<Record<string, string>>;
}

const siteUrl = async (): Promise<string> => {
  // The configured URL wins; the request host is the fallback so local
  // development and a preview deployment both work without extra config.
  const configured = process.env.APP_URL;
  if (configured !== undefined && configured !== '') return configured.replace(/\/$/, '');
  const host = (await headers()).get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
};

/**
 * One text field from a submitted form.
 *
 * `FormData.get` returns `string | File`. Calling `.toString()` on a File
 * yields "[object Object]", so a file posted to the email field would be
 * accepted as a nonsense address rather than rejected. Anything that is not a
 * string becomes the empty string and fails the validation below.
 */
const field = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
};

const readEmail = (form: FormData): string => field(form, 'email').trim().toLowerCase();

export const signUp = async (_previous: ActionResult, form: FormData): Promise<ActionResult> => {
  const email = readEmail(form);
  const password = field(form, 'password');
  const fullName = field(form, 'fullName').trim();

  const fieldErrors: Record<string, string> = {};
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fieldErrors.email = 'Enter a valid email address';
  }
  if (fullName.length < 2) fieldErrors.fullName = 'Enter your full name';

  const password_ = checkPassword(password, email);
  if (!password_.ok) fieldErrors.password = password_.problems.join('. ');

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await supabaseForRequest();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=/create-organisation`,
      data: { full_name: fullName },
    },
  });

  if (error !== null) {
    // Supabase does not reveal whether an address is already registered when
    // confirmations are on, and neither do we: it would turn signup into an
    // account enumeration tool.
    return { error: 'Could not create the account. Check the details and try again.' };
  }

  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
};

export const signIn = async (_previous: ActionResult, form: FormData): Promise<ActionResult> => {
  const email = readEmail(form);
  const password = field(form, 'password');
  const next = safeRedirect(field(form, 'next'));

  if (email === '' || password === '') {
    return { error: 'Enter your email address and password' };
  }

  const supabase = await supabaseForRequest();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error !== null) {
    // One message for a wrong password and an unknown address alike. Naming
    // which was wrong tells an attacker which half to keep.
    return { error: 'Those details do not match an account.' };
  }

  redirect(next);
};

export const requestPasswordReset = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const email = readEmail(form);
  if (email === '') return { fieldErrors: { email: 'Enter your email address' } };

  const supabase = await supabaseForRequest();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/reset-password`,
  });

  // The same answer either way, and the error is deliberately discarded: see
  // RESET_REQUESTED_MESSAGE.
  return { message: RESET_REQUESTED_MESSAGE };
};

export const updatePassword = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const password = field(form, 'password');
  const confirmation = field(form, 'confirmPassword');

  if (password !== confirmation) {
    return { fieldErrors: { confirmPassword: 'The two passwords do not match' } };
  }
  const check = checkPassword(password);
  if (!check.ok) return { fieldErrors: { password: check.problems.join('. ') } };

  const supabase = await supabaseForRequest();

  // The recovery link established a session in the callback; without one this
  // would silently do nothing.
  const { data } = await supabase.auth.getUser();
  if (data.user === null) {
    return { error: 'That reset link has expired. Request a new one.' };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error !== null) return { error: 'Could not update the password. Try again.' };

  redirect('/dashboard');
};

export const createOrganisationAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const name = field(form, 'name').trim();
  const type = field(form, 'type') || 'agency';
  const ownerFullName = field(form, 'ownerFullName').trim();

  if (type !== 'agency' && type !== 'individual_landlord') {
    return { error: 'Choose an account type' };
  }

  const supabase = await supabaseForRequest();

  try {
    await createOrganisation(supabase, {
      name,
      type,
      ...(ownerFullName === '' ? {} : { ownerFullName }),
    });
  } catch (error) {
    // The use case validates with zod, so a message here is usually about the
    // name. Surfaced on the field rather than as a banner.
    const message = error instanceof Error ? error.message : 'Could not create the organisation';
    return { fieldErrors: { name: message } };
  }

  redirect('/dashboard');
};
