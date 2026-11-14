import type { UserClient } from '@tenaville/db';
import { fromTransport, toSafeNumber } from '@tenaville/money';

import {
  createDepositSchema,
  proposeDeductionSchema,
  recordDepositReceiptSchema,
  type CreateDepositInput,
  type ProposeDeductionInput,
  type RecordDepositReceiptInput,
} from '../schema/index';

/** Add a caution deposit to a lease that was created without one (LEASE-13). */
export const createDeposit = async (
  client: UserClient,
  input: CreateDepositInput,
): Promise<{ depositId: string }> => {
  const parsed = createDepositSchema.parse(input);
  const { data, error } = await client
    .from('lease_deposits')
    .insert({
      organisation_id: parsed.organisationId,
      lease_id: parsed.leaseId,
      amount_kobo: toSafeNumber(fromTransport(parsed.amountKobo)),
      custodian: parsed.custodian,
      status: 'expected',
    })
    .select('id')
    .single();

  if (error !== null) throw new Error(`could not add deposit: ${error.message}`);
  return { depositId: data.id };
};

/**
 * Record that a deposit has arrived (LEASE-13).
 *
 * Moves 'expected' to 'held'. The database refuses 'held' without a received
 * date, so the two always travel together.
 */
export const recordDepositReceipt = async (
  client: UserClient,
  input: RecordDepositReceiptInput,
): Promise<void> => {
  const parsed = recordDepositReceiptSchema.parse(input);

  const { error } = await client
    .from('lease_deposits')
    .update({ status: 'held', received_on: parsed.receivedOn })
    .eq('id', parsed.depositId);

  if (error !== null) throw new Error(`could not record deposit receipt: ${error.message}`);
};

/**
 * Propose a deduction at move-out (LEASE-13).
 *
 * Deliberately unapproved: a deduction takes a tenant's money, so proposing and
 * approving are separate acts. An unapproved proposal may exceed the deposit
 * while it is still being discussed — the database checks the total only when
 * one is approved.
 */
export const proposeDeduction = async (
  client: UserClient,
  input: ProposeDeductionInput,
): Promise<{ deductionId: string }> => {
  const parsed = proposeDeductionSchema.parse(input);

  const { data, error } = await client
    .from('deposit_deductions')
    .insert({
      organisation_id: parsed.organisationId,
      deposit_id: parsed.depositId,
      amount_kobo: toSafeNumber(fromTransport(parsed.amountKobo)),
      reason: parsed.reason,
      evidence_paths: parsed.evidencePaths,
    })
    .select('id')
    .single();

  if (error !== null) throw new Error(`could not propose deduction: ${error.message}`);
  return { deductionId: data.id };
};

/**
 * Approve a proposed deduction (LEASE-13).
 *
 * The database rejects an approval that would take the approved total past the
 * deposit held, so an agency cannot deduct more than it has.
 *
 * Approving is the one field a deduction allows to change after the fact: the
 * amount and the reason are append-only, and a correction is a linked reversal
 * row (PRD §10.2).
 */
export const approveDeduction = async (
  client: UserClient,
  deductionId: string,
  approverUserId: string,
): Promise<void> => {
  const { error } = await client
    .from('deposit_deductions')
    .update({ approved_by: approverUserId, approved_at: new Date().toISOString() })
    .eq('id', deductionId);

  if (error !== null) {
    throw new Error(`could not approve deduction: ${error.message}`);
  }
};
