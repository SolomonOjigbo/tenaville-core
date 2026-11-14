import { applyRate, kobo as koboOf } from '@tenaville/money';

import { addDays, maxDate } from './dates';
import type { Rng } from './rng';
import type { Behaviour } from '../world/types';

export type Method = 'cash' | 'bank_transfer' | 'pos' | 'cheque' | 'mobile_money';

export interface DueInput {
  readonly dueOn: string;
  readonly amountKobo: bigint;
}

export interface PlannedPayment {
  readonly paidOn: string;
  readonly amountKobo: bigint;
  readonly method: Method;
  readonly reference: string | null;
}

export interface PlanInput {
  readonly start: string;
  /** Dues after this date are never payable (an early termination). */
  readonly cutoff: string | null;
  readonly dues: readonly DueInput[];
  readonly behaviour: Behaviour;
  readonly commercial: boolean;
  readonly today: string;
}

const KOBO_PER_THOUSAND_NAIRA = 100_000n;

/** Round to the nearest ₦1,000, never to zero. */
const roundThousand = (kobo: bigint): bigint => {
  const rounded = ((kobo + KOBO_PER_THOUSAND_NAIRA / 2n) / KOBO_PER_THOUSAND_NAIRA) * KOBO_PER_THOUSAND_NAIRA;
  return rounded === 0n ? KOBO_PER_THOUSAND_NAIRA : rounded;
};

/** A fraction of an amount, using the money package's rate rule, rounded to ₦1,000. */
const share = (amount: bigint, fraction: number): bigint => {
  const portion = roundThousand(applyRate(koboOf(amount), Math.round(fraction * 10_000)));
  return portion > amount ? amount : portion;
};

const pickMethod = (rng: Rng, commercial: boolean): Method =>
  commercial
    ? rng.weighted<Method>([['bank_transfer', 0.6], ['cheque', 0.25], ['pos', 0.1], ['cash', 0.05]])
    : rng.weighted<Method>([
        ['bank_transfer', 0.55], ['cash', 0.15], ['pos', 0.15], ['mobile_money', 0.1], ['cheque', 0.05],
      ]);

const digits = (rng: Rng, n: number): string =>
  Array.from({ length: n }, () => String(rng.int(0, 9))).join('');

const referenceFor = (method: Method, rng: Rng): string | null => {
  switch (method) {
    case 'bank_transfer': return `NIP${digits(rng, 12)}`;
    case 'pos': return `POS${digits(rng, 8)}`;
    case 'cheque': return `CHQ-${digits(rng, 6)}`;
    case 'mobile_money': return `MM${digits(rng, 10)}`;
    case 'cash': return null;
  }
};

/**
 * Turn a lease's charge schedule into the payments a tenant of this kind
 * would actually make. Pure: same inputs and rng, same payments. Allocation
 * is the database's job (oldest charge first), so partial payers accumulate
 * real arrears without the planner tracking balances.
 *
 * Invariants (covered by tests): no payment is dated after `today`, before
 * the lease start, or after an early-termination cutoff; no payment is for
 * zero; the total never exceeds what has fallen due.
 */
export const planPayments = (input: PlanInput, rng: Rng): PlannedPayment[] => {
  const groups = new Map<string, bigint>();
  for (const due of input.dues) {
    if (input.cutoff !== null && due.dueOn > input.cutoff) continue;
    groups.set(due.dueOn, (groups.get(due.dueOn) ?? 0n) + due.amountKobo);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  const payable = ordered.filter(([dueOn]) => dueOn <= addDays(input.today, 5));

  const out: PlannedPayment[] = [];
  const emit = (paidOn: string, amount: bigint): void => {
    const date = maxDate(paidOn, input.start);
    if (date > input.today || amount <= 0n) return;
    if (input.cutoff !== null && date > input.cutoff) return;
    const method = pickMethod(rng, input.commercial);
    out.push({ paidOn: date, amountKobo: amount, method, reference: referenceFor(method, rng) });
  };

  // A "defaulter" with fewer than two instalments due is just a late payer.
  const dueNow = payable.filter(([dueOn]) => dueOn <= input.today).length;
  const behaviour: Behaviour = input.behaviour === 'defaulter' && dueNow < 2 ? 'slow' : input.behaviour;
  const skipLast = behaviour === 'defaulter' ? rng.int(1, Math.min(2, dueNow - 1)) : 0;
  const lastPaidIndex = payable.length - 1 - skipLast;

  payable.forEach(([dueOn, amount], index) => {
    switch (behaviour) {
      case 'prompt':
        emit(addDays(dueOn, -rng.int(0, 5)), amount);
        break;
      case 'usual':
        emit(addDays(dueOn, rng.int(0, 10)), amount);
        break;
      case 'slow': {
        const first = addDays(dueOn, rng.int(15, 45));
        if (rng.chance(0.5) && amount > 2n * KOBO_PER_THOUSAND_NAIRA) {
          const part = share(amount, 0.6);
          emit(first, part);
          emit(addDays(first, rng.int(7, 20)), amount - part);
        } else {
          emit(first, amount);
        }
        break;
      }
      case 'partial':
        emit(addDays(dueOn, rng.int(3, 25)), share(amount, 0.4 + rng.next() * 0.35));
        break;
      case 'defaulter':
        if (index <= lastPaidIndex) emit(addDays(dueOn, rng.int(0, 10)), amount);
        break;
    }
  });

  return out.sort((a, b) => a.paidOn.localeCompare(b.paidOn));
};
