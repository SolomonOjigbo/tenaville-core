export const MESSAGE_CHANNELS = ['whatsapp', 'sms', 'email'] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export const MESSAGE_CHANNEL_LABELS: Record<MessageChannel, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Email',
};

/**
 * Fallback order is explicit (COMMS-8). WhatsApp is the channel agencies
 * prefer; when it is unavailable or unapproved, SMS is the next-best reachable
 * channel, with email last.
 */
export const CHANNEL_FALLBACKS: Record<MessageChannel, readonly MessageChannel[]> = {
  whatsapp: ['whatsapp', 'sms', 'email'],
  sms: ['sms', 'email'],
  email: ['email'],
};

export const MESSAGE_STATUSES = ['queued', 'sent', 'delivered', 'failed', 'skipped'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  queued: 'Queued',
  sent: 'Sent',
  delivered: 'Delivered',
  failed: 'Failed',
  skipped: 'Skipped',
};

export const MESSAGE_PURPOSES = ['operational', 'marketing'] as const;
export type MessagePurpose = (typeof MESSAGE_PURPOSES)[number];

export const MESSAGE_PURPOSE_LABELS: Record<MessagePurpose, string> = {
  operational: 'Operational',
  marketing: 'Marketing',
};

export const TEMPLATE_APPROVAL_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
] as const;
export type TemplateApprovalStatus = (typeof TEMPLATE_APPROVAL_STATUSES)[number];

export const TEMPLATE_APPROVAL_LABELS: Record<TemplateApprovalStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export const TASK_STATUSES = ['open', 'done', 'cancelled'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Open',
  done: 'Done',
  cancelled: 'Cancelled',
};

export interface ChannelAddresses {
  readonly whatsapp?: string | null;
  readonly sms?: string | null;
  readonly email?: string | null;
}

/** Channels that have something to send to, in fallback order. */
export const reachableChannels = (
  primary: MessageChannel,
  addresses: ChannelAddresses,
): readonly MessageChannel[] =>
  CHANNEL_FALLBACKS[primary].filter((channel) => {
    const address = addresses[channel];
    return typeof address === 'string' && address.trim() !== '';
  });
