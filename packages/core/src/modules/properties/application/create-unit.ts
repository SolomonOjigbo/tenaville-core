import type { UserClient } from '@tenaville/db';
import { fromTransport, toSafeNumber } from '@tenaville/money';

import { createUnitSchema, type CreateUnitInput } from '../schema/index.js';

/**
 * Create a unit (PROP-2, PROP-3).
 *
 * Rent amounts arrive as integer-kobo strings, because bigint cannot cross
 * JSON. They are converted at the database boundary by `toSafeNumber`, which
 * throws rather than silently losing precision: Supabase's generated types
 * expose bigint columns as `number`, and that is only safe while something
 * checks the range (PRD §10.1).
 */
export const createUnit = async (
  client: UserClient,
  input: CreateUnitInput,
): Promise<{ unitId: string }> => {
  const parsed = createUnitSchema.parse(input);

  const { data, error } = await client
    .from('units')
    .insert({
      organisation_id: parsed.organisationId,
      property_id: parsed.propertyId,
      label: parsed.label,
      unit_type: parsed.unitType,
      status: parsed.status,
      facilities: parsed.facilities,
      ...(parsed.reference === undefined ? {} : { reference: parsed.reference }),
      ...(parsed.bedrooms === undefined ? {} : { bedrooms: parsed.bedrooms }),
      ...(parsed.bathrooms === undefined ? {} : { bathrooms: parsed.bathrooms }),
      ...(parsed.floorAreaSqm === undefined ? {} : { floor_area_sqm: parsed.floorAreaSqm }),
      ...(parsed.askingRentKobo === undefined
        ? {}
        : { asking_rent_kobo: toSafeNumber(fromTransport(parsed.askingRentKobo)) }),
      ...(parsed.contractedRentKobo === undefined
        ? {}
        : { contracted_rent_kobo: toSafeNumber(fromTransport(parsed.contractedRentKobo)) }),
      ...(parsed.notes === undefined ? {} : { notes: parsed.notes }),
    })
    .select('id')
    .single();

  if (error !== null) throw new Error(`could not create unit: ${error.message}`);
  return { unitId: data.id };
};
