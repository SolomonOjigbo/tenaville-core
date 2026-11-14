import { NextResponse } from 'next/server';

import { createStatementPdf, type StatementPdfLine } from '../../../../../../lib/pdf';
import { currentViewer, supabaseForRequest } from '../../../../../../server/session';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await currentViewer();
  if (viewer === null) return new NextResponse('Sign in required', { status: 401 });
  if (!viewer.access.can('statement.read')) return new NextResponse('Forbidden', { status: 403 });

  const supabase = await supabaseForRequest();
  const { data: statement, error } = await supabase
    .from('statements')
    .select(
      'id, period_start, period_end, revision_number, status, opening_balance_kobo, closing_balance_kobo, lines, landlords(display_name)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error !== null || statement === null) return new NextResponse('Not found', { status: 404 });

  const lines = Array.isArray(statement.lines)
    ? (statement.lines as unknown as StatementPdfLine[])
    : [];

  const pdf = await createStatementPdf({
    organisation: viewer.organisationName,
    landlord: statement.landlords?.display_name ?? 'Landlord',
    periodStart: statement.period_start,
    periodEnd: statement.period_end,
    revision: statement.revision_number,
    status: statement.status,
    openingKobo: statement.opening_balance_kobo,
    closingKobo: statement.closing_balance_kobo,
    lines,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="statement-${statement.period_start}-${statement.period_end}-r${statement.revision_number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
