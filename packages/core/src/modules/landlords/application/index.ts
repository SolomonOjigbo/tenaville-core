/** The landlords module's public surface (OWN-1, OWN-2). */
export { createLandlord } from './create-landlord.js';
export { setRemittanceDetails } from './set-remittance-details.js';

export {
  createLandlordSchema,
  remittanceDetailsSchema,
  createMandateSchema,
  type CreateLandlordInput,
  type RemittanceDetailsInput,
  type CreateMandateInput,
} from '../schema/index.js';
