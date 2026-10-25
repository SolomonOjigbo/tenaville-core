import type { UserClient } from '@tenaville/db';
import { fromTransport, toSafeNumber } from '@tenaville/money';

import { recordHandoverSchema, type RecordHandoverInput } from '../schema/index';

/**
 * Record a move-in or move-out (LEASE-5).
 *
 * Meter readings are stored as a map because which meters exist varies by
 * property — electricity, water, gas, a shared generator — and an agency
 * should not need a migration to record one more.
 *
 * The outstanding balance is the figure the parties agreed on the day. Step 4
 * computes a balance from charges; this records what was observed and signed
 * for, and the two are allowed to differ — which is itself useful evidence.
 */
export const recordHandover = async (
  client: UserClient,
  input: RecordHandoverInput,
): Promise<{ handoverId: string }> => {
  const parsed = recordHandoverSchema.parse(input);

  const { data, error } = await client
    .from('lease_handovers')
    .insert({
      organisation_id: parsed.organisationId,
      lease_id: parsed.leaseId,
      kind: parsed.kind,
      happened_on: parsed.happenedOn,
      meter_readings: parsed.meterReadings,
      evidence_paths: parsed.evidencePaths,
      ...(parsed.notes === undefined ? {} : { notes: parsed.notes }),
      ...(parsed.keysReturned === undefined ? {} : { keys_returned: parsed.keysReturned }),
      ...(parsed.outstandingBalanceKobo === undefined
        ? {}
        : {
            outstanding_balance_kobo: toSafeNumber(fromTransport(parsed.outstandingBalanceKobo)),
          }),
    })
    .select('id')
    .single();

  if (error !== null) throw new Error(`could not record handover: ${error.message}`);
  return { handoverId: data.id };
};
