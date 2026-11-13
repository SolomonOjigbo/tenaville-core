'use server';

import { revalidatePath } from 'next/cache';

import { uploadDocument, type DocumentEntity } from '@tenaville/core/documents';
import { createAdminClient } from '@tenaville/db';

import { errorMessage } from '../lib/form-errors';
import { checked, field, optionalField } from './form-fields';
import { currentViewer, supabaseForRequest } from './session';
import type { ActionResult } from './auth-actions';

/**
 * Document upload (DOC-1, DOC-2).
 *
 * The file goes to private storage through the caller's own client first, then
 * the registry row is written through the same client so RLS decides whether
 * the document is allowed. If the row is refused, the object is removed again —
 * an orphaned file that nobody can list is worse than a failed upload.
 */

const ENTITY_TABLES = {
  property: 'properties',
  unit: 'units',
  landlord: 'landlords',
  tenant: 'tenants',
  lease: 'leases',
  deposit_deduction: 'deposit_deductions',
  handover: 'lease_handovers',
  maintenance_request: 'maintenance_requests',
  payment: 'payments',
} as const satisfies Record<DocumentEntity, string>;

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME =
  /^(application\/pdf|image\/(jpeg|png|webp|heic|heif)|text\/plain|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|application\/vnd\.ms-excel)$/;

const refreshDocuments = (): void => {
  revalidatePath('/documents');
  revalidatePath('/tenancy/documents');
  revalidatePath('/portfolio/documents');
};

export const uploadDocumentAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('document.write')) {
    return { error: 'Your role cannot upload documents.' };
  }

  const entityType = field(form, 'entityType') as DocumentEntity;
  const entityId = field(form, 'entityId').trim();
  const file = form.get('file');

  if (!(entityType in ENTITY_TABLES)) return { error: 'Choose what the file belongs to.' };
  if (entityId === '') return { fieldErrors: { entityId: 'Choose the record' } };
  if (!(file instanceof File) || file.size === 0) {
    return { fieldErrors: { file: 'Choose a file to upload' } };
  }
  if (file.size > MAX_BYTES) {
    return { fieldErrors: { file: 'Files must be 25 MB or smaller' } };
  }
  if (file.type !== '' && !ALLOWED_MIME.test(file.type)) {
    return { fieldErrors: { file: 'Use a PDF, image, text, Word or Excel document' } };
  }

  const supabase = await supabaseForRequest();
  const table = ENTITY_TABLES[entityType];

  const { data: target } = await supabase.from(table).select('id').eq('id', entityId).maybeSingle();

  if (target === null) {
    return { error: 'That record could not be found, or is not yours to attach a document to.' };
  }

  let path: string;
  try {
    const uploaded = await uploadDocument(supabase, {
      bucket: 'documents',
      organisationId: viewer.organisationId,
      entityType,
      entityId,
      filename: file.name,
      body: await file.arrayBuffer(),
      contentType: file.type || 'application/octet-stream',
    });
    path = uploaded.path;
  } catch (error) {
    return { error: errorMessage(error, 'Could not store the file') };
  }

  const { error } = await supabase.from('documents').insert({
    organisation_id: viewer.organisationId,
    entity_type: entityType,
    entity_id: entityId,
    bucket: 'documents',
    storage_path: path,
    file_name: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    document_type: (field(form, 'documentType') || 'other') as
      | 'lease_agreement'
      | 'tenancy_agreement'
      | 'identification'
      | 'proof_of_ownership'
      | 'inspection_report'
      | 'insurance'
      | 'receipt'
      | 'statement'
      | 'notice'
      | 'photo'
      | 'other',
    title: optionalField(form, 'title') ?? null,
    issue_date: optionalField(form, 'issueDate') ?? null,
    expiry_date: optionalField(form, 'expiryDate') ?? null,
    notes: optionalField(form, 'notes') ?? null,
    sensitive: checked(form, 'sensitive'),
    uploaded_by: viewer.userId,
  });

  if (error !== null) {
    // The file is now unreachable because no row lists it. Removing it keeps
    // the bucket honest; a failure here is not worth failing the request twice.
    const admin = createAdminClient('remove a document whose registry row was refused');
    await admin.storage.from('documents').remove([path]);
    return { error: errorMessage(error, 'Could not register the document') };
  }

  refreshDocuments();
  return { message: 'Document uploaded.' };
};

export const generateDocumentAlertsAction = async (): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('document.read')) {
    return { error: 'Your role cannot generate document alerts.' };
  }

  const supabase = await supabaseForRequest();
  const { data, error } = await supabase.rpc('generate_document_expiry_tasks', {
    p_organisation_id: viewer.organisationId,
  });

  if (error !== null) return { error: errorMessage(error, 'Could not check document expiry') };

  refreshDocuments();
  const created = typeof data === 'number' ? data : 0;
  return {
    message:
      created === 0
        ? 'No new expiry alerts were needed.'
        : `${created} expiry alerts added to Tasks.`,
  };
};
