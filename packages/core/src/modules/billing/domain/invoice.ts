/**
 * Invoice arithmetic (BILL-2).
 *
 * The database stores kobo as integer bigint. These helpers keep that integer
 * discipline in the UI rather than reintroducing a float at the last moment.
 */
export const invoiceBalanceKobo = (
  totalKobo: bigint | number,
  paidKobo: bigint | number,
): bigint => {
  const balance = BigInt(totalKobo) - BigInt(paidKobo);
  return balance > 0n ? balance : 0n;
};

export const isInvoiceSettled = (totalKobo: bigint | number, paidKobo: bigint | number): boolean =>
  invoiceBalanceKobo(totalKobo, paidKobo) === 0n;

export const isInvoiceOverdue = (status: string, dueOn: string | null, today: string): boolean =>
  status === 'open' && dueOn !== null && dueOn < today;

export const billingInvoiceStatusLabel = (status: string): string =>
  status.replace(/_/g, ' ').replace(/^./, (character) => character.toUpperCase());

export type PlanChangeDirection = 'upgrade' | 'downgrade' | 'same';

export const planChangeDirection = (
  fromSortOrder: number,
  toSortOrder: number,
): PlanChangeDirection => {
  if (toSortOrder === fromSortOrder) return 'same';
  return toSortOrder > fromSortOrder ? 'upgrade' : 'downgrade';
};
