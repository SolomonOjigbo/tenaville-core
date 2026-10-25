import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { safeRedirect } from './lib/auth';

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

  return response;
};

export const config = {
  // Everything except static assets and images. The auth routes are matched
  // deliberately: they need the refreshed cookies too.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
