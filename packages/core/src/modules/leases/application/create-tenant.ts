import type { UserClient } from '@tenaville/db';

import { createTenantSchema, type CreateTenantInput } from '../schema/index';

/**
 * Record a tenant (LEASE-1).
 *
 * Next-of-kin, employer and referee details are deliberately not accepted
 * here. They are optional, they are personal data about third parties, and
 * collecting none of them must be as easy as collecting all — so they are a
 * separate, explicit action rather than fields on the main form (PRD
 * principle 8, privacy by design).
 */
export const createTenant = async (
  client: UserClient,
  input: CreateTenantInput,
): Promise<{ tenantId: string }> => {
  const parsed = createTenantSchema.parse(input);

  const { data, error } = await client
    .from('tenants')
    .insert({
      organisation_id: parsed.organisationId,
      kind: parsed.kind,
      display_name: parsed.displayName,
      preferred_channel: parsed.preferredChannel,
      ...(parsed.phone === undefined ? {} : { phone: parsed.phone }),
      ...(parsed.email === undefined ? {} : { email: parsed.email }),
      ...(parsed.occupation === undefined ? {} : { occupation: parsed.occupation }),
      ...(parsed.employerName === undefined ? {} : { employer_name: parsed.employerName }),
      ...(parsed.businessRegistration === undefined
        ? {}
        : { business_registration: parsed.businessRegistration }),
      ...(parsed.notes === undefined ? {} : { notes: parsed.notes }),
    })
    .select('id')
    .single();

  if (error !== null) throw new Error(`could not create tenant: ${error.message}`);
  return { tenantId: data.id };
};
