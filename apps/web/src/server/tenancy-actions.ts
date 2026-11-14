'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  addDays,
  approveDeduction,
  createDeposit,
  createLease,
  createTenant,
  formatDate,
  parseDate,
  proposeDeduction,
  recordDepositReceipt,
  recordHandover,
  renewLease,
  settleDeposit,
  terminateLease,
} from '@tenaville/core/leases';
import { activateLease } from '@tenaville/core/rent';
import { MoneyParseError, parseNaira, toTransport } from '@tenaville/money';

import { errorMessage, fieldErrorsFrom } from '../lib/form-errors';
import { checked, field, numberField, optionalField } from './form-fields';
import { currentViewer, supabaseForRequest } from './session';
import type { ActionResult } from './auth-actions';

/**
 * Tenants and leases (LEASE-1, LEASE-3, LEASE-4, LEASE-12).
 *
 * Creation and activation are two core calls, deliberately: the lease is a
 * draft until its schedule has been raised, so a failure between them leaves a
 * visible draft rather than a lease that is active and owes nothing.
 */

const toKoboTransport = (naira: string): string => toTransport(parseNaira(naira));

const rentFieldError = (error: unknown): Record<string, string> => ({
  rent:
    error instanceof MoneyParseError
      ? 'Enter a naira amount, for example 1,200,000.00'
      : 'That amount is too large to store',
});

export const createTenantAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('lease.write')) {
    return { error: 'Your role cannot add tenants.' };
  }

  const supabase = await supabaseForRequest();

  try {
    await createTenant(supabase, {
      organisationId: viewer.organisationId,
      kind: field(form, 'kind') === 'organisation' ? 'organisation' : 'individual',
      displayName: field(form, 'displayName'),
      preferredChannel: (field(form, 'preferredChannel') || 'whatsapp') as
        'phone' | 'sms' | 'whatsapp' | 'email',
      ...(optionalField(form, 'phone') === undefined
        ? {}
        : { phone: optionalField(form, 'phone') }),
      ...(optionalField(form, 'email') === undefined
        ? {}
        : { email: optionalField(form, 'email') }),
      ...(optionalField(form, 'occupation') === undefined
        ? {}
        : { occupation: optionalField(form, 'occupation') }),
      ...(optionalField(form, 'notes') === undefined
        ? {}
        : { notes: optionalField(form, 'notes') }),
    });
  } catch (error) {
    const fieldErrors = fieldErrorsFrom(error);
    if (fieldErrors !== null) return { fieldErrors };
    return { error: errorMessage(error, 'Could not add the tenant') };
  }

  revalidatePath('/tenants');
  revalidatePath('/leases/new');
  redirect('/tenants');
};

const leaseFieldErrors = (error: unknown): Record<string, string> | null => {
  const mapped = fieldErrorsFrom(error);
  if (mapped === null) return null;
  if (mapped.rentKobo !== undefined) {
    mapped.rent = mapped.rentKobo;
    delete mapped.rentKobo;
  }
  if (mapped.depositKobo !== undefined) {
    mapped.deposit = mapped.depositKobo;
    delete mapped.depositKobo;
  }
  return mapped;
};

export const createLeaseAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('lease.write')) {
    return { error: 'Your role cannot create leases.' };
  }

  const unitId = field(form, 'unitId').trim();
  const tenantId = field(form, 'tenantId').trim();
  const startsOn = field(form, 'startsOn').trim();
  const endsOn = field(form, 'endsOn').trim();
  const rentText = field(form, 'rent').trim();
  const frequency = field(form, 'frequency') as 'annual' | 'half_yearly' | 'quarterly' | 'monthly';
  const dueDay = numberField(form, 'dueDay');
  const depositText = field(form, 'deposit').trim();

  let rentKobo: string;
  try {
    rentKobo = toKoboTransport(rentText);
  } catch (error) {
    return { fieldErrors: rentFieldError(error) };
  }

  let depositKobo: string | undefined;
  if (depositText !== '') {
    try {
      depositKobo = toKoboTransport(depositText);
    } catch (error) {
      return {
        fieldErrors: {
          deposit:
            error instanceof MoneyParseError
              ? 'Enter a naira amount, for example 1,200,000.00'
              : 'That amount is too large to store',
        },
      };
    }
  }

  const supabase = await supabaseForRequest();
  let leaseId: string;

  try {
    const created = await createLease(supabase, {
      organisationId: viewer.organisationId,
      unitId,
      tenantId,
      startsOn,
      endsOn,
      rentKobo,
      rentFrequency: frequency,
      ...(dueDay === undefined ? {} : { dueDay }),
      ...(optionalField(form, 'reference') === undefined
        ? {}
        : { reference: optionalField(form, 'reference') }),
      depositCustodian: field(form, 'custodian') === 'landlord' ? 'landlord' : 'agency',
      ...(depositKobo === undefined ? {} : { depositKobo }),
    });
    leaseId = created.leaseId;
  } catch (error) {
    const fieldErrors = leaseFieldErrors(error);
    if (fieldErrors !== null) return { fieldErrors };
    return { error: errorMessage(error, 'Could not create the lease') };
  }

  let activationFailed = false;
  try {
    await activateLease(supabase, {
      leaseId,
      rentFrequency: frequency,
      startsOn,
      endsOn,
      rentKobo,
      ...(dueDay === undefined ? {} : { dueDay }),
      partPeriod: 'charge_in_full',
    });
  } catch {
    activationFailed = true;
  }

  revalidatePath('/leases');
  revalidatePath('/rent');
  redirect(`/leases/${leaseId}${activationFailed ? '?warning=activation' : ''}`);
};

