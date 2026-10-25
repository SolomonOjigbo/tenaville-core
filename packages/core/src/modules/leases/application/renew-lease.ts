import type { UserClient } from '@tenaville/db';
import { fromTransport, toSafeNumber } from '@tenaville/money';

import { renewLeaseSchema, type RenewLeaseInput } from '../schema/index';

/**
 * Renew a lease (LEASE-4, LEASE-11).
 *
 * The renewal is a new lease pointing at the one it replaces; the old lease
 * moves to 'renewed' with its terms untouched. That is what lets a dispute
 * about last year's rent be answered next year.
 *
 * In the database because three things must happen together: closing the old
 * lease, opening the new one without tripping the no-overlapping-active-leases
 * constraint, and transferring the deposit. Done as separate calls, a failure
 * between them leaves a unit with two active leases or a deposit attached to a
 * closed tenancy.
 */
export const renewLease = async (
  client: UserClient,
  input: RenewLeaseInput,
): Promise<{ renewalLeaseId: string }> => {
  const parsed = renewLeaseSchema.parse(input);

  const { data, error } = await client.rpc('renew_lease', {
    source_lease_id: parsed.leaseId,
    new_ends_on: parsed.endsOn,
    carry_deposit: parsed.carryDeposit,
    ...(parsed.rentKobo === undefined
      ? {}
      : { new_rent_kobo: toSafeNumber(fromTransport(parsed.rentKobo)) }),
  });

  if (error !== null) throw new Error(`could not renew lease: ${error.message}`);
  if (typeof data !== 'string') throw new Error('renew_lease returned no lease id');

  return { renewalLeaseId: data };
};
