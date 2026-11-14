import { NextResponse } from 'next/server';

import { createReceiptPdf } from '../../../../../../lib/pdf';
import { paymentMethodLabel } from '../../../../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../../../../server/session';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await currentViewer();
  if (viewer === null) return new NextResponse('Sign in required', { status: 401 });
  if (!viewer.access.can('payment.read')) return new NextResponse('Forbidden', { status: 403 });

  const supabase = await supabaseForRequest();
  const { data: receipt, error } = await supabase
    .from('receipts')
    .select(
      'id, receipt_number, status, issued_on, verification_code, leases(reference, lease_parties(role, tenants(display_name)), units(label, properties(name, address_line, lga, state_code))), payments(amount_kobo, method, reference, paid_on, status, reversal_reason)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error !== null || receipt === null) return new NextResponse('Not found', { status: 404 });

  const lease = receipt.leases;
  const payment = receipt.payments;
  const tenant =
    lease?.lease_parties.find((party) => party.role === 'tenant')?.tenants?.display_name ??
    'Tenant';
  const property = lease?.units?.properties;

  const pdf = await createReceiptPdf({
    organisation: viewer.organisationName,
    receiptNumber: receipt.receipt_number,
    status: receipt.status,
    issuedOn: receipt.issued_on,
    amountKobo: payment?.amount_kobo ?? 0,
    tenant,
    property: property?.name ?? 'Property',
    unit: lease?.units?.label ?? 'Unit',
    leaseReference: lease?.reference ?? 'No reference',
    method: payment === null ? '—' : paymentMethodLabel(payment.method),
    reference: payment?.reference ?? null,
    verificationCode: receipt.verification_code,
    reversed: receipt.status === 'reversed' || payment?.status === 'reversed',
    reversalReason: payment?.reversal_reason ?? null,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${receipt.receipt_number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
