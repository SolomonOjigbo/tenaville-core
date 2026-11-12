'use server';

import { revalidatePath } from 'next/cache';

import {
  createLoggingProvider,
  reachableChannels,
  renderTemplate,
  sendWithFallback,
  type MessageChannel,
} from '@tenaville/core/comms';

import { errorMessage, fieldErrorsFrom } from '../lib/form-errors';
import { checked, field, optionalField } from './form-fields';
import { currentViewer, supabaseForRequest } from './session';
import type { ActionResult } from './auth-actions';

/**
 * Communications and tasks (COMMS-1 … COMMS-8).
 *
 * A send is two steps by design: the message row is written first, then the
 * provider is called, then each attempt is recorded. A crash between the steps
 * leaves a `queued` message — visible in the log — rather than silence.
 *
 * Consent is checked here and recorded in the database. A marketing message
 * without opt-in is refused; an operational tenancy message is not consent
 * gated, which is the distinction COMMS-6 draws.
 */

const refreshComms = (): void => {
  revalidatePath('/messages');
  revalidatePath('/tasks');
  revalidatePath('/tenancy');
};

const channelFrom = (value: string): MessageChannel =>
  value === 'sms' || value === 'email' ? value : 'whatsapp';

export const sendMessageAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.isStaff) return { error: 'Only staff can send messages.' };

  const templateId = field(form, 'templateId').trim();
  const recipientUserId = field(form, 'recipientUserId').trim();
  const purpose = field(form, 'purpose') === 'marketing' ? 'marketing' : 'operational';

  if (templateId === '') return { error: 'Choose a template first.' };
  if (recipientUserId === '') return { error: 'Choose who the message is for.' };

  const supabase = await supabaseForRequest();

  const { data: template, error: templateError } = await supabase
    .from('message_templates')
    .select(
      'id, key, name, channel, subject, body, whatsapp_template_name, approval_status, active',
    )
    .eq('id', templateId)
    .maybeSingle();

  if (templateError !== null || template === null) {
    return { error: 'That template could not be found, or is not yours to use.' };
  }
  if (!template.active) return { error: 'That template is inactive.' };

  const { data: recipient, error: recipientError } = await supabase
    .from('users')
    .select('id, full_name, email, phone')
    .eq('id', recipientUserId)
    .maybeSingle();

  if (recipientError !== null || recipient === null) {
    return { error: 'That person could not be found.' };
  }

  const addresses = {
    whatsapp: recipient.phone,
    sms: recipient.phone,
    email: recipient.email,
  };
  const reachable = reachableChannels(channelFrom(template.channel), addresses);
  if (reachable.length === 0) {
    return { error: 'There is no usable phone number or email for that person.' };
  }

  if (purpose === 'marketing') {
    const { data: consent } = await supabase
      .from('notification_preferences')
      .select('opted_in')
      .eq('organisation_id', viewer.organisationId)
      .eq('user_id', recipientUserId)
      .eq('purpose', 'marketing')
      .eq('channel', channelFrom(template.channel))
      .maybeSingle();

    if (consent === null || !consent.opted_in) {
      return { error: 'That person has not opted in to marketing messages on this channel.' };
    }
  }

  const body = renderTemplate(template.body, {
    recipient_name: recipient.full_name ?? 'there',
    organisation_name: viewer.organisationName,
    date: new Date().toISOString().slice(0, 10),
  });

  const subject =
    template.subject === null
      ? undefined
      : renderTemplate(template.subject, {
          recipient_name: recipient.full_name ?? 'there',
          organisation_name: viewer.organisationName,
        });

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      organisation_id: viewer.organisationId,
      channel: channelFrom(template.channel),
      purpose,
      template_id: template.id,
      recipient_type: 'other',
      recipient_user_id: recipientUserId,
      recipient_name: recipient.full_name ?? recipient.email ?? 'Recipient',
      recipient_address: addresses[channelFrom(template.channel)] ?? addresses.email ?? '',
      subject: subject ?? null,
      body,
      related_type: optionalField(form, 'relatedType') ?? null,
      created_by: viewer.userId,
    })
    .select('id')
    .single();

  if (error !== null || message === null) {
    return { error: errorMessage(error, 'Could not log the message') };
  }

  const result = await sendWithFallback({
    provider: createLoggingProvider(),
    primary: channelFrom(template.channel),
    addresses,
    ...(subject === undefined ? {} : { subject }),
    body,
    ...(template.whatsapp_template_name === null
      ? {}
      : { templateName: template.whatsapp_template_name }),
  });

  for (const attempt of result.attempts) {
    await supabase.rpc('record_message_result', {
      p_message_id: message.id,
      p_channel: attempt.channel,
      p_status: attempt.status,
      p_provider: attempt.provider,
      ...(attempt.providerMessageId === undefined
        ? {}
        : { p_provider_message_id: attempt.providerMessageId }),
      ...(attempt.error === undefined ? {} : { p_error: attempt.error }),
      p_cost_kobo: attempt.costKobo,
    });
  }

  refreshComms();

  if (result.status === 'sent') {
    const delivered = result.attempts.find((attempt) => attempt.status === 'sent');
    return {
      message: `Sent by ${delivered?.channel ?? template.channel}.`,
    };
  }
  return { error: 'Every channel failed. The attempts are recorded in the log.' };
};

