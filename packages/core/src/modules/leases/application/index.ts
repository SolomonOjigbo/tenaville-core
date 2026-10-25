/** The leases module's public surface (LEASE-1..LEASE-6, LEASE-11..LEASE-13). */
export { createTenant } from './create-tenant.js';
export { createLease } from './create-lease.js';
export { renewLease } from './renew-lease.js';
export { recordDepositReceipt, proposeDeduction, approveDeduction } from './deposits.js';
export { recordHandover } from './record-handover.js';

export {
  generateRentPeriods,
  expiryAlertThreshold,
  daysBetween,
  addMonths,
  addDays,
  parseDate,
  formatDate,
  ScheduleError,
  type CalendarDate,
  type RentFrequency,
  type RentPeriod,
  type ScheduleTerms,
} from '../domain/schedule.js';

export {
  createTenantSchema,
  createLeaseSchema,
  renewLeaseSchema,
  recordDepositReceiptSchema,
  proposeDeductionSchema,
  recordHandoverSchema,
  rentFrequencySchema,
  leaseStatusSchema,
  depositCustodianSchema,
  type CreateTenantInput,
  type CreateLeaseInput,
  type RenewLeaseInput,
  type RecordDepositReceiptInput,
  type ProposeDeductionInput,
  type RecordHandoverInput,
} from '../schema/index.js';
