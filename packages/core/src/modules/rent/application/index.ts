/** The rent module's public surface (RENT-1; RENT-2 onwards arrive in step 4). */
export { activateLease, planSchedule } from './activate-lease';

export {
  buildPeriodicCharges,
  buildIrregularCharges,
  scheduleTotal,
  toPayload,
  ChargeScheduleError,
  type ChargeRow,
  type ChargeRowPayload,
  type Instalment,
  type IrregularChargeTerms,
  type PartPeriodTreatment,
  type PeriodicChargeTerms,
} from '../domain/charges';

export {
  activateLeaseSchema,
  partPeriodTreatmentSchema,
  type ActivateLeaseInput,
} from '../schema/index';
