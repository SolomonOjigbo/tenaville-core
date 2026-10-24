/**
 * Naira as integer kobo. See docs/decisions/0003-money-as-integer-kobo.md.
 *
 * Implementation pending. The branded type is here from the start so that an
 * amount cannot be confused with an ordinary number at a call site, and so
 * that adding the arithmetic later does not require revisiting every caller.
 */

/** An amount in kobo. ₦1,250,000.00 is 125_000_000 kobo. */
export type Kobo = bigint & { readonly __brand: 'Kobo' };

/** Kobo per naira. Naira has two minor digits. */
export const KOBO_PER_NAIRA = 100n;
