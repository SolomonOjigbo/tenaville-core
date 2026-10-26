/** The billing module's public surface (BILL-3; BILL-1 and BILL-2 follow). */
export { fetchEntitlements, fetchUsageWarnings } from './entitlements';

export {
  PLAN_LIMIT_SQLSTATE,
  asPlanRefusal,
  describeAllowance,
  hasFeature,
  isPlanLimitError,
  percentageUsed,
  planRefusalMessage,
  shouldPrompt,
  warningHeadline,
  type Allowance,
  type Entitlements,
  type LimitVerdict,
  type PlanRefusal,
  type UsageBand,
  type UsageMetric,
  type UsageWarning,
} from '../domain/entitlements';
