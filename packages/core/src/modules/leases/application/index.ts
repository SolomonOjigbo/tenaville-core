/** The leases module's public surface (LEASE-1..LEASE-6, LEASE-11..LEASE-13). */
export { createTenant } from './create-tenant';
export { createLease } from './create-lease';
export { renewLease } from './renew-lease';
export { recordDepositReceipt, proposeDeduction, approveDeduction } from './deposits';
export { recordHandover } from './record-handover';

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
  type PeriodicRentFrequency,
  type RentFrequency,
  type RentPeriod,
  type ScheduleTerms,
} from '../domain/schedule';

export {
  createTenantSchema,
  createLeaseSchema,
  renewLeaseSchema,
  recordDepositReceiptSchema,
  proposeDeductionSchema,
  recordHandoverSchema,
  rentFrequencySchema,
  periodicRentFrequencySchema,
  leaseStatusSchema,
  depositCustodianSchema,
  type CreateTenantInput,
  type CreateLeaseInput,
  type RenewLeaseInput,
  type RecordDepositReceiptInput,
  type ProposeDeductionInput,
  type RecordHandoverInput,
} from '../schema/index';
