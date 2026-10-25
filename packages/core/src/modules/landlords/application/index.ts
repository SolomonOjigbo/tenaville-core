/** The landlords module's public surface (OWN-1, OWN-2). */
export { createLandlord } from './create-landlord';
export { setRemittanceDetails } from './set-remittance-details';

export {
  createLandlordSchema,
  remittanceDetailsSchema,
  createMandateSchema,
  type CreateLandlordInput,
  type RemittanceDetailsInput,
  type CreateMandateInput,
} from '../schema/index';
