import type { UserClient } from '@tenaville/db';

import { createPropertySchema, type CreatePropertyInput } from '../schema/index';

/**
 * Create a property (PROP-1, PROP-5).
 *
 * One landlord in R1. Ownership shares and multiple landlords are a later
 * release, so this takes a single landlordId rather than a list — a list now
 * would be a guess at a shape we have not designed.
 *
 * A database trigger rejects a landlord from another organisation, so a crafted
 * request cannot attach someone else's landlord to your property.
 */
export const createProperty = async (
  client: UserClient,
  input: CreatePropertyInput,
): Promise<{ propertyId: string }> => {
  const parsed = createPropertySchema.parse(input);

  const { data, error } = await client
    .from('properties')
    .insert({
      organisation_id: parsed.organisationId,
      landlord_id: parsed.landlordId,
      name: parsed.name,
      property_type: parsed.propertyType,
      address_line: parsed.addressLine,
      state_code: parsed.stateCode,
      ...(parsed.branchId === undefined ? {} : { branch_id: parsed.branchId }),
      ...(parsed.reference === undefined ? {} : { reference: parsed.reference }),
      ...(parsed.lga === undefined ? {} : { lga: parsed.lga }),
      ...(parsed.area === undefined ? {} : { area: parsed.area }),
      ...(parsed.latitude === undefined ? {} : { latitude: parsed.latitude }),
      ...(parsed.longitude === undefined ? {} : { longitude: parsed.longitude }),
      ...(parsed.notes === undefined ? {} : { notes: parsed.notes }),
    })
    .select('id')
    .single();

  if (error !== null) throw new Error(`could not create property: ${error.message}`);
  return { propertyId: data.id };
};
