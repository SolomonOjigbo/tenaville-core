/**
 * What a plan entitles an organisation to (BILL-3, TV-147).
 *
 * The numbers are not here. They live in the `plans` table and are read at the
 * moment of a write by triggers in the database, because an import and the
 * mobile app write through the same connection as a route handler and only one
 * of those goes through TypeScript.
 *
 * What is here is everything the application needs in order to *talk* about a
 * limit: the shape of the answer the database gives, how to recognise a
 * refusal when one comes back, and how to say so to a person.
 */

/**
 * The four answers a limit can give. Mirrors `app.limit_verdict`, which is the
 * single definition — these values are read from the database, never computed
 * here, so a screen and a trigger cannot disagree about whether there is room.
 */
export type LimitVerdict = 'unlimited' | 'within' | 'billable' | 'refused';

export interface Allowance {
  readonly used: number;
  /** Null means unlimited. */
  readonly limit: number | null;
  readonly verdict: LimitVerdict;
  /** Price per extra, in kobo. Null means the limit is a wall, not a sale. */
  readonly overageKobo: bigint | null;
}

export interface Entitlements {
  readonly organisationId: string;
  readonly planId: string;
  readonly planName: string;
  readonly tier: string;
  readonly properties: Allowance;
  readonly units: Allowance;
  readonly users: Allowance;
  readonly storageMb: number | null;
  readonly includedMessages: number | null;
  readonly features: readonly string[];
}

/**
 * Postgres SQLSTATE 53400, `configuration_limit_exceeded`.
 *
 * Every plan refusal raises it, so one check recognises all of them without
 * matching on message text. Chosen rather than a custom code because it is
 * what it means, and because a client that knows nothing about Tenaville still
 * classifies it correctly.
 */
export const PLAN_LIMIT_SQLSTATE = '53400';

export interface PlanRefusal {
  /** What was refused, from the database. */
  readonly message: string;
  /** What to do about it. Null when the database sent no hint. */
  readonly hint: string | null;
  /** The feature key, when a feature gate rather than a count refused it. */
  readonly feature: string | null;
}

interface PostgresErrorShape {
  readonly code?: string | null;
  readonly message?: string | null;
  readonly hint?: string | null;
  readonly details?: string | null;
  readonly detail?: string | null;
}

/**
 * Recognise a plan refusal, whatever client produced it.
 *
 * supabase-js, node-postgres and the PostgREST error body all spell the same
 * fields slightly differently — `details` against `detail` in particular — so
 * both are read rather than assuming the one this week's client uses.
 */
export const asPlanRefusal = (error: unknown): PlanRefusal | null => {
  if (typeof error !== 'object' || error === null) return null;
  const shape = error as PostgresErrorShape;
  if (shape.code !== PLAN_LIMIT_SQLSTATE) return null;

  const detail = shape.details ?? shape.detail ?? null;
  return {
    message: shape.message ?? 'That is not included in this plan',
    hint: shape.hint ?? null,
    // assert_plan_allows puts the feature key in `detail`; a count limit
    // sends none, which is how the two are told apart.
    feature: detail !== null && /^[a-z0-9_]{3,48}$/.test(detail) ? detail : null,
  };
};

export const isPlanLimitError = (error: unknown): boolean => asPlanRefusal(error) !== null;

/**
 * One sentence a person can act on.
 *
 * The database already phrases both halves — the message says what is full,
 * the hint says what to do — so this joins them rather than inventing new
 * wording per screen. Wording lives in one place on purpose: the same refusal
 * reaches a route handler, a server action and the mobile app.
 */
export const planRefusalMessage = (refusal: PlanRefusal): string =>
  refusal.hint === null ? refusal.message : `${refusal.message}. ${refusal.hint}`;

/** Whether a plan grants a feature, from entitlements already fetched. */
export const hasFeature = (entitlements: Entitlements, feature: string): boolean =>
  entitlements.features.includes(feature);

/**
 * How full an allowance is, as a percentage, for a usage bar.
 *
 * Null for an unlimited allowance: there is no meaningful fraction of
 * unlimited, and rendering 0% next to "unlimited" reads as a fault. Capped at
 * 100 so an organisation that dropped to a smaller plan sees a full bar rather
 * than a bar overflowing its container.
 */
export const percentageUsed = (allowance: Allowance): number | null => {
  if (allowance.limit === null || allowance.limit === 0) return null;
  return Math.min(100, Math.round((allowance.used / allowance.limit) * 100));
};

/** `3 of 10` · `12 of 10` · `7` when the plan sets no limit. */
export const describeAllowance = (allowance: Allowance): string =>
  allowance.limit === null ? `${allowance.used}` : `${allowance.used} of ${allowance.limit}`;

/**
 * How close a metered limit is to its band (BILL-3, TV-148).
 *
 * Mirrors `app.usage_band`, which is the single definition — 80% and 100% are
 * set there and read from the database, never recomputed here. A threshold in
 * two places is a threshold that will differ: the screen would warn at one
 * number and the reminder at another, and nobody would notice until a customer
 * asked why.
 *
 * Distinct from `LimitVerdict`, which answers whether a write may proceed.
 * This answers whether a person should be told, and the two differ on purpose:
 * a plan that sells extra units past its band still warrants a warning at 80%,
 * because that is the point where upgrading beats paying the overage.
 */
export type UsageBand = 'ok' | 'approaching' | 'reached' | 'unlimited';

export type UsageMetric = 'units' | 'properties' | 'users';

export interface UsageWarning {
  readonly organisationId: string;
  readonly metric: UsageMetric;
  readonly used: number;
  /** Null means unlimited. */
  readonly allowed: number | null;
  /** Null when unlimited. Capped at 100. */
  readonly percentage: number | null;
  readonly band: UsageBand;
  /** Price per extra, in kobo. Null when the limit is a wall. */
  readonly overageKobo: bigint | null;
}

/** Whether this is worth saying out loud. */
export const shouldPrompt = (warning: UsageWarning): boolean =>
  warning.band === 'approaching' || warning.band === 'reached';

const METRIC_NOUNS: Record<UsageMetric, string> = {
  units: 'units',
  properties: 'properties',
  users: 'users',
};

/**
 * The sentence a person reads.
 *
 * Says the numbers before the advice, because the number is what they came to
 * check. The way out depends on what the plan sells: a band with a per-unit
 * price can simply be exceeded, and saying "upgrade" there would be wrong — a
 * growing agency wants to know it will be charged, not that it is blocked.
 */
export const warningHeadline = (warning: UsageWarning): string => {
  const noun = METRIC_NOUNS[warning.metric];
  if (warning.allowed === null) return `${warning.used} ${noun}, with no limit on this plan`;

  const counts = `${warning.used} of ${warning.allowed} ${noun} used`;
  if (warning.band === 'reached') {
    return warning.overageKobo === null
      ? `${counts}. This plan includes no more — upgrading is the way to add another.`
      : `${counts}. Each additional one is charged.`;
  }
  if (warning.band === 'approaching') {
    return `${counts}. Worth deciding now, before the band is full.`;
  }
  return counts;
};
