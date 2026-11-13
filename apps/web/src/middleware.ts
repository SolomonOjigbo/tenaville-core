import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { safeRedirect } from './lib/auth';
import {
  DEVICE_COOKIE,
  DEVICE_COOKIE_MAX_AGE,
  SESSION_IDLE_DAYS,
  deviceLabel,
  isDeviceKey,
} from './lib/device';

/**
 * Refreshes the Supabase session on every request and guards the private
 * routes.
 *
 * Server components cannot write cookies, so a token that expires mid-session
 * would never be refreshed without this: the user would appear signed in until
 * their first mutation failed. Middleware is the only place in the App Router
 * that can both read the request cookies and set them on the response.
 *
 * The redirect here is a convenience, not the security boundary. Row-level
 * security is (ADR 0002) — a request that slipped past this still cannot read
 * another organisation's rows.
 */

/** Routes reachable without a session. Everything else requires one. */
const PUBLIC_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/accept-invitation',
  '/legal',
  '/auth/',
  '/design',
];

const isPublic = (pathname: string): boolean =>
  PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));

export const middleware = async (request: NextRequest) => {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser, not getSession: it verifies the token with the auth server rather
  // than trusting what the cookie claims. A forged cookie must not survive.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (user === null && !isPublic(pathname)) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = '/sign-in';
    signIn.search = '';
    // Remember where they were headed, sanitised — an unchecked `next` is an
    // open redirect.
    const wanted = safeRedirect(`${pathname}${search}`, '/dashboard');
    if (wanted !== '/dashboard') signIn.searchParams.set('next', wanted);
    return NextResponse.redirect(signIn);
  }

  // A signed-in user has no business on the sign-in or sign-up pages.
  if (user !== null && (pathname === '/sign-in' || pathname === '/sign-up')) {
    const home = request.nextUrl.clone();
    home.pathname = '/dashboard';
    home.search = '';
    return NextResponse.redirect(home);
  }

  if (user !== null) {
    const existingKey = request.cookies.get(DEVICE_COOKIE)?.value;
    const deviceKey = isDeviceKey(existingKey) ? existingKey : crypto.randomUUID();

    const { data: session, error: sessionError } = await supabase
      .from('device_sessions')
      .select('revoked_at, last_seen_at')
      .eq('user_id', user.id)
      .eq('device_key', deviceKey)
      .maybeSingle();

    const idleCutoff = Date.now() - SESSION_IDLE_DAYS * 24 * 60 * 60 * 1000;
    const revoked =
      sessionError === null &&
      session !== null &&
      (session.revoked_at !== null || Date.parse(String(session.last_seen_at)) < idleCutoff);

    if (revoked) {
      await supabase.auth.signOut();
      const signIn = request.nextUrl.clone();
      signIn.pathname = '/sign-in';
      signIn.search = 'error=session-revoked';
      const redirect = NextResponse.redirect(signIn);
      for (const cookie of request.cookies.getAll()) {
        if (cookie.name.startsWith('sb-')) {
          redirect.cookies.set(cookie.name, '', { path: '/', maxAge: 0 });
        }
      }
      redirect.cookies.set(DEVICE_COOKIE, '', { path: '/', maxAge: 0 });
      return redirect;
    }

    // A failure to record the device must not lock a person out of the product;
    // revocation is enforced when the row is readable.
    if (sessionError === null) {
      await supabase.from('device_sessions').upsert(
        {
          user_id: user.id,
          device_key: deviceKey,
          device_label: deviceLabel(request.headers.get('user-agent')),
          user_agent: request.headers.get('user-agent')?.slice(0, 500) ?? null,
          platform: 'web',
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,device_key' },
      );
    }

    response.cookies.set(DEVICE_COOKIE, deviceKey, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: DEVICE_COOKIE_MAX_AGE,
    });
  }

  return response;
};

export const config = {
  // Everything except static assets and images. The auth routes are matched
  // deliberately: they need the refreshed cookies too.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
