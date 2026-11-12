import type { UserClient } from '@tenaville/db';
import { fromTransport, toSafeNumber } from '@tenaville/money';

import { recordRemittanceSchema, type RecordRemittanceInput } from '../schema/index';

/**
 * Record money paid out to a landlord (LEDGER-1).
 *
 * The database function writes the remittance and its ledger debit in one
 * transaction, and checks the caller's role there as well as here. A retried
 * form submission creates a second remittance — there is no client mutation
 * key yet, which is why the form warns before submitting under a slow
 * connection.
 */
export const recordRemittance = async (
  client: UserClient,
  input: RecordRemittanceInput,
): Promise<{ remittanceId: string }> => {
  const parsed = recordRemittanceSchema.parse(input);

  const { data, error } = await client.rpc('record_remittance', {
    target_organisation_id: parsed.organisationId,
    target_landlord_id: parsed.landlordId,
    remittance_amount_kobo: toSafeNumber(fromTransport(parsed.amountKobo)),
    remittance_paid_on: parsed.paidOn,
    remittance_method: parsed.method,
    ...(parsed.reference === undefined ? {} : { remittance_reference: parsed.reference }),
  });

  if (error !== null) throw new Error(`could not record the remittance: ${error.message}`);
  if (typeof data !== 'string') throw new Error('record_remittance returned no id');

  return { remittanceId: data };
};
