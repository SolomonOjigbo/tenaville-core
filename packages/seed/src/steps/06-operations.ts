import type { Database } from '@tenaville/db';

import {
  clientFor,
  must,
  ok,
  person,
  staffByRole,
  type Ctx,
  type OrgCtx,
} from '../context';
import { addDays, addMonths, monthEnd, monthStart } from '../lib/dates';
import { log } from '../lib/log';

type MessageInsert = Database['public']['Tables']['messages']['Insert'];

const naira = (kobo: bigint): string =>
  `₦${(Number(kobo) / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

const TEMPLATES = [
  {
    key: 'rent_reminder_sms', name: 'Rent reminder (SMS)', channel: 'sms' as const,
    body: 'Dear {{tenant_name}}, your rent of {{amount}} for {{unit}} was due on {{due_date}}. Please pay to the agency account and send proof to this number. Thank you.',
  },
  {
    key: 'rent_reminder_whatsapp', name: 'Rent reminder (WhatsApp)', channel: 'whatsapp' as const,
    whatsapp: 'rent_reminder_v2',
    body: 'Hello {{tenant_name}}, a friendly reminder that {{amount}} for {{unit}} fell due on {{due_date}}. Reply to this message once paid and we will send your receipt.',
  },
  {
    key: 'receipt_issued', name: 'Receipt issued', channel: 'sms' as const,
    body: 'Receipt {{receipt_number}}: we received {{amount}} for {{unit}} on {{paid_on}}. Thank you, {{tenant_name}}.',
  },
  {
    key: 'lease_expiry_notice', name: 'Lease expiry notice', channel: 'email' as const,
    subject: 'Your tenancy at {{property}} ends on {{end_date}}',
    body: 'Dear {{tenant_name}}, your tenancy for {{unit}} ends on {{end_date}}. Please let us know whether you wish to renew so we can prepare the new terms.',
  },
];

/**
 * Templates, a message history and open tasks: the "operations" surface that
 * makes the product look lived-in. Messages are written the way the dispatch
 * job writes them (service role); nothing is sent anywhere.
 */
export const seedOperations = async (ctx: Ctx, org: OrgCtx): Promise<void> => {
  const { spec } = org;
  const rng = org.rng.fork('operations');
  log.step(`${spec.name}: comms, tasks and devices`);

  const owner = person(org, spec.staff.find((s) => s.role === 'owner')!.handle);
  const ownerClient = await clientFor(ctx, owner);

  // ---- Templates ----------------------------------------------------------------
  const templateIds = new Map<string, string>();
  for (const t of TEMPLATES) {
    const { data, error } = await ownerClient
      .from('message_templates')
      .insert({
        organisation_id: org.id,
        key: t.key,
        name: t.name,
        channel: t.channel,
        body: t.body,
        approval_status: 'approved',
        active: true,
        created_by: owner.id,
        ...('subject' in t ? { subject: t.subject } : {}),
        ...('whatsapp' in t ? { whatsapp_template_name: t.whatsapp } : {}),
      })
      .select('id')
      .single();
    ok(error, `template ${t.key}`);
    templateIds.set(t.key, must(data, 'template').id);
  }

  // ---- Messages: reminders to late payers, receipts to recent payers ---------------
  const messages: MessageInsert[] = [];
  const lateLeases = org.leases.filter(
    (l) => l.status === 'active' && ['slow', 'partial', 'defaulter'].includes(l.behaviour) && l.tenant.id !== '',
  );
  for (const lease of rng.shuffle(lateLeases).slice(0, 30)) {
    const due = [...lease.charges].filter((c) => c.dueOn <= ctx.today).sort((a, b) => b.dueOn.localeCompare(a.dueOn))[0];
    if (due === undefined) continue;
    const channel = rng.weighted<'sms' | 'whatsapp'>([['whatsapp', 0.65], ['sms', 0.35]]);
    const failed = rng.chance(0.06);
    const sentAt = new Date(Date.now() - rng.int(1, 40) * 86_400_000).toISOString();
    messages.push({
      organisation_id: org.id,
      channel,
      purpose: 'operational',
      template_id: must(templateIds.get(channel === 'sms' ? 'rent_reminder_sms' : 'rent_reminder_whatsapp'), 'reminder template'),
      recipient_type: 'tenant',
      recipient_id: lease.tenant.id,
      recipient_name: lease.tenant.name,
      recipient_address: `+23480300${String(rng.int(0, 99_999)).padStart(5, '0')}`,
      body: `Dear ${lease.tenant.name}, your ${due.label.toLowerCase()} of ${naira(due.amountKobo)} for ${lease.unit.label} at ${lease.unit.property.name} fell due on ${due.dueOn}. Please settle or contact the office.`,
      related_type: 'lease',
      related_id: lease.id,
      status: failed ? 'failed' : rng.weighted<'delivered' | 'sent'>([['delivered', 0.8], ['sent', 0.2]]),
      sent_channel: channel,
      provider: 'demo',
      cost_kobo: channel === 'sms' ? 400 : 800,
      sent_at: sentAt,
      ...(failed ? { error: 'Recipient is not reachable on this channel' } : {}),
    });
  }
  for (const payment of org.payments.slice(-25)) {
    messages.push({
      organisation_id: org.id,
      channel: 'sms',
      purpose: 'operational',
      template_id: must(templateIds.get('receipt_issued'), 'receipt template'),
      recipient_type: 'tenant',
      recipient_id: payment.lease.tenant.id,
      recipient_name: payment.lease.tenant.name,
      recipient_address: '+2348030000000',
      body: `Receipt ${payment.receiptNumber}: we received ${naira(payment.amountKobo)} for ${payment.lease.unit.label} on ${payment.paidOn}. Thank you, ${payment.lease.tenant.name}.`,
      related_type: 'payment',
      related_id: payment.id,
      status: 'delivered',
      sent_channel: 'sms',
      provider: 'demo',
      cost_kobo: 400,
      sent_at: new Date().toISOString(),
    });
  }
  if (messages.length > 0) {
    const { error } = await ctx.admin.from('messages').insert(messages);
    ok(error, 'messages');
  }
  org.stats.messages = messages.length;

  // ---- Tasks: generated reminders plus a few hand-made ones -----------------------
  const generated = await ownerClient.rpc('generate_reminder_tasks', { p_organisation_id: org.id });
  ok(generated.error, 'generate_reminder_tasks');
  const manual = [
    { title: 'Chase estate service charge arrears', notes: 'Three units have not paid this year’s service charge.', priority: 'high' as const, days: 3 },
    { title: 'Collect signed renewal letters', notes: 'Expiring tenancies: confirm intent to renew before the notice window closes.', priority: 'normal' as const, days: 7 },
    { title: 'Reconcile this month’s bank transfers', notes: 'Match NIP references to the statement and mark payments confirmed.', priority: 'normal' as const, days: 5 },
  ];
  const assignees = [...staffByRole(org, 'accountant'), ...staffByRole(org, 'property_manager'), owner];
  for (const [i, task] of manual.entries()) {
    const { error } = await ownerClient.from('tasks').insert({
      organisation_id: org.id,
      title: task.title,
      notes: task.notes,
      owner_user_id: must(assignees[i % assignees.length], 'assignee').id,
      due_on: addDays(ctx.today, task.days),
      priority: task.priority,
      created_by: owner.id,
    });
    ok(error, `task ${task.title}`);
  }
  org.stats.tasksGenerated = Number(generated.data ?? 0);

  // ---- Device sessions for the people who would carry a phone ----------------------
  const devices = [...org.people.values()]
    .filter((p) => ['owner', 'property_manager', 'caretaker', 'accountant', 'letting_agent'].includes(p.role))
    .flatMap((p) => [
      { user_id: p.id, device_label: rng.pick(['Pixel 7', 'Galaxy A54', 'iPhone 13', 'Tecno Camon 20']), platform: rng.pick(['android', 'ios']), app_version: '0.9.2', last_seen_at: new Date(Date.now() - rng.int(0, 5) * 86_400_000).toISOString() },
      ...(p.role === 'owner' || p.role === 'accountant'
        ? [{ user_id: p.id, device_label: 'Chrome on Windows', platform: 'web', app_version: null, last_seen_at: new Date().toISOString() }]
        : []),
    ]);
  if (devices.length > 0) {
    const { error } = await ctx.admin.from('device_sessions').insert(devices);
    ok(error, 'device sessions');
  }
};

/**
 * Subscription history: one usage reading and invoice per month, the older
 * ones paid, the latest outstanding, so the billing screen has a story.
 */
export const seedBilling = async (ctx: Ctx, org: OrgCtx): Promise<void> => {
  const { spec } = org;
  // Metering and invoicing are platform jobs (not callable by a signed-in user), so they
  // run with the service role, exactly as the scheduled job does.
  const owner = person(org, spec.staff.find((s) => s.role === 'owner')!.handle);
  const client = await clientFor(ctx, owner);
  let invoices = 0;

  for (let back = spec.tuning.invoiceMonths; back >= 1; back -= 1) {
    const first = addMonths(monthStart(ctx.today), -back);
    const last = monthEnd(first);

    const reading = await ctx.admin.rpc('take_usage_reading', {
      target_organisation_id: org.id,
      period_start: first,
      period_end: last,
    });
    if (reading.error !== null) {
      log.warn(`usage reading ${first}: ${reading.error.message}`);
      continue;
    }

    const invoice = await client.rpc('generate_subscription_invoice', {
      p_organisation_id: org.id,
      p_period_start: first,
      p_period_end: last,
    });
    if (invoice.error !== null) {
      log.warn(`invoice ${first}: ${invoice.error.message}`);
      continue;
    }
    invoices += 1;

    // Leave the latest invoice outstanding.
    if (back > 1) {
      const { data: row, error: readError } = await client
        .from('billing_invoices')
        .select('total_kobo')
        .eq('id', invoice.data)
        .single();
      ok(readError, 'read invoice');
      const paid = await client.rpc('record_invoice_payment', {
        p_invoice_id: invoice.data,
        p_amount_kobo: Number(must(row, 'invoice').total_kobo),
        p_method: 'bank_transfer',
        p_reference: `SUB-${first.slice(0, 7)}`,
        p_paid_on: addDays(last, 3),
      });
      ok(paid.error, 'record_invoice_payment');
    }
  }
  org.stats.invoices = invoices;
};
