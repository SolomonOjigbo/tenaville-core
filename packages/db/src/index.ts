/**
 * Supabase clients and generated Postgres types.
 *
 * Three clients with three different risks — see packages/db/README.md:
 *   createBrowserClient  anon key, user session, RLS applies
 *   createUserClient     server-side, acting as one user, RLS applies
 *   createAdminClient    service role, RLS DOES NOT APPLY
 */
export { createBrowserClient, type BrowserClient } from './clients/browser.js';
export { createUserClient, type UserClient } from './clients/user.js';
export { createAdminClient, type AdminClient } from './clients/admin.js';

export type { Database, Json } from './generated/database.types.js';

import type { Database } from './generated/database.types.js';

type PublicSchema = Database['public'];

/** Row types, so callers do not re-derive `Database['public']['Tables'][…]`. */
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type Insertable<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type Updatable<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];

export type Organisation = Tables<'organisations'>;
export type Membership = Tables<'memberships'>;
export type Assignment = Tables<'assignments'>;
export type AuditEvent = Tables<'audit_events'>;
export type DeviceSession = Tables<'device_sessions'>;
export type Plan = Tables<'plans'>;
export type Subscription = Tables<'subscriptions'>;

export type AppRole = Enums<'app_role'>;
export type MembershipStatus = Enums<'membership_status'>;
export type OrganisationType = Enums<'organisation_type'>;
export type SubscriptionStatus = Enums<'subscription_status'>;
