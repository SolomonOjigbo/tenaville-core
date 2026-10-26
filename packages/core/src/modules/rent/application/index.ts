/** The rent module's public surface (RENT-1; RENT-2 onwards arrive in step 4). */
export { activateLease, planSchedule } from './activate-lease';
export { addChargeTerm, planChargeTerm } from './charge-terms';

export {
  buildPeriodicCharges,
  buildIrregularCharges,
  buildTermCharges,
  scheduleTotal,
  toPayload,
  ChargeScheduleError,
  type ChargeRow,
  type ChargeRowPayload,
  type Instalment,
  type IrregularChargeTerms,
  type ChargeFrequency,
  type ChargeTermTerms,
  type NonRentChargeKind,
  type PartPeriodTreatment,
  type PeriodicChargeTerms,
} from '../domain/charges';

export {
  activateLeaseSchema,
  addChargeTermSchema,
  chargeFrequencySchema,
  nonRentChargeKindSchema,
  partPeriodTreatmentSchema,
  type ActivateLeaseInput,
  type AddChargeTermInput,
} from '../schema/index';
