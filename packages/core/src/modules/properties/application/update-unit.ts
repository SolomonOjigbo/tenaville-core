import type { UserClient } from '@tenaville/db';
import { fromTransport, toSafeNumber } from '@tenaville/money';

import { updateUnitSchema, type UpdateUnitInput } from '../schema/index';

/** Edit a unit, including its facilities list (PROP-2). */
export const updateUnit = async (client: UserClient, input: UpdateUnitInput): Promise<void> => {
  const parsed = updateUnitSchema.parse(input);

  const { data, error } = await client
    .from('units')
    .update({
      property_id: parsed.propertyId,
      label: parsed.label,
      unit_type: parsed.unitType,
      status: parsed.status,
      reference: parsed.reference ?? null,
      bedrooms: parsed.bedrooms ?? null,
      bathrooms: parsed.bathrooms ?? null,
      floor_area_sqm: parsed.floorAreaSqm ?? null,
      asking_rent_kobo:
        parsed.askingRentKobo === undefined
          ? null
          : toSafeNumber(fromTransport(parsed.askingRentKobo)),
      facilities: parsed.facilities,
      notes: parsed.notes ?? null,
    })
    .eq('id', parsed.unitId)
    .eq('organisation_id', parsed.organisationId)
    .is('archived_at', null)
    .select('id')
    .maybeSingle();

  if (error !== null) throw new Error(`could not update unit: ${error.message}`);
  if (data === null) throw new Error('that unit was not found or has been archived');
};

/** Archive one unit without deleting its history (PROP-2). */
export const archiveUnit = async (
  client: UserClient,
  unitId: string,
  organisationId: string,
): Promise<void> => {
  const { data, error } = await client
    .from('units')
    .update({ archived_at: new Date().toISOString(), status: 'inactive' })
    .eq('id', unitId)
    .eq('organisation_id', organisationId)
    .is('archived_at', null)
    .select('id')
    .maybeSingle();

  if (error !== null) throw new Error(`could not archive unit: ${error.message}`);
  if (data === null) throw new Error('that unit was not found or is already archived');
};
