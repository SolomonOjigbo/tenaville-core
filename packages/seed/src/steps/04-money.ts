import { randomUUID } from 'node:crypto';

import type { UserClient } from '@tenaville/db';

import {
  clientFor,
  must,
  ok,
  person,
  staffByRole,
  type Ctx,
  type LeaseRec,
  type OrgCtx,
  type PaymentRec,
  type Person,
} from '../context';
import { addDays, addMonths, daysBetween, monthEnd, monthStart } from '../lib/dates';
import { log } from '../lib/log';
import { planPayments, type Method } from '../lib/payment-plan';

const financeActors = (org: OrgCtx): Person[] => {
  const accountants = staffByRole(org, 'accountant');
  if (accountants.length > 0) return accountants;
  return [
    ...staffByRole(org, 'admin'),
    ...staffByRole(org, 'property_manager'),
    ...staffByRole(org, 'owner'),
  ].slice(0, 1);
};

interface Event {
  readonly lease: LeaseRec;
  readonly paidOn: string;
  readonly amountKobo: bigint;
  readonly method: Method;
  readonly reference: string | null;
  readonly mutationId: string;
}

/**
 * Collections. Every payment goes through `record_payment`, so receipts are
 * numbered gaplessly, allocated oldest-charge-first, and posted to the
 * landlord ledger with commission — the same path a clerk's tap takes.
 * Payments run in date order so receipt numbers read chronologically.
 */
export const seedPayments = async (ctx: Ctx, org: OrgCtx): Promise<void> => {
  const { spec } = org;
  const rng = org.rng.fork('payments');
  log.step(`${spec.name}: rent collections`);

  const events: Event[] = [];
  const order = new Map(org.leases.map((lease, index) => [lease.id, index]));
  for (const lease of org.leases) {
    if (lease.status === 'draft') continue;
    const planned = planPayments(
      {
        start: lease.start,
        cutoff: lease.cutoff,
        dues: lease.charges,
        behaviour: lease.behaviour,
        commercial: lease.unit.group.commercial === true,
        today: ctx.today,
      },
      rng,
    );
    for (const p of planned) {
      events.push({ lease, ...p, mutationId: randomUUID() });
    }
  }
  // Tie-break same-day payments by lease creation order (not by random ids) so runs are reproducible.
  events.sort(
    (a, b) => a.paidOn.localeCompare(b.paidOn) || (order.get(a.lease.id) ?? 0) - (order.get(b.lease.id) ?? 0),
  );

  const actors = financeActors(org);
  const clients = await Promise.all(actors.map((actor) => clientFor(ctx, actor)));

  for (const [index, event] of events.entries()) {
    const client = must(clients[index % clients.length], 'finance client');
    const payment = await record(client, org, event);
    org.payments.push(payment);
    log.progress('payments', index + 1, events.length);
  }

  org.stats.payments = org.payments.length;
};

const record = async (client: UserClient, org: OrgCtx, event: Event): Promise<PaymentRec> => {
  const branchKey = event.lease.unit.property.branch;
  const { data, error } = await client.rpc('record_payment', {
    target_organisation_id: org.id,
    target_lease_id: event.lease.id,
    payment_amount_kobo: Number(event.amountKobo),
    payment_method: event.method,
    payment_paid_on: event.paidOn,
    payment_client_mutation_id: event.mutationId,
    payment_tenant_id: event.lease.tenant.id,
    ...(event.reference === null ? {} : { payment_reference: event.reference }),
    ...(branchKey !== undefined && org.branchIds.has(branchKey)
      ? { payment_branch_id: must(org.branchIds.get(branchKey), 'branch') }
      : {}),
  });
  ok(error, `record_payment (${event.lease.unit.label}, ${event.paidOn})`);
  const row = must(Array.isArray(data) ? data[0] : data, 'payment row') as {
    payment_id: string;
    receipt_number: string;
  };
  return {
    id: row.payment_id,
    receiptNumber: row.receipt_number,
    lease: event.lease,
    amountKobo: event.amountKobo,
    method: event.method,
    paidOn: event.paidOn,
  };
};

