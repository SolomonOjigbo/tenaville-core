import { describe, expect, it } from 'vitest';

import { createReceiptPdf, createStatementPdf } from '../lib/pdf';

describe('generated PDFs', () => {
  it('creates a receipt PDF with the verification details', async () => {
    const pdf = await createReceiptPdf({
      organisation: 'Tenaville',
      receiptNumber: 'R-2026-00001',
      status: 'issued',
      issuedOn: '2026-11-14',
      amountKobo: 12_000_000,
      tenant: 'Grace Udo',
      property: 'Bola Court',
      unit: 'Flat 1',
      leaseReference: 'BOLA/001',
      method: 'Bank transfer',
      reference: 'TRX-1',
      verificationCode: 'ABC123',
      reversed: false,
      reversalReason: null,
    });
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('creates a statement PDF with lines and a closing balance', async () => {
    const pdf = await createStatementPdf({
      organisation: 'Tenaville',
      landlord: 'Mrs Bola',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      revision: 1,
      status: 'issued',
      openingKobo: 0,
      closingKobo: 5_000_000,
      lines: [
        { occurredOn: '2026-10-05', description: 'Rent collected', amountKobo: 10_000_000 },
        { occurredOn: '2026-10-06', description: 'Commission', amountKobo: -5_000_000 },
      ],
    });
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-');
  });
});
