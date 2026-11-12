import { describe, expect, it, vi } from 'vitest';

import { CHANNEL_FALLBACKS, reachableChannels, type ChannelAddresses } from '../domain/catalog';
import { renderTemplate, templatePlaceholders } from '../domain/template';
import {
  createLoggingProvider,
  sendWithFallback,
  type MessagingProvider,
  type ProviderSendResult,
} from '../application';

describe('channels', () => {
  it('falls back WhatsApp to SMS then email', () => {
    expect(CHANNEL_FALLBACKS.whatsapp).toEqual(['whatsapp', 'sms', 'email']);
    expect(CHANNEL_FALLBACKS.sms).toEqual(['sms', 'email']);
    expect(CHANNEL_FALLBACKS.email).toEqual(['email']);
  });

  it('keeps only channels with an address, in fallback order', () => {
    const addresses: ChannelAddresses = { whatsapp: null, sms: '+2348030000001', email: 'a@b.ng' };
    expect(reachableChannels('whatsapp', addresses)).toEqual(['sms', 'email']);
  });
});

describe('renderTemplate', () => {
  it('replaces known merge fields', () => {
    expect(
      renderTemplate('Hello {{recipient_name}} from {{organisation_name}}', {
        recipient_name: 'Ada',
        organisation_name: 'Tenaville',
      }),
    ).toBe('Hello Ada from Tenaville');
  });

  it('leaves an unknown placeholder visible', () => {
    expect(renderTemplate('Rent of {{amount}}', { recipient_name: 'Ada' })).toBe(
      'Rent of {{amount}}',
    );
  });

  it('lists the placeholders an agency used', () => {
    expect(templatePlaceholders('{{recipient_name}} {{ date }} {{recipient_name}}')).toEqual([
      'recipient_name',
      'date',
    ]);
  });
});

describe('sendWithFallback', () => {
  const provider = (results: ProviderSendResult[]): MessagingProvider => {
    const send = vi.fn();
    for (const result of results) send.mockResolvedValueOnce(result);
    return { name: 'fake', send };
  };

  it('falls back when WhatsApp fails and stops at the first success', async () => {
    const fake = provider([
      { status: 'failed', provider: 'meta', error: 'template rejected' },
      { status: 'sent', provider: 'sms', providerMessageId: 'sms-1', costKobo: 400 },
    ]);

    const result = await sendWithFallback({
      provider: fake,
      primary: 'whatsapp',
      addresses: { whatsapp: '+2348030000001', sms: '+2348030000001', email: 'a@b.ng' },
      body: 'Hello',
    });

    expect(result.status).toBe('sent');
    expect(result.attempts.map((attempt) => [attempt.channel, attempt.status])).toEqual([
      ['whatsapp', 'failed'],
      ['sms', 'sent'],
    ]);
    expect(fake.send).toHaveBeenCalledTimes(2);
  });

  it('skips a channel with no address and records why', async () => {
    const fake = provider([{ status: 'sent', provider: 'email', providerMessageId: 'email-1' }]);

    const result = await sendWithFallback({
      provider: fake,
      primary: 'whatsapp',
      addresses: { whatsapp: null, sms: null, email: 'a@b.ng' },
      body: 'Hello',
    });

    expect(result.attempts.map((attempt) => [attempt.channel, attempt.status])).toEqual([
      ['whatsapp', 'skipped'],
      ['sms', 'skipped'],
      ['email', 'sent'],
    ]);
  });

  it('reports skipped when every channel lacks an address', async () => {
    const fake = provider([]);
    const result = await sendWithFallback({
      provider: fake,
      primary: 'whatsapp',
      addresses: {},
      body: 'Hello',
    });
    expect(result.status).toBe('skipped');
    expect(fake.send).not.toHaveBeenCalled();
  });

  it('turns a provider exception into a failed attempt', async () => {
    const fake: MessagingProvider = {
      name: 'fake',
      send: async () => {
        throw new Error('network down');
      },
    };
    const result = await sendWithFallback({
      provider: fake,
      primary: 'email',
      addresses: { email: 'a@b.ng' },
      body: 'Hello',
    });
    expect(result.status).toBe('failed');
    expect(result.attempts[0]?.error).toBe('network down');
  });
});

describe('logging provider', () => {
  it('reports a logged send without a real provider', async () => {
    const provider = createLoggingProvider();
    const result = await provider.send({ channel: 'email', to: 'a@b.ng', body: 'Hello' });
    expect(result.status).toBe('sent');
    expect(result.provider).toBe('log');
    expect(result.providerMessageId).toMatch(/^log-email-/);
  });
});