/**
 * Returned cheques and a corrected re-payment. Reversal is an append, never an
 * edit (invariant 1): the original stays on the ledger with its opposite.
 */
export const seedReversals = async (ctx: Ctx, org: OrgCtx): Promise<Set<string>> => {
  const reversed = new Set<string>();
  const count = org.spec.tuning.reversedPayments;
  if (count === 0) return reversed;

  const rng = org.rng.fork('reversals');
  const owner = person(org, org.spec.staff.find((s) => s.role === 'owner')!.handle);
  const client = await clientFor(ctx, owner);

  const candidates = org.payments.filter(
    (p) => daysBetween(p.paidOn, ctx.today) > 25 && p.lease.status === 'active' && p.amountKobo > 100_000_00n,
  );
  for (const payment of rng.shuffle(candidates).slice(0, count)) {
    const { error } = await client.rpc('reverse_payment', {
      target_payment_id: payment.id,
      reason: rng.pick([
        'Cheque returned unpaid by the drawer’s bank',
        'Transfer recalled by the sender’s bank',
        'Recorded against the wrong lease; re-entered correctly',
      ]),
    });
    ok(error, 'reverse_payment');
    reversed.add(payment.id);

    const repaidOn = addDays(payment.paidOn, rng.int(5, 12));
    if (repaidOn <= ctx.today) {
      const replacement = await record(client, org, {
        lease: payment.lease,
        paidOn: repaidOn,
        amountKobo: payment.amountKobo,
        method: 'bank_transfer',
        reference: `NIP${rng.int(100_000_000_000, 999_999_999_999)}`,
        mutationId: randomUUID(),
      });
      org.payments.push(replacement);
    }
  }
  log.info(`${reversed.size} payments reversed`);
  return reversed;
};

/** Bank-evidenced payments are marked confirmed once reconciled; cash stays "recorded". */
export const confirmPayments = async (
  ctx: Ctx,
  org: OrgCtx,
  skip: ReadonlySet<string>,
): Promise<void> => {
  const rng = org.rng.fork('confirm');
  const [actor] = financeActors(org);
  const client = await clientFor(ctx, must(actor, 'finance actor'));

  const confirmable = org.payments.filter(
    (p) =>
      !skip.has(p.id) &&
      ['bank_transfer', 'pos', 'mobile_money'].includes(p.method) &&
      daysBetween(p.paidOn, ctx.today) >= 3 &&
      rng.chance(0.85),
  );
  const ids = confirmable.map((p) => p.id);
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await client
      .from('payments')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), confirmed_by: actor!.id })
      .in('id', ids.slice(i, i + 100));
    ok(error, 'confirm payments');
  }
  log.info(`${ids.length} payments confirmed`);
};

interface LedgerRow {
  amount_kobo: number;
  occurred_on: string;
}

const fetchLedger = async (client: UserClient, landlordId: string): Promise<LedgerRow[]> => {
  const rows: LedgerRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from('landlord_ledger_entries')
      .select('amount_kobo, occurred_on')
      .eq('landlord_id', landlordId)
      .order('occurred_on')
      .range(from, from + 999);
    ok(error, 'read ledger');
    rows.push(...(data ?? []).map((r) => ({ amount_kobo: Number(r.amount_kobo), occurred_on: r.occurred_on })));
    if ((data ?? []).length < 1000) break;
  }
  return rows;
};

const SCHEDULE_MONTHS = { monthly: 1, quarterly: 3 } as const;

/**
 * Remit what each landlord is owed, on their own schedule, from the ledger
 * balance at the end of each completed period. The latest period is left for
 * the demo to do live where the schedule has already closed it.
 */
