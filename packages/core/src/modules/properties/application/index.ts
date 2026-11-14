/** The properties module's public surface (PROP-1..PROP-5). */
export { createProperty } from './create-property';
export { createUnit } from './create-unit';
export { updateProperty, archiveProperty } from './update-property';
export { updateUnit, archiveUnit } from './update-unit';
export { validatePropertyImport, applyPropertyImport } from './import-properties';

export {
  createPropertySchema,
  createUnitSchema,
  updatePropertySchema,
  updateUnitSchema,
  archivePropertySchema,
  archiveUnitSchema,
  propertyTypeSchema,
  unitTypeSchema,
  unitStatusSchema,
  type CreatePropertyInput,
  type CreateUnitInput,
  type UpdatePropertyInput,
  type UpdateUnitInput,
} from '../schema/index';

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
} from '../domain/import';
