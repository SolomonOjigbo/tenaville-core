import type { UserClient } from '@tenaville/db';

import { createStatementSchema, type CreateStatementInput } from '../schema/index';

/**
 * Freeze a landlord's ledger for a period into a draft statement (LEDGER-2,
 * LEDGER-8).
 *
 * The database function computes the opening balance from entries before the
 * period and copies the period's entries into the statement, so the numbers
 * cannot be assembled differently by a second client.
 */
export const createStatement = async (
  client: UserClient,
  input: CreateStatementInput,
): Promise<{ statementId: string }> => {
  const parsed = createStatementSchema.parse(input);

  const { data, error } = await client.rpc('create_statement', {
    target_organisation_id: parsed.organisationId,
    target_landlord_id: parsed.landlordId,
    period_starts_on: parsed.periodStart,
    period_ends_on: parsed.periodEnd,
    ...(parsed.supersedesStatementId === undefined
      ? {}
      : { source_statement_id: parsed.supersedesStatementId }),
  });

  if (error !== null) throw new Error(`could not create the statement: ${error.message}`);
  if (typeof data !== 'string') throw new Error('create_statement returned no id');

  return { statementId: data };
};

/** Mark a draft statement reviewed (LEDGER-8). */
export const reviewStatement = async (client: UserClient, statementId: string): Promise<void> => {
  const { error } = await client.rpc('review_statement', { target_statement_id: statementId });
  if (error !== null) throw new Error(`could not review the statement: ${error.message}`);
};

/** Issue a reviewed statement. From here the row is immutable (LEDGER-8). */
export const issueStatement = async (client: UserClient, statementId: string): Promise<void> => {
  const { error } = await client.rpc('issue_statement', { target_statement_id: statementId });
  if (error !== null) throw new Error(`could not issue the statement: ${error.message}`);
};
