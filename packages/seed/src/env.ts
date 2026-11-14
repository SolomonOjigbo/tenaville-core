/**
 * Environment and the safety guard.
 *
 * This tool creates logins with a shared password and writes thousands of
 * rows. Pointed at production it would be a disaster, so it refuses by
 * default: a hosted target must be named twice (an env flag and the project
 * ref on the command line) and must not appear on the production deny-list.
 */

export interface SeedEnv {
  readonly url: string;
  readonly anonKey: string;
  readonly password: string;
  readonly emailDomain: string;
  readonly seed: string;
  readonly projectRef: string | null;
  readonly isLocal: boolean;
}

const need = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') throw new Error(`${name} is not set`);
  return value.trim();
};

export const readEnv = (confirmRef: string | undefined): SeedEnv => {
  const url = need('NEXT_PUBLIC_SUPABASE_URL');
  const host = new URL(url).hostname;
  const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(host);
  const projectRef = host.endsWith('.supabase.co') ? (host.split('.')[0] ?? null) : null;

  const password = need('SEED_DEMO_PASSWORD');
  if (password.length < 12) throw new Error('SEED_DEMO_PASSWORD must be at least 12 characters');

  if (!isLocal) {
    if (process.env.SEED_ALLOW_HOSTED !== 'yes-this-is-not-production') {
      throw new Error(
        'Refusing to seed a hosted project. Set SEED_ALLOW_HOSTED=yes-this-is-not-production ' +
          'only for a staging/demo project you are sure is not production.',
      );
    }
    if (projectRef === null) {
      throw new Error(`Cannot derive a project ref from ${host}; hosted seeding needs *.supabase.co`);
    }
    if (confirmRef !== projectRef) {
      throw new Error(
        `Pass --confirm-project-ref ${projectRef} to confirm you mean to seed this project.`,
      );
    }
    const denied = (process.env.SEED_PRODUCTION_REFS ?? '')
      .split(',')
      .map((ref) => ref.trim())
      .filter(Boolean);
    if (denied.includes(projectRef)) {
      throw new Error(`Project ${projectRef} is on SEED_PRODUCTION_REFS. Not seeding.`);
    }
  }

  return {
    url,
    anonKey: need('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    password,
    emailDomain: process.env.SEED_EMAIL_DOMAIN?.trim() || 'demo.tenaville.app',
    seed: process.env.SEED_RNG?.trim() || 'tenaville-demo-v1',
    projectRef,
    isLocal,
  };
};
