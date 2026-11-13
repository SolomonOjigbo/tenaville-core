/**
 * Document expiry (DOC-2, DOC-5).
 *
 * A document with no expiry is not "valid forever" in the same sense as one
 * with a date: it simply has nothing to alert on. Keeping that as `none` lets
 * the screen avoid a misleading green tick.
 */
export type DocumentExpiryStatus = 'none' | 'valid' | 'expiring_soon' | 'expired';

const DAY_MS = 24 * 60 * 60 * 1000;

export const daysUntilExpiry = (expiryDate: string, today: string): number | null => {
  const expiry = Date.parse(`${expiryDate}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(expiry) || Number.isNaN(now)) return null;
  return Math.round((expiry - now) / DAY_MS);
};

export const documentExpiryStatus = (
  expiryDate: string | null,
  today: string,
  warningDays = 30,
): DocumentExpiryStatus => {
  if (expiryDate === null || expiryDate.trim() === '') return 'none';
  const days = daysUntilExpiry(expiryDate, today);
  if (days === null) return 'none';
  if (days < 0) return 'expired';
  if (days <= warningDays) return 'expiring_soon';
  return 'valid';
};

export const documentExpiryLabel = (status: DocumentExpiryStatus): string => {
  switch (status) {
    case 'expired':
      return 'Expired';
    case 'expiring_soon':
      return 'Expiring soon';
    case 'valid':
      return 'Valid';
    case 'none':
      return 'No expiry';
  }
};
