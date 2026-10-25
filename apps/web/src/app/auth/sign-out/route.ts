import { NextResponse, type NextRequest } from 'next/server';

import { supabaseForRequest } from '../../../server/session';

/**
 * Sign out (ORG-9).
 *
 * POST only. A GET would let any page sign a user out with an image tag, and
 * being signed out mid-task is a real nuisance for an agent recording a payment.
 */
export const POST = async (request: NextRequest) => {
  const supabase = await supabaseForRequest();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${request.nextUrl.origin}/sign-in`, { status: 303 });
};
