import { NextResponse, type NextRequest } from 'next/server';

import { issueDownloadUrl } from '@tenaville/core/documents';
import { createAdminClient } from '@tenaville/db';

import { supabaseForRequest } from '../../../../../server/session';

/**
 * Exchange a document reference for a short-lived download link (DOC-7).
 *
 * POST, not GET: the response is a capability, and a GET would be prefetched
 * by browsers, logged with its parameters, and cached. The link itself is
 * returned rather than redirected to, so the caller decides when to follow it.
 *
 * The route does no authorisation of its own. `issueDownloadUrl` reads the
 * owning record through the caller's client, so the row-level policies decide
 * — one mechanism rather than two that can drift apart.
 */
export const POST = async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }

  const { bucket, path, entityType, entityId } = (body ?? {}) as Record<string, unknown>;

  if (
    (bucket !== 'documents' && bucket !== 'maintenance') ||
    typeof path !== 'string' ||
    typeof entityType !== 'string' ||
    typeof entityId !== 'string'
  ) {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }

  const supabase = await supabaseForRequest();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user === null) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  const admin = createAdminClient('sign a document download link');

  try {
    const { url, expiresInSeconds } = await issueDownloadUrl(supabase, admin, {
      bucket,
      path,
      entityType: entityType as Parameters<typeof issueDownloadUrl>[2]['entityType'],
      entityId,
    });

    return NextResponse.json(
      { url, expiresInSeconds },
      {
        // The response carries a capability, so no cache may keep it: not the
        // browser, not a proxy, not the back button.
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          Pragma: 'no-cache',
        },
      },
    );
  } catch {
    // One answer for "no such file", "not yours" and "wrong organisation".
    // Distinguishing them would confirm which documents exist.
    return NextResponse.json({ error: 'that file does not exist' }, { status: 404 });
  }
};
