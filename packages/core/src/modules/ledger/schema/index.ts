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

export const createStatementSchema = z
  .object({
    organisationId: z.string().uuid(),
    landlordId: z.string().uuid(),
    periodStart: z.string().date(),
    periodEnd: z.string().date(),
    /** Set only when correcting an issued statement; becomes the next revision. */
    supersedesStatementId: z.string().uuid().optional(),
  })
  .refine((value) => value.periodEnd >= value.periodStart, {
    message: 'The period must end on or after it starts',
    path: ['periodEnd'],
  });

export type CreateStatementInput = z.infer<typeof createStatementSchema>;