export const renewLeaseAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('lease.write')) {
    return { error: 'Your role cannot renew leases.' };
  }

  const leaseId = field(form, 'leaseId').trim();
  const endsOn = field(form, 'endsOn').trim();
  const rentText = field(form, 'rent').trim();

  let newRentKobo: string | undefined;
  if (rentText !== '') {
    try {
      newRentKobo = toKoboTransport(rentText);
    } catch (error) {
      return { fieldErrors: rentFieldError(error) };
    }
  }

  const supabase = await supabaseForRequest();

  const { data: source, error: sourceError } = await supabase
    .from('leases')
    .select('id, status, ends_on, rent_kobo, rent_frequency, rent_due_day')
    .eq('id', leaseId)
    .maybeSingle();

  if (sourceError !== null || source === null) {
    return { error: 'That lease could not be found, or is not yours to renew.' };
  }

  let renewalLeaseId: string;
  try {
    const renewed = await renewLease(supabase, {
      leaseId,
      endsOn,
      carryDeposit: checked(form, 'carryDeposit'),
      ...(newRentKobo === undefined ? {} : { rentKobo: newRentKobo }),
    });
    renewalLeaseId = renewed.renewalLeaseId;
  } catch (error) {
    const fieldErrors = fieldErrorsFrom(error);
    if (fieldErrors !== null) return { fieldErrors };
    return { error: errorMessage(error, 'Could not renew the lease') };
  }

  let activationFailed = false;
  if (source.rent_frequency === 'irregular') {
    activationFailed = true;
  } else {
    try {
      const startsOn = formatDate(addDays(parseDate(source.ends_on), 1));
      await activateLease(supabase, {
        leaseId: renewalLeaseId,
        rentFrequency: source.rent_frequency,
        startsOn,
        endsOn,
        rentKobo: newRentKobo ?? String(source.rent_kobo),
        ...(source.rent_due_day === null ? {} : { dueDay: source.rent_due_day }),
        partPeriod: 'charge_in_full',
      });
    } catch {
      activationFailed = true;
    }
  }

  revalidatePath('/leases');
  revalidatePath(`/leases/${leaseId}`);
  revalidatePath('/rent');
  redirect(`/leases/${renewalLeaseId}${activationFailed ? '?warning=activation' : ''}`);
};

const financeAccess = (viewer: NonNullable<Awaited<ReturnType<typeof currentViewer>>>): boolean =>
  viewer.access.can('lease.write') || viewer.access.can('payment.record');

const refreshTenancy = (leaseId: string): void => {
  revalidatePath(`/leases/${leaseId}`);
  revalidatePath(`/leases/${leaseId}/deposit`);
  revalidatePath(`/leases/${leaseId}/handovers`);
  revalidatePath('/leases');
};

export const createDepositAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!financeAccess(viewer)) return { error: 'Your role cannot add deposits.' };

  const leaseId = field(form, 'leaseId').trim();
  let amountKobo: string;
  try {
    amountKobo = toKoboTransport(field(form, 'amount'));
  } catch (error) {
    return { fieldErrors: { amount: rentFieldError(error).rent ?? 'Enter a valid amount' } };
  }

  try {
    await createDeposit(await supabaseForRequest(), {
      organisationId: viewer.organisationId,
      leaseId,
      amountKobo,
      custodian: field(form, 'custodian') === 'landlord' ? 'landlord' : 'agency',
    });
  } catch (error) {
    return { error: errorMessage(error, 'Could not add the deposit') };
  }

  refreshTenancy(leaseId);
  return { message: 'Deposit added. Record its receipt when the money arrives.' };
};

export const recordDepositReceiptAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!financeAccess(viewer)) return { error: 'Your role cannot record deposits.' };

  const leaseId = field(form, 'leaseId').trim();
  const depositedOn = field(form, 'receivedOn').trim();
  try {
    await recordDepositReceipt(await supabaseForRequest(), {
      depositId: field(form, 'depositId').trim(),
      receivedOn: depositedOn,
    });
  } catch (error) {
    return { error: errorMessage(error, 'Could not record the deposit') };
  }

  refreshTenancy(leaseId);
  revalidatePath('/tenancy');
  return { message: 'Deposit recorded as held.' };
};

