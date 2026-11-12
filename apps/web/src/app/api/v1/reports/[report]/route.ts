import { NextResponse } from 'next/server';

import {
  arrearsCsv,
  buildArrears,
  buildCollections,
  buildRentRoll,
  collectionsCsv,
  monthsBack,
  rentRollCsv,
} from '../../../../../lib/reports';
import { todayIso } from '../../../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../../../server/session';
import { fetchArrears, fetchCollections, fetchRentRoll } from '../../../../../server/reports-data';

/**
 * CSV exports for the reports screen.
 *
 * A route handler rather than a client-generated file: the figures must be the
 * ones the user's own permissions allow, so they are read through the request
 * client and RLS applies exactly as on the page. Nothing is cached.
 */
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ report: string }> }) {
  const { report } = await params;

  const viewer = await currentViewer();
  if (viewer === null) {
    return new NextResponse('Sign in required', { status: 401 });
  }
  if (!viewer.access.can('statement.read')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const supabase = await supabaseForRequest();
  const today = todayIso();

  let csv: string;
  let filename: string;

  switch (report) {
    case 'rent-roll': {
      const { data } = await fetchRentRoll(supabase);
      csv = rentRollCsv(buildRentRoll(data ?? []));
      filename = `rent-roll-${today}.csv`;
      break;
    }
    case 'arrears': {
      const { data } = await fetchArrears(supabase);
      csv = arrearsCsv(buildArrears(data ?? [], today));
      filename = `arrears-${today}.csv`;
      break;
    }
    case 'collections': {
      const { data } = await fetchCollections(supabase, monthsBack(today, 6));
      csv = collectionsCsv(buildCollections(data ?? []));
      filename = `collections-${today}.csv`;
      break;
    }
    default:
      return new NextResponse('Unknown report', { status: 404 });
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
