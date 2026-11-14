import { z } from 'zod';

export const propertyTypeSchema = z.enum([
  'residential',
  'commercial',
  'mixed_use',
  'estate',
  'land',
]);

export const unitTypeSchema = z.enum([
  'flat',
  'self_contained',
  'room',
  'duplex',
  'bungalow',
  'shop',
  'office',
  'warehouse',
  'other',
]);

export const unitStatusSchema = z.enum([
  'vacant',
  'occupied',
  'reserved',
  'under_maintenance',
  'inactive',
]);

export const createPropertySchema = z
  .object({
    organisationId: z.string().uuid(),
    landlordId: z.string().uuid(),
    branchId: z.string().uuid().optional(),
    name: z.string().trim().min(2, 'Enter the property name').max(200),
    reference: z.string().trim().max(60).optional(),
    propertyType: propertyTypeSchema,
    addressLine: z.string().trim().min(3, 'Enter the address').max(300),
    stateCode: z.string().trim().toUpperCase().length(2),
    lga: z.string().trim().max(120).optional(),
    area: z.string().trim().max(120).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  // A lone coordinate is a data-entry slip, not half a location.
  .refine((v) => (v.latitude === undefined) === (v.longitude === undefined), {
    message: 'Give both latitude and longitude, or neither',
    path: ['longitude'],
  });

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

export const createUnitSchema = z.object({
  organisationId: z.string().uuid(),
  propertyId: z.string().uuid(),
  label: z.string().trim().min(1, 'Enter the unit label').max(60),
  reference: z.string().trim().max(60).optional(),
  unitType: unitTypeSchema,
  status: unitStatusSchema.default('vacant'),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(50).optional(),
  floorAreaSqm: z.number().positive().optional(),
  /**
   * The agency's advertised figure for a vacant unit, as integer kobo in a
   * transport string (bigint cannot cross JSON).
   *
   * There is no contracted rent here: once a lease exists it is authoritative
   * for rent, and a second stored copy could drift from it — which is how a
   * tenant gets billed the wrong amount. The column was dropped in the
   * tenancy migration.
   */
  askingRentKobo: z.string().regex(/^\d+$/).optional(),
  facilities: z.array(z.string().trim().min(1).max(60)).default([]),
  notes: z.string().trim().max(2000).optional(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;

export const updatePropertySchema = createPropertySchema.and(
  z.object({ propertyId: z.string().uuid() }),
);

export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

export const updateUnitSchema = createUnitSchema.and(z.object({ unitId: z.string().uuid() }));

export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

export const archivePropertySchema = z.object({
  propertyId: z.string().uuid(),
  organisationId: z.string().uuid(),
});

export const archiveUnitSchema = z.object({
  unitId: z.string().uuid(),
  organisationId: z.string().uuid(),
});
