import type { UserClient } from '@tenaville/db';
import { fromTransport } from '@tenaville/money';

import {
  buildIrregularCharges,
  buildPeriodicCharges,
  scheduleTotal,
  toPayload,
  type ChargeRow,
} from '../domain/charges';
import { activateLeaseSchema, type ActivateLeaseInput } from '../schema/index';

/**
 * Build the schedule a lease would be activated with, without writing it
 * (RENT-1).
 *
 * Exposed so a UI can show an agent the dates and amounts before they commit:
 * a wrong end date is obvious in a list of twelve due dates and invisible in a
 * form field.
 */
export const planSchedule = (input: ActivateLeaseInput): ChargeRow[] => {
  const parsed = activateLeaseSchema.parse(input);

  if (parsed.rentFrequency === 'irregular') {
    return buildIrregularCharges({
      startsOn: parsed.startsOn,
      endsOn: parsed.endsOn,
      totalKobo: fromTransport(parsed.rentKobo),
      instalments: parsed.instalments.map((instalment) => ({
        periodStart: instalment.periodStart,
        periodEnd: instalment.periodEnd,
        dueOn: instalment.dueOn,
        amountKobo: fromTransport(instalment.amountKobo),
      })),
    });
  }

  return buildPeriodicCharges({
    startsOn: parsed.startsOn,
    endsOn: parsed.endsOn,
    frequency: parsed.rentFrequency,
    rentKobo: fromTransport(parsed.rentKobo),
    dueDay: parsed.dueDay,
    firstDueOn: parsed.firstDueOn,
    partPeriod: parsed.partPeriod,
  });
};

/**
 * Activate a draft lease and raise its rent schedule (RENT-1, LEASE-3).
 *
 * One round trip, because the two cannot be allowed to come apart: a lease
 * that went active while its charges failed to insert owes nothing and looks
 * healthy, and the first sign of trouble is a landlord statement that is
 * short.
 *
 * The schedule is computed here and validated in the database — coverage,
 * contiguity, numbering and amounts against the lease's own terms. The
 * database does not recompute the dates: one definition of a quarter, not two.
 */
export const activateLease = async (
  client: UserClient,
  input: ActivateLeaseInput,
): Promise<{ chargesRaised: number; totalKobo: string }> => {
  const parsed = activateLeaseSchema.parse(input);
  const rows = planSchedule(parsed);

  const { data, error } = await client.rpc('activate_lease', {
    target_lease_id: parsed.leaseId,
    charge_rows: toPayload(rows),
  });

  if (error !== null) throw new Error(`could not activate the lease: ${error.message}`);
  if (typeof data !== 'number') throw new Error('activate_lease returned no charge count');

  return { chargesRaised: data, totalKobo: scheduleTotal(rows).toString() };
};
