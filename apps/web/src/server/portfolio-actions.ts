'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createLandlord } from '@tenaville/core/landlords';
import { createProperty, createUnit } from '@tenaville/core/properties';
import { MoneyParseError, parseNaira, toTransport } from '@tenaville/money';

import { errorMessage, fieldErrorsFrom } from '../lib/form-errors';
import { field, numberField, optionalField } from './form-fields';
import { currentViewer, supabaseForRequest } from './session';
import type { ActionResult } from './auth-actions';

/**
 * Landlords, properties and units (OWN-1, PROP-1, PROP-2).
 *
 * Each action delegates to the core use case, which validates with zod and
 * writes through the caller's own client. The action adds only the session's
 * organisation, the permission check, and the shape of a form result — the
 * rules stay in one place.
 */

const toKoboTransport = (naira: string): string => toTransport(parseNaira(naira));

export const createLandlordAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('landlord.write')) {
    return { error: 'Your role cannot add landlords.' };
  }

  const supabase = await supabaseForRequest();

  try {
    await createLandlord(supabase, {
      organisationId: viewer.organisationId,
      displayName: field(form, 'displayName'),
      isOrganisation: field(form, 'kind') === 'organisation',
      preferredChannel: (field(form, 'preferredChannel') || 'whatsapp') as
        'phone' | 'sms' | 'whatsapp' | 'email',
      ...(optionalField(form, 'phone') === undefined
        ? {}
        : { phone: optionalField(form, 'phone') }),
      ...(optionalField(form, 'email') === undefined
        ? {}
        : { email: optionalField(form, 'email') }),
      ...(optionalField(form, 'addressLine') === undefined
        ? {}
        : { addressLine: optionalField(form, 'addressLine') }),
      ...(optionalField(form, 'stateCode') === undefined
        ? {}
        : { stateCode: optionalField(form, 'stateCode') }),
      ...(optionalField(form, 'lga') === undefined ? {} : { lga: optionalField(form, 'lga') }),
      ...(optionalField(form, 'notes') === undefined
        ? {}
        : { notes: optionalField(form, 'notes') }),
    });
  } catch (error) {
    const fieldErrors = fieldErrorsFrom(error);
    if (fieldErrors !== null) return { fieldErrors };
    return { error: errorMessage(error, 'Could not add the landlord') };
  }

  revalidatePath('/landlords');
  revalidatePath('/properties/new');
  redirect('/landlords');
};

export const createPropertyAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('property.write')) {
    return { error: 'Your role cannot add properties.' };
  }

  const supabase = await supabaseForRequest();

  let propertyId: string;

  try {
    const created = await createProperty(supabase, {
      organisationId: viewer.organisationId,
      ...(viewer.access.branchId === null ? {} : { branchId: viewer.access.branchId }),
      landlordId: field(form, 'landlordId'),
      name: field(form, 'name'),
      propertyType: field(form, 'propertyType') as
        'residential' | 'commercial' | 'mixed_use' | 'estate' | 'land',
      addressLine: field(form, 'addressLine'),
      stateCode: field(form, 'stateCode'),
      ...(optionalField(form, 'reference') === undefined
        ? {}
        : { reference: optionalField(form, 'reference') }),
      ...(optionalField(form, 'lga') === undefined ? {} : { lga: optionalField(form, 'lga') }),
      ...(optionalField(form, 'notes') === undefined
        ? {}
        : { notes: optionalField(form, 'notes') }),
    });
    propertyId = created.propertyId;
  } catch (error) {
    const fieldErrors = fieldErrorsFrom(error);
    if (fieldErrors !== null) return { fieldErrors };
    return { error: errorMessage(error, 'Could not add the property') };
  }

  revalidatePath('/properties');
  redirect(`/properties/${propertyId}`);
};

export const createUnitAction = async (
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> => {
  const viewer = await currentViewer();
  if (viewer === null) return { error: 'Your session has expired. Sign in again.' };
  if (!viewer.access.can('property.write')) {
    return { error: 'Your role cannot add units.' };
  }

  const propertyId = field(form, 'propertyId').trim();
  if (propertyId === '') return { error: 'The property is missing.' };

  const askingText = field(form, 'askingRent').trim();
  let askingRentKobo: string | undefined;
  if (askingText !== '') {
    try {
      askingRentKobo = toKoboTransport(askingText);
    } catch (error) {
      return {
        fieldErrors: {
          askingRent:
            error instanceof MoneyParseError
              ? 'Enter a naira amount, for example 1,200,000.00'
              : 'That amount is too large to store',
        },
      };
    }
  }

  const supabase = await supabaseForRequest();

  try {
    await createUnit(supabase, {
      organisationId: viewer.organisationId,
      propertyId,
      label: field(form, 'label'),
      unitType: field(form, 'unitType') as
        | 'flat'
        | 'self_contained'
        | 'room'
        | 'duplex'
        | 'bungalow'
        | 'shop'
        | 'office'
        | 'warehouse'
        | 'other',
      status: 'vacant',
      facilities: [],
      ...(numberField(form, 'bedrooms') === undefined
        ? {}
        : { bedrooms: numberField(form, 'bedrooms') }),
      ...(numberField(form, 'bathrooms') === undefined
        ? {}
        : { bathrooms: numberField(form, 'bathrooms') }),
      ...(askingRentKobo === undefined ? {} : { askingRentKobo }),
      ...(optionalField(form, 'notes') === undefined
        ? {}
        : { notes: optionalField(form, 'notes') }),
    });
  } catch (error) {
    const fieldErrors = fieldErrorsFrom(error);
    if (fieldErrors !== null) return { fieldErrors };
    return { error: errorMessage(error, 'Could not add the unit') };
  }

  revalidatePath(`/properties/${propertyId}`);
  revalidatePath('/properties');
  return { message: 'Unit added.' };
};
