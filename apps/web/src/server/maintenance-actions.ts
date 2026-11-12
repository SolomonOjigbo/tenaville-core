'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { MoneyParseError, parseNaira, toTransport } from '@tenaville/money';

import { errorMessage, fieldErrorsFrom } from '../lib/form-errors';
import { checked, field, optionalField } from './form-fields';
import { currentViewer, supabaseForRequest } from './session';
import type { ActionResult } from './auth-actions';

/**
 * Maintenance actions (MAINT-1 … MAINT-11).
 *
 * Every rule that matters — the transition map, the cost/approval gate, the
 * tenant's lease scope — is enforced in the database functions. These actions
 * add the session, the permission check and the form result shape.
 */

const refreshMaintenance = (requestId?: string): void => {
  revalidatePath('/maintenance');
  revalidatePath('/portfolio/maintenance');
  revalidatePath('/tenancy/maintenance');
  if (requestId !== undefined) {
    revalidatePath(`/maintenance/${requestId}`);
    revalidatePath(`/portfolio/maintenance/${requestId}`);
    revalidatePath(`/tenancy/maintenance/${requestId}`);
  }
};

const amountKobo = (naira: string): number => Number(toTransport(parseNaira(naira)));

export const createMaintenanceRequestAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };

  const isTenant = viewer.access.can('self.maintenance.request') && !viewer.access.isStaff;
  if (!isTenant && !viewer.access.can('maintenance.write')) {
    return { error: 'Your role cannot raise a maintenance request.' };
  }

  const propertyId = field(form, 'propertyId').trim();
  const unitId = optionalField(form, 'unitId');
  const leaseId = optionalField(form, 'leaseId');
  const accessConstraints = optionalField(form, 'accessConstraints');
  const preferredAccessTimes = optionalField(form, 'preferredAccessTimes');
  const description = field(form, 'description').trim();

  if (propertyId === '') return { error: 'Choose the property first.' };
  if (description.length < 5) {
    return { fieldErrors: { description: 'Describe the problem in a few words' } };
  }

  const supabase = await supabaseForRequest();
  let requestId: string;

  try {
    const { data, error } = await supabase.rpc('create_maintenance_request', {
      p_property_id: propertyId,
      ...(unitId === undefined ? {} : { p_unit_id: unitId }),
      ...(leaseId === undefined ? {} : { p_lease_id: leaseId }),
      p_category: field(form, 'category') as
        | 'plumbing'
        | 'electrical'
        | 'structural'
        | 'appliance'
        | 'hvac'
        | 'pest'
        | 'cleaning'
        | 'security'
        | 'other',
      p_description: description,
      p_urgency: (field(form, 'urgency') || 'normal') as 'low' | 'normal' | 'high' | 'emergency',
      ...(accessConstraints === undefined ? {} : { p_access_constraints: accessConstraints }),
      ...(preferredAccessTimes === undefined
        ? {}
        : { p_preferred_access_times: preferredAccessTimes }),
      p_is_safety_issue: checked(form, 'isSafetyIssue'),
    });

    if (error !== null) return { error: errorMessage(error, 'Could not create the request') };
    if (typeof data !== 'string')
      return { error: 'The request was created but its reference was not returned.' };
    requestId = data;
  } catch (error) {
    const fieldErrors = fieldErrorsFrom(error);
    if (fieldErrors !== null) return { fieldErrors };
    return { error: errorMessage(error, 'Could not create the request') };
  }

  refreshMaintenance(requestId);
  redirect(isTenant ? `/tenancy/maintenance/${requestId}` : `/maintenance/${requestId}`);
};

