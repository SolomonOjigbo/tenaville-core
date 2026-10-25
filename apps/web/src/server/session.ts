import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { resolveAccess, type Access } from '@tenaville/core/org';
import type { Database } from '@tenaville/db';

/**
 * The Supabase client for this request, acting as the signed-in user.
 *
 * Row-level security applies, which is the point: a page that filters by
 * organisation in its query is still protected if that filter is forgotten.
 * The service-role client is never used here — see ADR 0002.
 */
export const supabaseForRequest = async () => {
  const store = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (toSet) => {
          try {
            for (const { name, value, options } of toSet) {
              store.set(name, value, options);
            }
          } catch {
            // Server components cannot set cookies. Token refresh happens in
            // middleware or a route handler; failing quietly here is correct
            // rather than throwing on every render.
          }
        },
      },
    },
  );
};

export interface Viewer {
  readonly userId: string;
  readonly email: string | null;
  readonly organisationId: string;
  readonly organisationName: string;
  readonly access: Access;
}

/**
 * Who is viewing, and what they may do.
 *
 * Returns null when nobody is signed in or the account belongs to no
 * organisation yet. Callers render a sign-in state rather than treating absence
 * as an error: with the verification flows still unbuilt (TV-003), that is the
 * normal case in development.
 *
 * The organisation is read through the user's own client, so RLS decides which
 * one they can see. A user in several organisations gets the first by name
 * until there is a switcher to choose with.
 */
export const currentViewer = async (): Promise<Viewer | null> => {
  const supabase = await supabaseForRequest();

  // A failure here is reported as "nobody signed in" so the shell degrades to
  // its sign-in state rather than crashing. That deliberately conflates two
  // different things — no session, and an unreachable auth service — which is
  // acceptable only until TV-001 adds error tracking to tell them apart. It is
  // noted here so the conflation is a decision rather than an accident.
  let userId: string | null = null;
  let email: string | null = null;
  try {
    const { data: auth } = await supabase.auth.getUser();
    userId = auth.user?.id ?? null;
    email = auth.user?.email ?? null;
  } catch {
    return null;
  }
  if (userId === null) return null;

  const { data: organisations, error } = await supabase
    .from('organisations')
    .select('id, name')
    .order('name')
    .limit(1);

  if (error !== null || organisations.length === 0) return null;
  const organisation = organisations[0];
  if (organisation === undefined) return null;

  const access = await resolveAccess(supabase, organisation.id);
  if (access === null) return null;

  return {
    userId,
    email,
    organisationId: organisation.id,
    organisationName: organisation.name,
    access,
  };
};

/**
 * The signed-in account's state, before an organisation is involved.
 *
 * Separate from `currentViewer` because the onboarding pages need to know
 * whether someone is signed in and verified *without* requiring that they
 * already belong to an organisation — which is the whole point of those pages.
 */
export const currentAccount = async (): Promise<{
  userId: string;
  email: string | null;
  emailConfirmed: boolean;
  hasOrganisation: boolean;
} | null> => {
  const supabase = await supabaseForRequest();

  let user;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return null;
  }
  if (user === null || user === undefined) return null;

  const { count } = await supabase
    .from('organisations')
    .select('id', { count: 'exact', head: true });

  return {
    userId: user.id,
    email: user.email ?? null,
    emailConfirmed: user.email_confirmed_at !== null && user.email_confirmed_at !== undefined,
    hasOrganisation: (count ?? 0) > 0,
  };
};

/** Feature flags, read once per request. R2 work stays off by default. */
export const featureFlags = () => ({
  crm: process.env.FEATURE_CRM_ENABLED === 'true',
  screening: process.env.FEATURE_SCREENING_ENABLED === 'true',
});
