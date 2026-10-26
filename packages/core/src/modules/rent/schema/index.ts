import { z } from 'zod';

/** Integer kobo as a transport string: bigint cannot cross JSON. */
const koboString = z.string().regex(/^\d+$/, 'Enter an amount in kobo');

/**
 * How a final part period is charged.
 *
 * One value, deliberately. See `PartPeriodTreatment` in the domain: pro-rating
 * needs a rounding rule that is still an open product decision.
 */
export const partPeriodTreatmentSchema = z.enum(['charge_in_full']);

const instalmentSchema = z.object({
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  dueOn: z.string().date(),
  amountKobo: koboString,
});

/**
 * Activating a lease.
 *
 * The schedule is either derived from a periodic rent or supplied as
 * instalments. A discriminated union rather than a bag of optional fields, so
 * an irregular lease cannot be activated with a part-period rule that means
 * nothing, and a monthly one cannot be activated with instalments that would
 * be ignored.
 */
export const activateLeaseSchema = z.discriminatedUnion('rentFrequency', [
  z.object({
    leaseId: z.string().uuid(),
    rentFrequency: z.enum(['annual', 'half_yearly', 'quarterly', 'monthly']),
    startsOn: z.string().date(),
    endsOn: z.string().date(),
    rentKobo: koboString,
    dueDay: z.number().int().min(1).max(28).optional(),
    firstDueOn: z.string().date().optional(),
    partPeriod: partPeriodTreatmentSchema.default('charge_in_full'),
  }),
  z.object({
    leaseId: z.string().uuid(),
    rentFrequency: z.literal('irregular'),
    startsOn: z.string().date(),
    endsOn: z.string().date(),
    /** The total for the term; the instalments must add up to it. */
    rentKobo: koboString,
    instalments: z.array(instalmentSchema).min(1, 'Add at least one instalment'),
  }),
]);

export type ActivateLeaseInput = z.infer<typeof activateLeaseSchema>;

/**
 * Agreeing a non-rent charge on a tenancy (LEASE-2, TV-154).
 *
 * `kind` excludes rent on purpose: rent's terms are on the lease, and two
 * places to state it would eventually disagree. The database carries the same
 * constraint, so this is a courtesy to the caller rather than the guarantee.
 */
export const nonRentChargeKindSchema = z.enum(['service_charge', 'utility', 'agreed_fee']);

export const chargeFrequencySchema = z.enum([
  'one_off',
  'monthly',
  'quarterly',
  'half_yearly',
  'annual',
]);

export const addChargeTermSchema = z
  .object({
    leaseId: z.string().uuid(),
    kind: nonRentChargeKindSchema,
    description: z.string().trim().min(2, 'Say what the charge is for').max(200),
    amountKobo: koboString,
    frequency: chargeFrequencySchema,
    startsOn: z.string().date(),
    endsOn: z.string().date(),
    dueDay: z.number().int().min(1).max(28).optional(),
    partPeriod: partPeriodTreatmentSchema.default('charge_in_full'),
  })
  .refine((v) => v.endsOn >= v.startsOn, {
    message: 'The charge must end on or after it starts',
    path: ['endsOn'],
  })
  .refine((v) => v.frequency !== 'one_off' || v.dueDay === undefined, {
    message: 'A due day means nothing for a single charge',
    path: ['dueDay'],
  });

export type AddChargeTermInput = z.infer<typeof addChargeTermSchema>;
