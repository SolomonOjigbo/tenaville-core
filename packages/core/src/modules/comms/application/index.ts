import { CHANNEL_FALLBACKS, type ChannelAddresses, type MessageChannel } from '../domain/catalog';

export {
  CHANNEL_FALLBACKS,
  MESSAGE_CHANNELS,
  MESSAGE_CHANNEL_LABELS,
  MESSAGE_PURPOSES,
  MESSAGE_PURPOSE_LABELS,
  MESSAGE_STATUSES,
  MESSAGE_STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TEMPLATE_APPROVAL_LABELS,
  TEMPLATE_APPROVAL_STATUSES,
  reachableChannels,
  type ChannelAddresses,
  type MessageChannel,
  type MessagePurpose,
  type MessageStatus,
  type TaskPriority,
  type TaskStatus,
  type TemplateApprovalStatus,
} from '../domain/catalog';

export {
  renderTemplate,
  templatePlaceholders,
  TEMPLATE_VARIABLES,
  type TemplateVariables,
} from '../domain/template';

export interface ProviderSendInput {
  readonly channel: MessageChannel;
  readonly to: string;
  readonly subject?: string | undefined;
  readonly body: string;
  readonly templateName?: string | undefined;
}

export interface ProviderSendResult {
  readonly status: 'sent' | 'failed';
  readonly provider: string;
  readonly providerMessageId?: string | undefined;
  readonly error?: string | undefined;
  readonly costKobo?: number | undefined;
}

export interface MessagingProvider {
  readonly name: string;
  send(input: ProviderSendInput): Promise<ProviderSendResult>;
}

export interface DeliveryAttempt {
  readonly channel: MessageChannel;
  readonly to: string | null;
  readonly status: 'sent' | 'failed' | 'skipped';
  readonly provider: string;
  readonly providerMessageId?: string | undefined;
  readonly error?: string | undefined;
  readonly costKobo: number;
}

export interface FallbackRequest {
  readonly provider: MessagingProvider;
  readonly primary: MessageChannel;
  readonly addresses: ChannelAddresses;
  readonly subject?: string | undefined;
  readonly body: string;
  readonly templateName?: string | undefined;
}

export interface FallbackResult {
  readonly status: 'sent' | 'failed' | 'skipped';
  readonly attempts: readonly DeliveryAttempt[];
}

/**
 * Try the primary channel then its fallbacks, stopping at the first send.
 *
 * A missing address is a skipped attempt, not a failure: the message log should
 * show why email was never tried. Provider errors move on to the next channel.
 */
export const sendWithFallback = async (request: FallbackRequest): Promise<FallbackResult> => {
  const attempts: DeliveryAttempt[] = [];

  for (const channel of CHANNEL_FALLBACKS[request.primary]) {
    const to = request.addresses[channel] ?? null;
    if (to === null || to.trim() === '') {
      attempts.push({
        channel,
        to: null,
        status: 'skipped',
        provider: 'none',
        error: `No ${channel} address on file`,
        costKobo: 0,
      });
      continue;
    }

    try {
      const result = await request.provider.send({
        channel,
        to,
        ...(request.subject === undefined ? {} : { subject: request.subject }),
        body: request.body,
        ...(request.templateName === undefined ? {} : { templateName: request.templateName }),
      });

      attempts.push({
        channel,
        to,
        status: result.status,
        provider: result.provider,
        ...(result.providerMessageId === undefined
          ? {}
          : { providerMessageId: result.providerMessageId }),
        ...(result.error === undefined ? {} : { error: result.error }),
        costKobo: result.costKobo ?? 0,
      });

      if (result.status === 'sent') return { status: 'sent', attempts };
    } catch (error) {
      attempts.push({
        channel,
        to,
        status: 'failed',
        provider: request.provider.name,
        error: error instanceof Error ? error.message : 'Provider send failed',
        costKobo: 0,
      });
    }
  }

  return {
    status: attempts.some((attempt) => attempt.status === 'failed') ? 'failed' : 'skipped',
    attempts,
  };
};

/**
 * The provider used until WhatsApp/SMS/email credentials are configured.
 *
 * It writes what would have been sent to the message log and reports success,
 * so the workflow, consent checks and fallback order can be exercised without
 * pretending an external message left the building.
 */
export const createLoggingProvider = (): MessagingProvider => ({
  name: 'log',
  send: async (input) => ({
    status: 'sent',
    provider: 'log',
    providerMessageId: `log-${input.channel}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    costKobo: 0,
  }),
});
