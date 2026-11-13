import { describe, expect, it } from 'vitest';

import { daysUntilExpiry, documentExpiryLabel, documentExpiryStatus } from '../domain/expiry';

describe('document expiry', () => {
  const today = '2026-11-13';

  it('counts whole days between dates in UTC', () => {
    expect(daysUntilExpiry('2026-11-20', today)).toBe(7);
    expect(daysUntilExpiry('2026-11-13', today)).toBe(0);
    expect(daysUntilExpiry('2026-11-01', today)).toBe(-12);
  });

  it('distinguishes no expiry from valid', () => {
    expect(documentExpiryStatus(null, today)).toBe('none');
    expect(documentExpiryStatus('', today)).toBe('none');
  });

  it('warns inside the window and flags what has passed', () => {
    expect(documentExpiryStatus('2026-12-20', today)).toBe('valid');
    expect(documentExpiryStatus('2026-12-13', today)).toBe('expiring_soon');
    expect(documentExpiryStatus('2026-11-12', today)).toBe('expired');
  });

  it('honours a shorter warning window', () => {
    expect(documentExpiryStatus('2026-12-13', today, 7)).toBe('valid');
  });

  it('labels each state', () => {
    expect(documentExpiryLabel('expiring_soon')).toBe('Expiring soon');
    expect(documentExpiryLabel('none')).toBe('No expiry');
  });
});