export const seedRemittances = async (ctx: Ctx, org: OrgCtx): Promise<void> => {
  const finance = financeActors(org);
  const client = await clientFor(ctx, must(finance[0], 'finance actor'));
  let remitted = 0;

  for (const landlord of org.spec.landlords) {
    const mandate = landlord.mandate;
    if (mandate === undefined) continue;
    const step = SCHEDULE_MONTHS[mandate.schedule as keyof typeof SCHEDULE_MONTHS];
    if (step === undefined) continue;

    const landlordId = must(org.landlordIds.get(landlord.key), 'landlord');
    const ledger = await fetchLedger(client, landlordId);
    if (ledger.length === 0) continue;

    // Period ends: month ends (monthly) or calendar-quarter ends (quarterly), all completed.
    const firstMonth = monthStart(must(ledger[0], 'entry').occurred_on);
    let alreadyRemitted = 0;
    for (let cursor = firstMonth; monthEnd(cursor) < ctx.today; cursor = addMonths(cursor, 1)) {
      const month = Number(cursor.slice(5, 7));
      if (step === 3 && month % 3 !== 0) continue;
      const periodEnd = monthEnd(cursor);
      const owedAtPeriodEnd =
        ledger.filter((e) => e.occurred_on <= periodEnd).reduce((sum, e) => sum + e.amount_kobo, 0) -
        alreadyRemitted;
      // Never remit money that later deductions (repair costs posted since) have already claimed:
      // a landlord's balance must not go negative.
      const balanceNow = ledger.reduce((sum, e) => sum + e.amount_kobo, 0) - alreadyRemitted;
      const balance = Math.min(owedAtPeriodEnd, balanceNow);
      // Whole naira only, and nothing under ₦1,000.
      const amount = Number((BigInt(balance) / 100n) * 100n);
      if (amount < 100_000) continue;

      const paidOn = addDays(periodEnd, 10);
      if (paidOn > ctx.today) continue;

      const { error } = await client.rpc('record_remittance', {
        target_organisation_id: org.id,
        target_landlord_id: landlordId,
        remittance_amount_kobo: amount,
        remittance_paid_on: paidOn,
        remittance_method: 'bank_transfer',
        remittance_reference: `REM-${periodEnd.slice(0, 7)}-${landlord.key.toUpperCase().slice(0, 6)}`,
      });
      ok(error, `remittance ${landlord.name} ${periodEnd}`);
      alreadyRemitted += amount;
      remitted += 1;
    }
  }
  org.stats.remittances = remitted;
  log.info(`${remitted} remittances`);
};

/**
 * Landlord statements for the last six months: older ones issued, the latest
 * completed month reviewed and waiting to be issued, the current month a draft.
 */
export const seedStatements = async (ctx: Ctx, org: OrgCtx): Promise<void> => {
  const finance = financeActors(org);
  const maker = await clientFor(ctx, must(finance[0], 'finance actor'));
  const owner = await clientFor(ctx, person(org, org.spec.staff.find((s) => s.role === 'owner')!.handle));
  let created = 0;

  for (const landlord of org.spec.landlords) {
    if (landlord.mandate === undefined) continue;
    const landlordId = must(org.landlordIds.get(landlord.key), 'landlord');

    for (let back = 6; back >= 0; back -= 1) {
      const first = addMonths(monthStart(ctx.today), -back);
      const last = back === 0 ? ctx.today : monthEnd(first);

      const made = await maker.rpc('create_statement', {
        target_organisation_id: org.id,
        target_landlord_id: landlordId,
        period_starts_on: first,
        period_ends_on: last,
      });
      ok(made.error, `statement ${landlord.name} ${first}`);
      const statementId = must(made.data, 'statement id');
      created += 1;

      if (back >= 2) {
        const review = await owner.rpc('review_statement', { target_statement_id: statementId });
        ok(review.error, 'review_statement');
        const issue = await owner.rpc('issue_statement', { target_statement_id: statementId });
        ok(issue.error, 'issue_statement');
      } else if (back === 1) {
        const review = await owner.rpc('review_statement', { target_statement_id: statementId });
        ok(review.error, 'review_statement');
      }
    }
  }
  org.stats.statements = created;
  log.info(`${created} statements`);
};
