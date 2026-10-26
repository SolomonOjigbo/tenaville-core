import type { UserClient } from '@tenaville/db';
import { fromTransport, toSafeNumber } from '@tenaville/money';

import { generateRentPeriods } from '../domain/schedule';
import { createLeaseSchema, type CreateLeaseInput } from '../schema/index';

/**
 * Create a lease directly from a tenant and a unit (LEASE-12).
 *
 * The R1 default path: no application, no screening. Creation from an approved
 * screening application is additive in R2 and must not become a prerequisite.
 *
 * Delegates to `create_lease_with_tenant` so the lease, its tenant party and
 * its deposit land in one transaction. A lease with no party cannot be
 * activated, and a deposit whose insert failed separately would understate
 * what the agency holds — so these are not three round trips.
 *
 * The lease arrives as a draft. Activating it raises the rent schedule, which
 * is the rent module's work: see `activateLease` in
 * `@tenaville/core/modules/rent`, which does both in one transaction. Keeping
 * the two apart means this function cannot produce a lease that is active and
 * owes nothing.
 */
export const createLease = async (
  client: UserClient,
  input: CreateLeaseInput,
): Promise<{ leaseId: string }> => {
  const parsed = createLeaseSchema.parse(input);

  // Checked before the write, and the result discarded: terms that cannot
  // produce a schedule are not terms worth storing. An irregular rent has no
  // schedule to derive — its instalments are agreed and supplied at activation
  // — so there is nothing to check here beyond what the database constrains.
  if (parsed.rentFrequency !== 'irregular') {
    generateRentPeriods({
      startsOn: parsed.startsOn,
      endsOn: parsed.endsOn,
      frequency: parsed.rentFrequency,
    });
  }

  const { data, error } = await client.rpc('create_lease_with_tenant', {
    target_organisation_id: parsed.organisationId,
    target_unit_id: parsed.unitId,
    target_tenant_id: parsed.tenantId,
    lease_starts_on: parsed.startsOn,
    lease_ends_on: parsed.endsOn,
    lease_rent_kobo: toSafeNumber(fromTransport(parsed.rentKobo)),
    lease_rent_frequency: parsed.rentFrequency,
    activate: false,
    ...(parsed.reference === undefined ? {} : { lease_reference: parsed.reference }),
    ...(parsed.depositKobo === undefined
      ? {}
      : {
          deposit_amount_kobo: toSafeNumber(fromTransport(parsed.depositKobo)),
          deposit_custodian: parsed.depositCustodian,
        }),
  });

  if (error !== null) throw new Error(`could not create lease: ${error.message}`);
  if (typeof data !== 'string') throw new Error('create_lease_with_tenant returned no lease id');

  return { leaseId: data };
};
