import { notFound } from 'next/navigation';

import { Card, EmptyState, LinkButton, PageHeader } from '../../../../../components/ui';
import { PrintButton } from '../../../../../components/payments/print-button';
import { ReceiptDocument } from '../../../../../components/receipts/receipt-document';
import { currentViewer, supabaseForRequest } from '../../../../../server/session';

/** A receipt as the tenant receives it (TENANT-3). RLS limits it to their own. */
export default async function TenantReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const viewer = await currentViewer();
  if (!viewer?.access.can('self.tenancy.read')) {
    return (
      <Card>
        <EmptyState
          title="No tenancy access"
          description="Receipts are available to the tenant on the tenancy."
          action={
            <LinkButton href="/tenancy" variant="secondary">
              Back to tenancy
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const { data: receipt, error } = await supabase
    .from('receipts')
    .select(
      'id, receipt_number, status, issued_on, verification_code, void_reason, branches(name), leases(reference, lease_parties(role, tenants(display_name)), units(label, properties(name, address_line, lga, state_code))), payments(amount_kobo, method, reference, paid_on, status, reversal_reason, tenants(display_name))',
    )
    .eq('id', id)
    .maybeSingle();

  if (error !== null || receipt === null) notFound();

  const lease = receipt.leases;
  const payment = receipt.payments;
  const tenant =
    payment?.tenants?.display_name ??
    lease?.lease_parties.find((party) => party.role === 'tenant')?.tenants?.display_name ??
    'Tenant';
  const property = lease?.units?.properties;
  const address =
    property === null || property === undefined
      ? null
      : [property.address_line, property.lga, property.state_code]
          .filter((part) => part !== null && part !== undefined && part !== '')
          .join(', ');

  return (
    <>
      <PageHeader
        title={`Receipt ${receipt.receipt_number}`}
        description="Issued for a payment on your tenancy."
        action={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <LinkButton href="/tenancy/payments" variant="secondary">
              Back to payments
            </LinkButton>
            <PrintButton />
          </div>
        }
      />

      <ReceiptDocument
        organisationName={viewer.organisationName}
        branchName={receipt.branches?.name ?? null}
        receipt={{
          number: receipt.receipt_number,
          status: receipt.status,
          issuedOn: receipt.issued_on,
          verificationCode: receipt.verification_code,
        }}
        payment={
          payment === null
            ? null
            : {
                amountKobo: payment.amount_kobo,
                method: payment.method,
                reference: payment.reference,
                paidOn: payment.paid_on,
                status: payment.status,
                reversalReason: payment.reversal_reason,
              }
        }
        tenant={tenant}
        propertyName={property?.name ?? 'Property'}
        unitLabel={lease?.units?.label ?? 'Unit'}
        address={address}
        leaseReference={lease?.reference ?? 'No reference'}
        voidReason={receipt.void_reason}
      />
    </>
  );
}
