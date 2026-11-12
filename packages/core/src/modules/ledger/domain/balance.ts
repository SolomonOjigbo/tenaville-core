/** The landlord ledger's derived figures (LEDGER-1). No I/O. */

export interface LedgerEntryAmount {
  /** Signed kobo: positive is owed to the landlord, negative owed by them. */
  readonly amount_kobo: number | bigint;
}

/**
 * The balance is the sum of signed entries, never a stored figure. A stored
 * balance would be a second truth to reconcile, and the two disagree the first
 * time a reversal is posted (PRD §10.4 for charges; the same reasoning here).
 */
export const balanceFromEntries = (entries: readonly LedgerEntryAmount[]): bigint =>
  entries.reduce<bigint>(
    (total, entry) =>
      total +
      (typeof entry.amount_kobo === 'bigint' ? entry.amount_kobo : BigInt(entry.amount_kobo)),
    0n,
  );
