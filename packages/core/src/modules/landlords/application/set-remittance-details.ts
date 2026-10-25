import type { UserClient } from '@tenaville/db';

import { remittanceDetailsSchema, type RemittanceDetailsInput } from '../schema/index';

/**
 * Set or change where a landlord is paid (OWN-1).
 *
 * This is the highest-value write in the system for an attacker: changing an
 * account number redirects a landlord's rent. Three things follow from that.
 *
 *  - A reason is mandatory, validated before the round trip.
 *  - The table's policy restricts this to owner, admin and accountant; a
 *    letting agent or caretaker cannot reach the row at all.
 *  - A database trigger audits every change with the account number masked to
 *    its last four digits, so the trail answers "who changed this and when"
 *    without becoming a second copy of the sensitive value.
 *
 * Upsert rather than insert: a landlord has at most one remittance destination,
 * and changing it is the common case.
 */
export const setRemittanceDetails = async (
  client: UserClient,
  organisationId: string,
  input: RemittanceDetailsInput,
): Promise<void> => {
  const parsed = remittanceDetailsSchema.parse(input);

  const { error } = await client.from('landlord_remittance_details').upsert(
    {
      landlord_id: parsed.landlordId,
      organisation_id: organisationId,
      bank_name: parsed.bankName,
      account_name: parsed.accountName,
      account_number: parsed.accountNumber,
    },
    { onConflict: 'landlord_id' },
  );

  if (error !== null) {
    throw new Error(`could not set remittance details: ${error.message}`);
  }
};
