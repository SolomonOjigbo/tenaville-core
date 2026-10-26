import type { UserClient } from '@tenaville/db';
import { fromTransport } from '@tenaville/money';

import { buildTermCharges, scheduleTotal, toPayload, type ChargeRow } from '../domain/charges';
import { addChargeTermSchema, type AddChargeTermInput } from '../schema/index';

/**
 * The instalments an agreed charge would raise, without writing them
 * (LEASE-2, TV-154).
 *
 * Exposed for the same reason as `planSchedule`: a service charge agreed as
 * "₦120,000 a year, quarterly" is four dated amounts, and seeing them before
 * committing is how a wrong date gets caught.
 */
export const planChargeTerm = (input: AddChargeTermInput): ChargeRow[] => {
  const parsed = addChargeTermSchema.parse(input);

  return buildTermCharges({
    kind: parsed.kind,
    description: parsed.description,
    amountKobo: fromTransport(parsed.amountKobo),
    frequency: parsed.frequency,
    startsOn: parsed.startsOn,
    endsOn: parsed.endsOn,
    dueDay: parsed.dueDay,
    partPeriod: parsed.partPeriod,
  });
};

/**
 * Agree a non-rent charge on a tenancy and raise its instalments (LEASE-2).
 *
 * One round trip, because a term whose instalments failed to insert is an
 * agreement nobody has been billed for, and no screen would say so.
 *
 * The charges are ordinary rows in `charges`, so everything downstream —
 * allocation, arrears ageing, the landlord statement — treats a service charge
 * exactly as it treats rent.
 */
export const addChargeTerm = async (
  client: UserClient,
  input: AddChargeTermInput,
): Promise<{ termId: string; instalments: number; totalKobo: string }> => {
  const parsed = addChargeTermSchema.parse(input);
  const rows = planChargeTerm(parsed);

  const { data, error } = await client.rpc('add_lease_charge_term', {
    target_lease_id: parsed.leaseId,
    term_kind: parsed.kind,
    term_description: parsed.description,
    term_amount_kobo: Number(fromTransport(parsed.amountKobo)),
    term_frequency: parsed.frequency,
    term_starts_on: parsed.startsOn,
    term_ends_on: parsed.endsOn,
    charge_rows: toPayload(rows),
    ...(parsed.dueDay === undefined ? {} : { term_due_day: parsed.dueDay }),
  });

  if (error !== null) throw new Error(`could not agree the charge: ${error.message}`);
  if (typeof data !== 'string') throw new Error('add_lease_charge_term returned no term id');

  return {
    termId: data,
    instalments: rows.length,
    totalKobo: scheduleTotal(rows).toString(),
  };
};
