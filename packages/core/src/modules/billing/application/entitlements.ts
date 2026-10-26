import type { UserClient } from '@tenaville/db';

import type {
  Allowance,
  Entitlements,
  LimitVerdict,
  UsageBand,
  UsageMetric,
  UsageWarning,
} from '../domain/entitlements';

/**
 * Read what the caller's organisation is entitled to (BILL-3, TV-147).
 *
 * Calls `plan_entitlements()`, which takes no organisation id: it answers for
 * the organisations the caller is a member of. There is deliberately no
 * variant that takes one, because `subscriptions` is readable by owners,
 * admins and accountants only — a property manager looking at a usage bar
 * would otherwise see nothing, and the limits they work inside are not a
 * secret from them.
 *
 * Returns null when the caller belongs to no organisation, which is a real
 * state during signup rather than an error.
 */
export const fetchEntitlements = async (
  client: UserClient,
  organisationId?: string,
): Promise<Entitlements | null> => {
  const { data, error } = await client.rpc('plan_entitlements');

  if (error !== null) throw new Error(`could not read the plan: ${error.message}`);

  const rows = data ?? [];
  const row =
    organisationId === undefined
      ? rows[0]
      : rows.find((candidate) => candidate.organisation_id === organisationId);
  if (row === undefined) return null;

  const allowance = (
    used: number | null,
    limit: number | null,
    verdict: string | null,
    overage: number | null,
  ): Allowance => ({
    used: used ?? 0,
    limit,
    verdict: (verdict ?? 'unlimited') as LimitVerdict,
    // Kobo crosses the boundary as a bigint the moment it is in our hands:
    // a per-unit price is money, and money is not a JS number (PRD §10.1).
    overageKobo: overage === null ? null : BigInt(overage),
  });

  return {
    organisationId: row.organisation_id,
    planId: row.plan_id ?? 'free',
    planName: row.plan_name ?? 'Free',
    tier: row.tier ?? 'free',
    properties: allowance(row.properties_used, row.property_limit, row.properties_verdict, null),
    units: allowance(row.units_used, row.unit_limit, row.units_verdict, row.unit_overage_kobo),
    users: allowance(row.users_used, row.user_limit, row.users_verdict, row.extra_user_kobo),
    storageMb: row.storage_mb,
    includedMessages: row.included_messages,
    features: row.features ?? [],
  };
};

/**
 * Read the usage warnings for the caller's organisation (BILL-3, TV-148).
 *
 * The bands come from the database, which is also what decides when a reminder
 * goes out. Recomputing 80% here would give the screen and the reminder two
 * definitions of "nearly full".
 *
 * Storage and messages are absent from the result because nothing measures
 * them yet — a document registry (TV-052) and the message log (TV-038). They
 * are missing rather than reported as zero, because a zero in a usage bar
 * reads as "plenty of room".
 */
export const fetchUsageWarnings = async (
  client: UserClient,
  organisationId?: string,
): Promise<UsageWarning[]> => {
  const { data, error } = await client.rpc('usage_warnings');

  if (error !== null) throw new Error(`could not read usage: ${error.message}`);

  return (data ?? [])
    .filter((row) => organisationId === undefined || row.organisation_id === organisationId)
    .map((row) => ({
      organisationId: row.organisation_id,
      metric: row.metric as UsageMetric,
      used: row.used ?? 0,
      allowed: row.allowed,
      percentage: row.percentage,
      band: (row.band ?? 'unlimited') as UsageBand,
      overageKobo: row.overage_kobo === null ? null : BigInt(row.overage_kobo),
    }));
};
