import { NextResponse, type NextRequest } from 'next/server';

import { safeRedirect } from '../../../lib/auth';
import { supabaseForRequest } from '../../../server/session';

/**
 * Where email confirmation and password-recovery links land (ORG-2).
 *
 * Supabase sends a one-time `code`; exchanging it here establishes the session
 * cookie. A route handler rather than a page because it must write cookies,
 * which a server component cannot.
 *
 * `next` is sanitised before use. These links arrive from an email client, so
 * the parameter is attacker-influenced: an unchecked value makes every
 * confirmation email a redirect to anywhere.
 */
export const GET = async (request: NextRequest) => {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeRedirect(searchParams.get('next'), '/dashboard');

  if (code === null) {
    return NextResponse.redirect(`${origin}/sign-in?error=link-invalid`);
  }

  const supabase = await supabaseForRequest();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    // Expired or already used. Both are ordinary — a user clicking an old link
    // should be told to request a new one, not shown a stack trace.
    return NextResponse.redirect(`${origin}/sign-in?error=link-expired`);
  }

  return NextResponse.redirect(`${origin}${next}`);
};
