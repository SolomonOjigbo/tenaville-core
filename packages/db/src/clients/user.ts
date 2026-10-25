import { createClient } from '@supabase/supabase-js';

import type { Database } from '../generated/database.types';
import { supabaseAnonKey, supabaseUrl } from '../env';

/**
 * Server-side client acting as one specific user.
 *
 * This is the default for route handlers and server components: the caller's
 * access token is attached, so `auth.uid()` resolves to them and every policy
 * applies. Use this even when a query "obviously" only touches the caller's own
 * organisation — relying on application filtering alone is the single point of
 * failure ADR 0002 warns about.
 *
 * Deliberately framework-agnostic: it takes a token rather than reading
 * cookies, so the same function serves route handlers, background work acting
 * on a user's behalf, and the mobile app's requests.
 */
export const createUserClient = (accessToken: string) => {
  if (accessToken.trim() === '') {
    throw new Error(
      'createUserClient requires an access token; use createAdminClient for system work',
    );
  }

  return createClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    auth: {
      // The token is supplied per request; nothing is persisted or refreshed
      // server-side.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
};

export type UserClient = ReturnType<typeof createUserClient>;
