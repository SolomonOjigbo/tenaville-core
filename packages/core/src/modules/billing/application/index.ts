/** The billing module's public surface (BILL-1, BILL-2, BILL-3). */
export { fetchEntitlements, fetchUsageWarnings } from './entitlements';

export {
  billingInvoiceStatusLabel,
  invoiceBalanceKobo,
  isInvoiceOverdue,
  isInvoiceSettled,
  planChangeDirection,
  type PlanChangeDirection,
} from '../domain/invoice';

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
