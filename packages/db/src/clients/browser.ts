import { createClient } from '@supabase/supabase-js';

import type { Database } from '../generated/database.types';
import { supabaseAnonKey, supabaseUrl } from '../env';

/**
 * Anon-key client carrying the signed-in user's session. Row-level security
 * applies. Safe in client components.
 */
export const createBrowserClient = () =>
  createClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

export type BrowserClient = ReturnType<typeof createBrowserClient>;
