/**
 * Request schemas for the org module, shared by web, mobile and route handlers.
 */
import { z } from 'zod';

import { APP_ROLES } from '../domain/roles';

export const organisationTypeSchema = z.enum(['agency', 'individual_landlord']);

export const appRoleSchema = z.enum(APP_ROLES);

export const createOrganisationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Organisation name must be at least 2 characters')
    .max(200, 'Organisation name must be 200 characters or fewer'),
  type: organisationTypeSchema.default('agency'),
  ownerFullName: z.string().trim().min(2, 'Enter your full name').max(200).optional(),
});

export type CreateOrganisationInput = z.infer<typeof createOrganisationSchema>;

export const inviteMemberSchema = z.object({
  organisationId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  role: appRoleSchema,
  branchId: z.string().uuid().optional(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const changeMemberRoleSchema = z.object({
  membershipId: z.string().uuid(),
  role: appRoleSchema,
  // ORG-5: a role change is a sensitive action and must say why.
  reason: z.string().trim().min(3, 'Give a reason for the role change').max(500),
});

export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>;

export const revokeSessionSchema = z.object({
  deviceSessionId: z.string().uuid(),
  reason: z.string().trim().min(3, 'Give a reason for revoking the session').max(500),
});

export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>;
