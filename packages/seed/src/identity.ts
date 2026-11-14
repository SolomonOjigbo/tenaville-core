import { createClient } from '@supabase/supabase-js';
import { createAdminClient, createUserClient, type AdminClient, type UserClient } from '@tenaville/db';

import { log, sleep } from './lib/log';

/**
 * How the seed gets users and acts as them. An interface so the local test
 * rig can supply minted tokens where hosted Supabase supplies real sign-in.
 */
export interface Identity {
  createUser(input: { email: string; fullName: string }): Promise<string>;
  accessToken(userId: string, email: string): Promise<string>;
}

interface Session {
  token: string;
  expiresAt: number;
}

export const supabaseIdentity = (
  admin: AdminClient,
  url: string,
  anonKey: string,
  password: string,
): Identity => {
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const sessions = new Map<string, Session>();

  return {
    async createUser({ email, fullName }) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, demo: true },
      });
      if (error !== null || data.user === null) {
        throw new Error(`could not create ${email}: ${error?.message ?? 'no user returned'}`);
      }
      return data.user.id;
    },

    async accessToken(userId, email) {
      const cached = sessions.get(userId);
      if (cached !== undefined && cached.expiresAt - Date.now() > 120_000) return cached.token;

      for (let attempt = 1; attempt <= 6; attempt += 1) {
        const { data, error } = await anon.auth.signInWithPassword({ email, password });
        if (error === null && data.session !== null) {
          const session = {
            token: data.session.access_token,
            expiresAt: (data.session.expires_at ?? 0) * 1000,
          };
          sessions.set(userId, session);
          return session.token;
        }
        // Hosted projects rate-limit sign-ins per IP; wait it out rather than fail a long run.
        const limited = error?.status === 429 || /rate limit/i.test(error?.message ?? '');
        if (!limited || attempt === 6) {
          throw new Error(`could not sign in ${email}: ${error?.message ?? 'no session'}`);
        }
        log.warn(`sign-in rate limited; waiting 30s (attempt ${attempt})`);
        await sleep(30_000);
      }
      throw new Error('unreachable');
    },
  };
};

const clientCache = new Map<string, UserClient>();

/** A client acting as this user. Cached per token, so a token refresh yields a new client. */
export const actAs = async (
  identity: Identity,
  userId: string,
  email: string,
): Promise<UserClient> => {
  const token = await identity.accessToken(userId, email);
  const cached = clientCache.get(token);
  if (cached !== undefined) return cached;
  const client = createUserClient(token);
  clientCache.set(token, client);
  return client;
};

export { createAdminClient };