export const proposeDepositDeductionAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!financeAccess(viewer)) return { error: 'Your role cannot propose deductions.' };

  const leaseId = field(form, 'leaseId').trim();
  let amountKobo: string;
  try {
    amountKobo = toKoboTransport(field(form, 'amount'));
  } catch (error) {
    return { fieldErrors: { amount: rentFieldError(error).rent ?? 'Enter a valid amount' } };
  }

  try {
    await proposeDeduction(await supabaseForRequest(), {
      organisationId: viewer.organisationId,
      depositId: field(form, 'depositId').trim(),
      amountKobo,
      reason: field(form, 'reason'),
      evidencePaths: [],
    });
  } catch (error) {
    const fieldErrors = fieldErrorsFrom(error);
    if (fieldErrors !== null) return { fieldErrors };
    return { error: errorMessage(error, 'Could not propose the deduction') };
  }

  refreshTenancy(leaseId);
  return { message: 'Deduction proposed. It needs approval before it counts.' };
};

export const approveDepositDeductionAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!financeAccess(viewer)) return { error: 'Your role cannot approve deductions.' };

  const leaseId = field(form, 'leaseId').trim();
  try {
    await approveDeduction(
      await supabaseForRequest(),
      field(form, 'deductionId').trim(),
      viewer.userId,
    );
  } catch (error) {
    return { error: errorMessage(error, 'Could not approve the deduction') };
  }

  refreshTenancy(leaseId);
  return { message: 'Deduction approved.' };
};

export const settleDepositAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!financeAccess(viewer)) return { error: 'Your role cannot settle deposits.' };

  const leaseId = field(form, 'leaseId').trim();
  const outcome = field(form, 'outcome');
  if (outcome !== 'refund' && outcome !== 'forfeit' && outcome !== 'transfer') {
    return { fieldErrors: { outcome: 'Choose what happens to the deposit' } };
  }

  try {
    await settleDeposit(await supabaseForRequest(), {
      depositId: field(form, 'depositId').trim(),
      outcome,
      settledOn: field(form, 'settledOn').trim(),
      ...(optionalField(form, 'transferredToLeaseId') === undefined
        ? {}
        : { transferredToLeaseId: optionalField(form, 'transferredToLeaseId') }),
      ...(optionalField(form, 'notes') === undefined
        ? {}
        : { notes: optionalField(form, 'notes') }),
    });
  } catch (error) {
    return { error: errorMessage(error, 'Could not settle the deposit') };
  }

  refreshTenancy(leaseId);
  revalidatePath('/tenancy');
  return { message: 'Deposit settled.' };
};

export const recordHandoverAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('lease.write')) return { error: 'Your role cannot record handovers.' };

  const leaseId = field(form, 'leaseId').trim();
  const kind = field(form, 'kind') === 'move_out' ? 'move_out' : 'move_in';
  const balanceText = field(form, 'outstandingBalance').trim();

  let outstandingBalanceKobo: string | undefined;
  if (balanceText !== '') {
    try {
      outstandingBalanceKobo = toKoboTransport(balanceText);
    } catch (error) {
      return {
        fieldErrors: {
          outstandingBalance: rentFieldError(error).rent ?? 'Enter a valid amount',
        },
      };
    }
  }

  const meterReadings: Record<string, string> = {};
  for (const meter of ['electricity', 'water', 'gas'] as const) {
    const value = field(form, meter).trim();
    if (value !== '') meterReadings[meter] = value;
  }

  try {
    await recordHandover(await supabaseForRequest(), {
      organisationId: viewer.organisationId,
      leaseId,
      kind,
      happenedOn: field(form, 'happenedOn').trim(),
      meterReadings,
      evidencePaths: [],
      keysReturned: checked(form, 'keysReturned'),
      ...(optionalField(form, 'notes') === undefined
        ? {}
        : { notes: optionalField(form, 'notes') }),
      ...(outstandingBalanceKobo === undefined ? {} : { outstandingBalanceKobo }),
    });
  } catch (error) {
    const fieldErrors = fieldErrorsFrom(error);
    if (fieldErrors !== null) return { fieldErrors };
    return { error: errorMessage(error, 'Could not record the handover') };
  }

  refreshTenancy(leaseId);
  return {
    message: kind === 'move_in' ? 'Move-in handover recorded.' : 'Move-out handover recorded.',
  };
};

export const terminateLeaseAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('lease.write')) return { error: 'Your role cannot terminate leases.' };

  const leaseId = field(form, 'leaseId').trim();
  try {
    await terminateLease(await supabaseForRequest(), {
      leaseId,
      terminatedOn: field(form, 'terminatedOn').trim(),
      reason: field(form, 'reason'),
    });
  } catch (error) {
    return { error: errorMessage(error, 'Could not terminate the lease') };
  }

  refreshTenancy(leaseId);
  revalidatePath('/tenancy');
  revalidatePath('/units');
  return { message: 'Lease terminated.' };
};
