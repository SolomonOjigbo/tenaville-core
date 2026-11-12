import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The monorepo keeps one `.env` at its root, because the database and tooling
 * scripts use it too. Next only looks beside the app it runs (`apps/web`), so
 * without this the dev server starts with no Supabase credentials and every
 * request that touches the session fails. Values already set in the
 * environment — or in a local `apps/web/.env.local` — take precedence.
 */
const monorepoEnv = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
if (existsSync(monorepoEnv) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(monorepoEnv);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The workspace packages ship TypeScript source rather than build output, so
  // Next compiles them itself. See ADR 0001: they are bundled by the apps, not
  // published as libraries.
  transpilePackages: [
    '@tenaville/ui',
    '@tenaville/core',
    '@tenaville/db',
    '@tenaville/money',
    '@tenaville/validation',
    '@tenaville/adapters',
  ],
  // PROP-9 and ADR 0007: there is no public read surface. Nothing here should
  // ever be served to an unauthenticated visitor, and these headers make a
  // mis-deployed page less useful if one ever is.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;
