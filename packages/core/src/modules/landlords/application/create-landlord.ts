import type { UserClient } from '@tenaville/db';

import { createLandlordSchema, type CreateLandlordInput } from '../schema/index.js';

/**
 * Record a landlord (OWN-1).
 *
 * Remittance details are deliberately not accepted here. They live in their
 * own table with a narrower policy, and setting them is a separate, audited
 * action — see setRemittanceDetails.
 */
export const createLandlord = async (
  client: UserClient,
  input: CreateLandlordInput,
): Promise<{ landlordId: string }> => {
  const parsed = createLandlordSchema.parse(input);

  const { data, error } = await client
    .from('landlords')
    .insert({
      organisation_id: parsed.organisationId,
      display_name: parsed.displayName,
      is_organisation: parsed.isOrganisation,
      preferred_channel: parsed.preferredChannel,
      ...(parsed.phone === undefined ? {} : { phone: parsed.phone }),
      ...(parsed.email === undefined ? {} : { email: parsed.email }),
      ...(parsed.addressLine === undefined ? {} : { address_line: parsed.addressLine }),
      ...(parsed.stateCode === undefined ? {} : { state_code: parsed.stateCode }),
      ...(parsed.lga === undefined ? {} : { lga: parsed.lga }),
      ...(parsed.notes === undefined ? {} : { notes: parsed.notes }),
    })
    .select('id')
    .single();

  if (error !== null) throw new Error(`could not create landlord: ${error.message}`);
  return { landlordId: data.id };
};
