import { z } from 'zod';

export const rentFrequencySchema = z.enum([
  'annual',
  'half_yearly',
  'quarterly',
  'monthly',
  'irregular',
]);

/** The frequencies a schedule can be derived from. 'irregular' is supplied. */
export const periodicRentFrequencySchema = z.enum([
  'annual',
  'half_yearly',
  'quarterly',
  'monthly',
]);
export const leaseStatusSchema = z.enum(['draft', 'active', 'expired', 'terminated', 'renewed']);
export const depositCustodianSchema = z.enum(['agency', 'landlord']);

/** Integer kobo as a transport string: bigint cannot cross JSON. */
const koboString = z.string().regex(/^\d+$/, 'Enter an amount in kobo');

export const createTenantSchema = z.object({
  organisationId: z.string().uuid(),
  kind: z.enum(['individual', 'organisation']).default('individual'),
  displayName: z.string().trim().min(2, 'Enter the tenant name').max(200),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .refine((v) => /^(\+234\d{10}|0\d{10})$/.test(v), 'Enter a Nigerian phone number')
    .transform((v) => (v.startsWith('0') ? `+234${v.slice(1)}` : v))
    .optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  preferredChannel: z.enum(['phone', 'sms', 'whatsapp', 'email']).default('whatsapp'),
  occupation: z.string().trim().max(200).optional(),
  employerName: z.string().trim().max(200).optional(),
  businessRegistration: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const createLeaseSchema = z
  .object({
    organisationId: z.string().uuid(),
    unitId: z.string().uuid(),
    tenantId: z.string().uuid(),
    reference: z.string().trim().max(60).optional(),
    startsOn: z.string().date(),
    endsOn: z.string().date(),
    rentKobo: koboString,
    rentFrequency: rentFrequencySchema.default('annual'),
    depositKobo: koboString.optional(),
    // PRD open decision 15 is unresolved, so custody is explicit rather than
    // assumed. 'agency' is the default because a deposit the agency holds is
    // client money it must account for.
    depositCustodian: depositCustodianSchema.default('agency'),
  })
  .refine((v) => v.endsOn > v.startsOn, {
    message: 'The lease must end after it starts',
    path: ['endsOn'],
  });

export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;

export const renewLeaseSchema = z.object({
  leaseId: z.string().uuid(),
  endsOn: z.string().date(),
  /** Omit to carry the existing rent forward unchanged. */
  rentKobo: koboString.optional(),
  /**
   * Carrying the deposit over is the default because it is what agencies do;
   * refunding and re-collecting moves money twice for no reason (LEASE-13).
   */
  carryDeposit: z.boolean().default(true),
});

export type RenewLeaseInput = z.infer<typeof renewLeaseSchema>;

export const recordDepositReceiptSchema = z.object({
  depositId: z.string().uuid(),
  receivedOn: z.string().date(),
});

export type RecordDepositReceiptInput = z.infer<typeof recordDepositReceiptSchema>;

export const proposeDeductionSchema = z.object({
  organisationId: z.string().uuid(),
  depositId: z.string().uuid(),
  amountKobo: koboString,
  // A deduction takes a tenant's money, so it must say why in terms the tenant
  // can read — "damage" is not a reason, "cracked bathroom basin" is.
  reason: z.string().trim().min(5, 'Say what the deduction is for').max(1000),
  evidencePaths: z.array(z.string().trim().min(1).max(500)).default([]),
});

export type ProposeDeductionInput = z.infer<typeof proposeDeductionSchema>;

export const recordHandoverSchema = z.object({
  organisationId: z.string().uuid(),
  leaseId: z.string().uuid(),
  kind: z.enum(['move_in', 'move_out']),
  happenedOn: z.string().date(),
  notes: z.string().trim().max(2000).optional(),
  /** Meter readings as {meter: reading}; which meters exist varies by property. */
  meterReadings: z.record(z.string().trim().min(1).max(60), z.string().trim().max(60)).default({}),
  outstandingBalanceKobo: koboString.optional(),
  keysReturned: z.boolean().optional(),
  evidencePaths: z.array(z.string().trim().min(1).max(500)).default([]),
});

export type RecordHandoverInput = z.infer<typeof recordHandoverSchema>;

export const settleDepositSchema = z.object({
  depositId: z.string().uuid(),
  outcome: z.enum(['refund', 'forfeit', 'transfer']),
  settledOn: z.string().date(),
  transferredToLeaseId: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type SettleDepositInput = z.infer<typeof settleDepositSchema>;

export const terminateLeaseSchema = z.object({
  leaseId: z.string().uuid(),
  terminatedOn: z.string().date(),
  reason: z.string().trim().min(3, 'Give a reason for termination').max(1000),
});

export type TerminateLeaseInput = z.infer<typeof terminateLeaseSchema>;
