/**
 * Typed environment variables. Keep in step with .env.example.
 *
 * NEXT_PUBLIC_* values reach the browser. SUPABASE_SERVICE_ROLE_KEY must not:
 * it bypasses RLS and belongs to migrations and background jobs only
 * (docs/decisions/0002-supabase-postgres-rls.md).
 */
declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test';
    readonly APP_URL: string;
    readonly APP_TIMEZONE: string;

    readonly NEXT_PUBLIC_SUPABASE_URL: string;
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    /**
     * Server-only. Never referenced from a client component or a user request path.
     *
     * Declaring the variable's type is not using the key: the rule exists to
     * catch reads in a request path, and it should keep firing everywhere else.
     */
    // eslint-disable-next-line no-restricted-syntax
    readonly SUPABASE_SERVICE_ROLE_KEY?: string;

    readonly STORAGE_BUCKET_DOCUMENTS?: string;
    readonly STORAGE_BUCKET_MAINTENANCE?: string;
    readonly STORAGE_SIGNED_URL_TTL_SECONDS?: string;

    /** Release gating — see docs/requirements/release-plan.md. */
    readonly FEATURE_CRM_ENABLED?: 'true' | 'false';
    readonly FEATURE_SCREENING_ENABLED?: 'true' | 'false';
    readonly FEATURE_MAINTENANCE_APPROVALS_ENABLED?: 'true' | 'false';
    readonly FEATURE_PAYMENT_AUTOMATION_ENABLED?: 'true' | 'false';
    readonly FEATURE_TAX_LINES_ENABLED?: 'true' | 'false';
    /** R3, disabled by default (PRD §16.4). */
    readonly FEATURE_FINANCING_ENABLED?: 'true' | 'false';
  }
}
