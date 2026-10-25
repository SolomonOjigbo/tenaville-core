import type { UserClient } from '@tenaville/db';

import { createOrganisationSchema, type CreateOrganisationInput } from '../schema/index';

/**
 * Create an organisation with the calling user as owner (ORG-1).
 *
 * Delegates to the `create_organisation_with_owner` database function rather
 * than issuing four inserts. Two reasons, both load-bearing:
 *
 *  - It is one transaction. A half-created organisation — no owner membership,
 *    or no subscription — is a broken account that nobody can sign into or
 *    bill, and it would need a repair script.
 *  - At the moment of signup the user belongs to nothing, so no insert policy
 *    on `organisations` can admit them. The function is the single sanctioned
 *    way in, and it derives the owner from `auth.uid()` rather than from an
 *    argument, so a caller cannot create an organisation owned by someone else.
 */
export const createOrganisation = async (
  client: UserClient,
  input: CreateOrganisationInput,
): Promise<{ organisationId: string }> => {
  const { name, type, ownerFullName } = createOrganisationSchema.parse(input);

  // exactOptionalPropertyTypes is on, so an absent name must be omitted rather
  // than passed as undefined.
  const { data, error } = await client.rpc('create_organisation_with_owner', {
    organisation_name: name,
    organisation_type: type,
    ...(ownerFullName === undefined ? {} : { owner_full_name: ownerFullName }),
  });

  if (error !== null) {
    throw new Error(`could not create organisation: ${error.message}`);
  }
  if (typeof data !== 'string') {
    throw new Error('create_organisation_with_owner did not return an organisation id');
  }

  return { organisationId: data };
};
