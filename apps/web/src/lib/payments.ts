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

export interface CashUpPayment {
  readonly amount_kobo: number;
  readonly method: string;
  readonly status: string;
}

export interface CashUpMethodRow {
  readonly method: string;
  readonly count: number;
  readonly recorded: number;
  readonly confirmed: number;
  readonly reversed: number;
  readonly netKobo: bigint;
}

export interface CashUpSummary {
  readonly count: number;
  readonly grossKobo: bigint;
  readonly reversalKobo: bigint;
  readonly netKobo: bigint;
  readonly methods: readonly CashUpMethodRow[];
}

/**
 * The day's take, grouped by payment method (RENT-15).
 *
 * Gross and reversals are kept apart rather than netted silently: a cash-up is
 * a reconciliation against a bank statement or a cash box, and "₦50,000 in,
 * ₦50,000 reversed" is a different day from "nothing happened". A reversal is
 * a negative payment, so the same rows produce all three figures.
 */
export const summariseCashUp = (rows: readonly CashUpPayment[]): CashUpSummary => {
  const byMethod = new Map<string, CashUpMethodRow>();
  let gross = 0n;
  let reversed = 0n;

  for (const row of rows) {
    const amount = BigInt(row.amount_kobo);
    if (amount > 0n) gross += amount;
    else reversed += amount;

    const current = byMethod.get(row.method) ?? {
      method: row.method,
      count: 0,
      recorded: 0,
      confirmed: 0,
      reversed: 0,
      netKobo: 0n,
    };

    byMethod.set(row.method, {
      ...current,
      count: current.count + 1,
      recorded: current.recorded + (row.status === 'recorded' ? 1 : 0),
      confirmed: current.confirmed + (row.status === 'confirmed' ? 1 : 0),
      reversed: current.reversed + (row.status === 'reversed' ? 1 : 0),
      netKobo: current.netKobo + amount,
    });
  }

  const order = new Map(PAYMENT_METHODS.map((method, index) => [method, index]));
  const methods = [...byMethod.values()].sort((a, b) => {
    const left = order.get(a.method as PaymentMethod) ?? Number.MAX_SAFE_INTEGER;
    const right = order.get(b.method as PaymentMethod) ?? Number.MAX_SAFE_INTEGER;
    return left === right ? a.method.localeCompare(b.method) : left - right;
  });

  return {
    count: rows.length,
    grossKobo: gross,
    reversalKobo: reversed,
    netKobo: gross + reversed,
    methods,
  };
};
