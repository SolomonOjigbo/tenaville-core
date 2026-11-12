import { z } from 'zod';

/** Integer kobo as a transport string: bigint cannot cross JSON. */
const koboString = z.string().regex(/^\d+$/, 'Enter an amount in kobo');

export const recordRemittanceSchema = z.object({
  organisationId: z.string().uuid(),
  landlordId: z.string().uuid(),
  amountKobo: koboString,
  paidOn: z.string().date(),
  method: z.enum(['cash', 'bank_transfer', 'pos', 'cheque', 'mobile_money', 'other']),
  reference: z.string().trim().max(120).optional(),
});

export type RecordRemittanceInput = z.infer<typeof recordRemittanceSchema>;
