import { createClient } from '@supabase/supabase-js';

import type { Database } from '../generated/database.types';
import { supabaseServiceRoleKey, supabaseUrl } from '../env';

/**
 * Service-role client. **Row-level security does not apply.**
 *
 * Using this to serve a user-initiated read removes tenant isolation silently
 * and completely: no error, no log, just another organisation's data in the
 * response. It is for migrations, background jobs and provider webhooks.
 *
 * A job that uses it still carries its own explicit organisation scoping.
 * "It's a job, RLS doesn't apply" is the start of the reasoning, not the end.
 *
 * @param purpose - Why this client is being created, recorded on the request so
 *   service-role traffic is attributable when reviewing logs.
 */
export const createAdminClient = (purpose: string) => {
  if (purpose.trim() === '') {
    throw new Error('createAdminClient requires a purpose, so service-role use is attributable');
  }

  return createClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-tenaville-admin-purpose': purpose },
    },
  });
};

export type AdminClient = ReturnType<typeof createAdminClient>;
