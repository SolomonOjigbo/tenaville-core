/** The properties module's public surface (PROP-1..PROP-5). */
export { createProperty } from './create-property.js';
export { createUnit } from './create-unit.js';
export { validatePropertyImport, applyPropertyImport } from './import-properties.js';

export {
  createPropertySchema,
  createUnitSchema,
  propertyTypeSchema,
  unitTypeSchema,
  unitStatusSchema,
  type CreatePropertyInput,
  type CreateUnitInput,
} from '../schema/index.js';

export {
  mapHeaders,
  validateRows,
  summarise,
  normaliseKey,
  REQUIRED_FIELDS,
  type ImportIssue,
  type ImportSummary,
  type ParsedPropertyRow,
  type RowResult,
  type ValidationContext,
} from '../domain/import.js';
