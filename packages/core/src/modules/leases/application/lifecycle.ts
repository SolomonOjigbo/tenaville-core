import type { UserClient } from '@tenaville/db';

import {
  settleDepositSchema,
  terminateLeaseSchema,
  type SettleDepositInput,
  type TerminateLeaseInput,
} from '../schema/index';

/**
 * Settle a held deposit (LEASE-13).
 *
 * The database computes the refund from approved deductions: settlement is not
 * allowed to invent a number the ledger cannot support.
 */
export const settleDeposit = async (
  client: UserClient,
  input: SettleDepositInput,
): Promise<void> => {
  const parsed = settleDepositSchema.parse(input);
  const { error } = await client.rpc('settle_deposit', {
    p_deposit_id: parsed.depositId,
    p_outcome: parsed.outcome,
    p_settled_on: parsed.settledOn,
    ...(parsed.transferredToLeaseId === undefined
      ? {}
      : { p_transferred_to_lease_id: parsed.transferredToLeaseId }),
    ...(parsed.notes === undefined ? {} : { p_notes: parsed.notes }),
  });

  if (error !== null) throw new Error(`could not settle deposit: ${error.message}`);
};

/** End a tenancy early with a recorded reason (LEASE-3, LEASE-5). */
export const terminateLease = async (
  client: UserClient,
  input: TerminateLeaseInput,
): Promise<void> => {
  const parsed = terminateLeaseSchema.parse(input);
  const { error } = await client.rpc('terminate_lease', {
    p_lease_id: parsed.leaseId,
    p_terminated_on: parsed.terminatedOn,
    p_reason: parsed.reason,
  });

  if (error !== null) throw new Error(`could not terminate lease: ${error.message}`);
};
