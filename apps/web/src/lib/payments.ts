/**
 * Payment and receipt presentation helpers.
 *
 * The arithmetic here is not money rounding — that stays in @tenaville/money
 * (ADR 0003). These are derived figures the screens read: what a charge still
 * owes after its allocations, and how late it is. Keeping them out of the
 * components means they can be tested without a DOM.
 */

export type PaymentMethod = 'cash' | 'bank_transfer' | 'pos' | 'cheque' | 'mobile_money' | 'other';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  pos: 'POS',
  cheque: 'Cheque',
  mobile_money: 'Mobile money',
  other: 'Other',
};

/** The order the methods appear in a picker. */
export const PAYMENT_METHODS = Object.keys(METHOD_LABELS) as PaymentMethod[];

export const isPaymentMethod = (value: string): value is PaymentMethod =>
  Object.prototype.hasOwnProperty.call(METHOD_LABELS, value);

export const paymentMethodLabel = (method: string): string =>
  isPaymentMethod(method) ? METHOD_LABELS[method] : method;

/** Sum inline kobo values without ever passing through a float. */
export const sumKobo = (amounts: readonly (number | null | undefined)[]): bigint =>
  amounts.reduce<bigint>((total, amount) => total + BigInt(amount ?? 0), 0n);

export interface AllocationAmount {
  readonly amount_kobo: number;
}

/**
 * What a charge still owes, derived from its allocations (PRD §10.4).
 *
 * A reversal contributes a negative allocation, so the same subtraction puts
 * the money back without any special case.
 */
export const outstandingKobo = (
  chargeAmountKobo: number,
  allocations: readonly AllocationAmount[],
): bigint => BigInt(chargeAmountKobo) - sumKobo(allocations.map((a) => a.amount_kobo));

/**
 * Whole days a contractual date is past `today`, or a negative count when it
 * is still ahead. Date-only on both sides, parsed as UTC so a machine east or
 * west of Lagos cannot shift the answer by a day.
 */
export const daysOverdue = (dueOn: string, today: string): number => {
  const due = Date.parse(`${dueOn}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(due) || Number.isNaN(now)) return 0;
  return Math.floor((now - due) / 86_400_000);
};

/** The business date the screens compare against, as YYYY-MM-DD. */
export const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** First day of the current month, for "collected this month". */
export const monthStartIso = (today: string): string => `${today.slice(0, 7)}-01`;