export const createTaskAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.isStaff) return { error: 'Only staff have a task queue.' };

  const title = field(form, 'title').trim();
  if (title.length < 2) return { fieldErrors: { title: 'Give the task a title' } };

  const supabase = await supabaseForRequest();
  const { error } = await supabase.from('tasks').insert({
    organisation_id: viewer.organisationId,
    title,
    notes: optionalField(form, 'notes') ?? null,
    owner_user_id: optionalField(form, 'ownerUserId') ?? viewer.userId,
    due_on: optionalField(form, 'dueOn') ?? null,
    priority: (field(form, 'priority') || 'normal') as 'low' | 'normal' | 'high' | 'urgent',
    created_by: viewer.userId,
  });

  if (error !== null) return { error: errorMessage(error, 'Could not create the task') };

  refreshComms();
  return { message: 'Task added.' };
};

export const completeTaskAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.isStaff) return { error: 'Only staff have a task queue.' };

  const taskId = field(form, 'taskId').trim();
  if (taskId === '') return { error: 'The task is missing.' };

  const supabase = await supabaseForRequest();
  const { error } = await supabase
    .from('tasks')
    .update({
      status: field(form, 'status') === 'cancelled' ? 'cancelled' : 'done',
      completed_at: new Date().toISOString(),
      completed_by: viewer.userId,
    })
    .eq('id', taskId);

  if (error !== null) return { error: errorMessage(error, 'Could not update the task') };

  refreshComms();
  return { message: 'Task updated.' };
};

export const generateRemindersAction = async (): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.isStaff) return { error: 'Only staff can generate reminders.' };

  const supabase = await supabaseForRequest();
  const { data, error } = await supabase.rpc('generate_reminder_tasks', {
    p_organisation_id: viewer.organisationId,
  });

  if (error !== null) return { error: errorMessage(error, 'Could not generate reminders') };

  refreshComms();
  const created = typeof data === 'number' ? data : 0;
  return {
    message: created === 0 ? 'No new reminders were needed.' : `${created} reminder tasks created.`,
  };
};

export const saveTemplateAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('org.update')) {
    return { error: 'Only an owner or administrator can edit templates.' };
  }

  const templateId = field(form, 'templateId').trim();
  const body = field(form, 'body').trim();
  if (templateId === '') return { error: 'The template is missing.' };
  if (body.length < 5) return { fieldErrors: { body: 'Write the message first' } };

  const supabase = await supabaseForRequest();
  const { error } = await supabase
    .from('message_templates')
    .update({
      name: field(form, 'name').trim(),
      subject: optionalField(form, 'subject') ?? null,
      body,
      active: checked(form, 'active'),
    })
    .eq('id', templateId);

  if (error !== null) return { error: errorMessage(error, 'Could not save the template') };

  refreshComms();
  return { message: 'Template saved.' };
};

export const updateNotificationPreferenceAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };

  const channel = channelFrom(field(form, 'channel'));
  const purpose = field(form, 'purpose') === 'marketing' ? 'marketing' : 'operational';
  const optedIn = checked(form, 'optedIn');

  const supabase = await supabaseForRequest();
  const { error } = await supabase.from('notification_preferences').upsert(
    {
      organisation_id: viewer.organisationId,
      user_id: viewer.userId,
      purpose,
      channel,
      opted_in: optedIn,
    },
    { onConflict: 'organisation_id,user_id,purpose,channel' },
  );

  if (error !== null) {
    const fieldErrors = fieldErrorsFrom(error);
    if (fieldErrors !== null) return { fieldErrors };
    return { error: errorMessage(error, 'Could not save the preference') };
  }

  refreshComms();
  return { message: optedIn ? 'Notifications enabled.' : 'Notifications turned off.' };
};
