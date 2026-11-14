import type { UserClient } from '@tenaville/db';

import { updatePropertySchema, type UpdatePropertyInput } from '../schema/index';

/** Edit a property's descriptive and ownership fields (PROP-1). */
export const updateProperty = async (
  client: UserClient,
  input: UpdatePropertyInput,
): Promise<void> => {
  const parsed = updatePropertySchema.parse(input);

  const { data, error } = await client
    .from('properties')
    .update({
      landlord_id: parsed.landlordId,
      name: parsed.name,
      property_type: parsed.propertyType,
      address_line: parsed.addressLine,
      state_code: parsed.stateCode,
      reference: parsed.reference ?? null,
      lga: parsed.lga ?? null,
      area: parsed.area ?? null,
      latitude: parsed.latitude ?? null,
      longitude: parsed.longitude ?? null,
      notes: parsed.notes ?? null,
      ...(parsed.branchId === undefined ? {} : { branch_id: parsed.branchId }),
    })
    .eq('id', parsed.propertyId)
    .eq('organisation_id', parsed.organisationId)
    .is('archived_at', null)
    .select('id')
    .maybeSingle();

  if (error !== null) throw new Error(`could not update property: ${error.message}`);
  if (data === null) throw new Error('that property was not found or has been archived');
};

/** Archive a property and its remaining units (PROP-1). */
export const archiveProperty = async (
  client: UserClient,
  propertyId: string,
  organisationId: string,
): Promise<void> => {
  const archivedAt = new Date().toISOString();
  const { data, error } = await client
    .from('properties')
    .update({ archived_at: archivedAt })
    .eq('id', propertyId)
    .eq('organisation_id', organisationId)
    .is('archived_at', null)
    .select('id')
    .maybeSingle();

  if (error !== null) throw new Error(`could not archive property: ${error.message}`);
  if (data === null) throw new Error('that property was not found or is already archived');

  const { error: unitsError } = await client
    .from('units')
    .update({ archived_at: archivedAt })
    .eq('property_id', propertyId)
    .eq('organisation_id', organisationId)
    .is('archived_at', null);

  if (unitsError !== null) {
    throw new Error(
      `property archived, but its units could not be archived: ${unitsError.message}`,
    );
  }
};
