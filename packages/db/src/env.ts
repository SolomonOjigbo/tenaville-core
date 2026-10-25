/**
 * Database environment, read once and validated loudly.
 *
 * A missing Supabase URL should fail at startup with a clear message, not as a
 * confusing network error on the first query.
 */

const required = (name: string, value: string | undefined): string => {
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in; ` +
        '`pnpm db:start` prints the local values.',
    );
  }
  return value;
};

export const supabaseUrl = (): string =>
  required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);

export const supabaseAnonKey = (): string =>
  required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * Service-role key. Bypasses row-level security entirely.
 *
 * Only `createAdminClient` reads this, and only migrations and background jobs
 * may use that client — see docs/decisions/0002-supabase-postgres-rls.md.
 */
export const supabaseServiceRoleKey = (): string =>
  /*
   * The single sanctioned read of this variable. The lint rule exists to stop
   * it spreading into request paths, which is exactly why it is funnelled
   * through here — so the disable is on this one line, not relaxed globally.
   */
  // eslint-disable-next-line no-restricted-syntax
  required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
