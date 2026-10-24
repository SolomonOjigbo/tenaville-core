/**
 * Typed environment for the staff app.
 *
 * Only EXPO_PUBLIC_* values are available at runtime, and everything here ships
 * inside the app bundle — so no secret belongs in this file. The app reaches the
 * server through /api/v1 and holds no service-role credential.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_API_URL: string;
    readonly EXPO_PUBLIC_SUPABASE_URL: string;
    readonly EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
  }
}