export const createVendorAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('maintenance.write')) {
    return { error: 'Your role cannot add vendors.' };
  }

  const supabase = await supabaseForRequest();
  const serviceAreas = field(form, 'serviceAreas')
    .split(',')
    .map((area) => area.trim())
    .filter((area) => area !== '');

  const { error } = await supabase.from('vendors').insert({
    organisation_id: viewer.organisationId,
    name: field(form, 'name').trim(),
    trade: field(form, 'trade').trim(),
    contact_name: optionalField(form, 'contactName') ?? null,
    phone: optionalField(form, 'phone') ?? null,
    email: optionalField(form, 'email')?.toLowerCase() ?? null,
    service_areas: serviceAreas,
    availability_notes: optionalField(form, 'availabilityNotes') ?? null,
    performance_notes: optionalField(form, 'performanceNotes') ?? null,
    created_by: viewer.userId,
  });

  if (error !== null) {
    if (error.code === '23505') {
      return { fieldErrors: { name: 'A vendor with that name already exists' } };
    }
    return { error: errorMessage(error, 'Could not add the vendor') };
  }

  refreshMaintenance();
  redirect('/maintenance/vendors');
};

export const assignMaintenanceRequestAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('maintenance.write')) {
    return { error: 'Your role cannot assign requests.' };
  }

  const requestId = field(form, 'requestId').trim();
  if (requestId === '') return { error: 'The request is missing.' };

  const supabase = await supabaseForRequest();
  const assigneeUserId = optionalField(form, 'assigneeUserId');
  const coordinatorUserId = optionalField(form, 'coordinatorUserId');
  const vendorId = optionalField(form, 'vendorId');
  const dueOn = optionalField(form, 'dueOn');
  const note = optionalField(form, 'note');

  const { error } = await supabase.rpc('assign_maintenance_request', {
    p_request_id: requestId,
    ...(assigneeUserId === undefined ? {} : { p_assignee_user_id: assigneeUserId }),
    ...(coordinatorUserId === undefined ? {} : { p_coordinator_user_id: coordinatorUserId }),
    ...(vendorId === undefined ? {} : { p_vendor_id: vendorId }),
    p_priority: (field(form, 'priority') || 'normal') as 'low' | 'normal' | 'high' | 'urgent',
    ...(dueOn === undefined ? {} : { p_due_on: dueOn }),
    ...(note === undefined ? {} : { p_note: note }),
  });

  if (error !== null) return { error: errorMessage(error, 'Could not assign the request') };

  refreshMaintenance(requestId);
  return { message: 'Assignment saved.' };
};

export const transitionMaintenanceRequestAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('maintenance.write')) {
    return { error: 'Your role cannot change this request.' };
  }

  const requestId = field(form, 'requestId').trim();
  const status = field(form, 'status').trim();
  if (requestId === '' || status === '') return { error: 'Choose the next status.' };

  const supabase = await supabaseForRequest();
  const note = optionalField(form, 'note');
  const { error } = await supabase.rpc('transition_maintenance_request', {
    p_request_id: requestId,
    p_status: status as
      | 'submitted'
      | 'acknowledged'
      | 'assigned'
      | 'in_progress'
      | 'on_hold'
      | 'awaiting_approval'
      | 'completed'
      | 'rejected'
      | 'closed',
    ...(note === undefined ? {} : { p_note: note }),
  });

  if (error !== null) return { error: errorMessage(error, 'Could not change the status') };

  refreshMaintenance(requestId);
  return { message: 'Status updated.' };
};

