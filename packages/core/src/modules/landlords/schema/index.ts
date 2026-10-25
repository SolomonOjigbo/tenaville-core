import { z } from 'zod';

/** Nigerian phone numbers, stored normalised in E.164. */
const nigerianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^(\+234\d{10}|0\d{10})$/.test(v), 'Enter a Nigerian phone number')
  // 08030000001 and +2348030000001 are the same number; store one form.
  .transform((v) => (v.startsWith('0') ? `+234${v.slice(1)}` : v));

export const createLandlordSchema = z.object({
  organisationId: z.string().uuid(),
  displayName: z.string().trim().min(2, 'Enter the landlord name').max(200),
  isOrganisation: z.boolean().default(false),
  phone: nigerianPhone.optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  preferredChannel: z.enum(['phone', 'sms', 'whatsapp', 'email']).default('whatsapp'),
  addressLine: z.string().trim().max(300).optional(),
  stateCode: z.string().trim().toUpperCase().length(2).optional(),
  lga: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type CreateLandlordInput = z.infer<typeof createLandlordSchema>;

export const remittanceDetailsSchema = z.object({
  landlordId: z.string().uuid(),
  bankName: z.string().trim().min(2).max(120),
  accountName: z.string().trim().min(2).max(200),
  // NUBAN account numbers are exactly 10 digits.
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'A Nigerian account number is 10 digits'),
  // Redirecting a landlord's money is the highest-value change in the system,
  // so it always says why (OWN-1, §10.7).
  reason: z.string().trim().min(3, 'Give a reason for the change').max(500),
});

export type RemittanceDetailsInput = z.infer<typeof remittanceDetailsSchema>;

export const createMandateSchema = z
  .object({
    organisationId: z.string().uuid(),
    landlordId: z.string().uuid(),
    reference: z.string().trim().max(60).optional(),
    commissionType: z.enum(['percentage', 'fixed']),
    /** Basis points: 1000 = 10.00%. An integer, because it divides rent. */
    commissionRateBps: z.number().int().min(0).max(10_000).optional(),
    /** Integer kobo, as a transport string (bigint cannot cross JSON). */
    commissionFixedKobo: z.string().regex(/^\d+$/).optional(),
    commissionBasis: z.enum(['on_receipt', 'on_invoice']).default('on_receipt'),
    remittanceSchedule: z
      .enum(['on_receipt', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'annually'])
      .default('monthly'),
    permittedDeductions: z
      .array(
        z.enum([
          'commission',
          'maintenance',
          'service_charge',
          'utilities',
          'statutory_fee',
          'agency_expense',
          'other',
        ]),
      )
      .default(['commission', 'maintenance']),
    startsOn: z.string().date(),
    endsOn: z.string().date().optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine(
    (v) =>
      v.commissionType === 'percentage'
        ? v.commissionRateBps !== undefined && v.commissionFixedKobo === undefined
        : v.commissionFixedKobo !== undefined && v.commissionRateBps === undefined,
    { message: 'Give a rate for a percentage mandate, or an amount for a fixed one' },
  )
  // Commission is itself a deduction; a mandate that forbids it would make the
  // agency's own fee unremittable. The database enforces this too.
  .refine((v) => v.permittedDeductions.includes('commission'), {
    message: 'Commission must be a permitted deduction',
    path: ['permittedDeductions'],
  });

export type CreateMandateInput = z.infer<typeof createMandateSchema>;
