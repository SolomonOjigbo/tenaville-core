import { describe, expect, it } from 'vitest';

import {
  billingInvoiceStatusLabel,
  invoiceBalanceKobo,
  isInvoiceOverdue,
  isInvoiceSettled,
  planChangeDirection,
} from '../domain/invoice';

describe('invoice arithmetic', () => {
  it('never returns a negative balance', () => {
    expect(invoiceBalanceKobo(1000, 400)).toBe(600n);
    expect(invoiceBalanceKobo(1000, 1000)).toBe(0n);
    expect(invoiceBalanceKobo(1000, 1200)).toBe(0n);
  });

  it('detects settlement', () => {
    expect(isInvoiceSettled(1000, 1000)).toBe(true);
    expect(isInvoiceSettled(1000, 1)).toBe(false);
  });

  it('calls only an open, dated, past-due invoice overdue', () => {
    expect(isInvoiceOverdue('open', '2026-11-01', '2026-11-13')).toBe(true);
    expect(isInvoiceOverdue('paid', '2026-11-01', '2026-11-13')).toBe(false);
    expect(isInvoiceOverdue('open', null, '2026-11-13')).toBe(false);
  });

  it('labels and classifies plan changes', () => {
    expect(billingInvoiceStatusLabel('open')).toBe('Open');
    expect(planChangeDirection(10, 20)).toBe('upgrade');
    expect(planChangeDirection(20, 10)).toBe('downgrade');
    expect(planChangeDirection(10, 10)).toBe('same');
  });
});