export const recordMaintenanceCostAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('maintenance.write')) {
    return { error: 'Your role cannot record costs.' };
  }

  const requestId = field(form, 'requestId').trim();
  if (requestId === '') return { error: 'The request is missing.' };

  const noCost = checked(form, 'noCost');
  const amountText = field(form, 'amount').trim();

  let amount = 0;
  if (!noCost) {
    if (amountText === '') {
      return { fieldErrors: { amount: 'Enter the amount spent, or mark the job as no cost' } };
    }
    try {
      amount = amountKobo(amountText);
    } catch (error) {
      return {
        fieldErrors: {
          amount:
            error instanceof MoneyParseError
              ? 'Enter a naira amount, for example 25,000.00'
              : 'That amount is too large to store',
        },
      };
    }
  }

  const supabase = await supabaseForRequest();
  const invoicePath = optionalField(form, 'invoicePath');
  const { error } = await supabase.rpc('record_maintenance_cost', {
    p_request_id: requestId,
    p_description: field(form, 'description').trim(),
    p_amount_kobo: amount,
    p_payer: (field(form, 'payer') || 'landlord') as
      'landlord' | 'tenant' | 'agency' | 'service_charge' | 'other',
    p_reason: field(form, 'reason').trim(),
    ...(invoicePath === undefined ? {} : { p_invoice_path: invoicePath }),
    p_no_cost: noCost,
  });

  if (error !== null) return { error: errorMessage(error, 'Could not record the cost') };

  refreshMaintenance(requestId);
  return { message: noCost ? 'Marked as no cost.' : 'Cost recorded.' };
};

export const decideMaintenanceApprovalAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('maintenance.approve')) {
    return { error: 'Your role cannot approve repairs.' };
  }

  const approvalId = field(form, 'approvalId').trim();
  const requestId = field(form, 'requestId').trim();
  const approved = field(form, 'decision') === 'approve';

  if (approvalId === '') return { error: 'The approval is missing.' };

  const supabase = await supabaseForRequest();
  const comment = optionalField(form, 'comment');
  const { error } = await supabase.rpc('decide_maintenance_approval', {
    p_approval_id: approvalId,
    p_approved: approved,
    ...(comment === undefined ? {} : { p_comment: comment }),
  });

  if (error !== null) return { error: errorMessage(error, 'Could not record the decision') };

  refreshMaintenance(requestId === '' ? undefined : requestId);
  return { message: approved ? 'Repair approved.' : 'Repair rejected.' };
};

export const addMaintenanceCommentAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.isStaff && !viewer.access.can('self.maintenance.request')) {
    return { error: 'Your role cannot comment on repairs.' };
  }

  const requestId = field(form, 'requestId').trim();
  const body = field(form, 'body').trim();
  if (requestId === '') return { error: 'The request is missing.' };
  if (body === '') return { fieldErrors: { body: 'Write a comment first' } };

  const supabase = await supabaseForRequest();
  const { error } = await supabase.rpc('add_maintenance_comment', {
    p_request_id: requestId,
    p_body: body,
    p_internal: viewer.access.isStaff && checked(form, 'internal'),
  });

  if (error !== null) return { error: errorMessage(error, 'Could not add the comment') };

  refreshMaintenance(requestId);
  return { message: 'Comment added.' };
};

export const confirmMaintenanceAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('self.maintenance.request')) {
    return { error: 'Only the tenant can confirm the repair.' };
  }

  const requestId = field(form, 'requestId').trim();
  if (requestId === '') return { error: 'The request is missing.' };

  const supabase = await supabaseForRequest();
  const { error } = await supabase.rpc('confirm_maintenance_resolution', {
    p_request_id: requestId,
  });

  if (error !== null) return { error: errorMessage(error, 'Could not confirm the repair') };

  refreshMaintenance(requestId);
  return { message: 'Thanks — the agency has been told.' };
};

export const reopenMaintenanceAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('self.maintenance.request')) {
    return { error: 'Only the tenant can reopen the repair.' };
  }

  const requestId = field(form, 'requestId').trim();
  const reason = field(form, 'reason').trim();
  if (requestId === '') return { error: 'The request is missing.' };
  if (reason.length < 3) return { fieldErrors: { reason: 'Say what is still wrong' } };

  const supabase = await supabaseForRequest();
  const { error } = await supabase.rpc('reopen_maintenance_request', {
    p_request_id: requestId,
    p_reason: reason,
  });

  if (error !== null) return { error: errorMessage(error, 'Could not reopen the repair') };

  refreshMaintenance(requestId);
  return { message: 'The repair is reopened.' };
};
