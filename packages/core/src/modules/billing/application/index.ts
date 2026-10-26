/** The billing module's public surface (BILL-3; BILL-1 and BILL-2 follow). */
export { fetchEntitlements } from './entitlements';

export {
  PLAN_LIMIT_SQLSTATE,
  asPlanRefusal,
  describeAllowance,
  hasFeature,
  isPlanLimitError,
  percentageUsed,
  planRefusalMessage,
  type Allowance,
  type Entitlements,
  type LimitVerdict,
  type PlanRefusal,
} from '../domain/entitlements';
