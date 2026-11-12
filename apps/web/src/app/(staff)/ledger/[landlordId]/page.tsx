import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { balanceFromEntries } from '@tenaville/core/ledger';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  Money,
  PageHeader,
  Stat,
  Table,
  TableEmpty,
  Td,
  Th,
  statusLabel,
} from '../../../../components/ui';
import { RemittanceForm } from '../../../../components/forms/remittance-form';
import { formatDate } from '../../../../lib/format';
import { paymentMethodLabel, sumKobo, todayIso } from '../../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/**
 * One landlord's ledger (LEDGER-1, LEDGER-4).
 *
 * Every row is an append-only entry. Commission sits beside rent because the
 * landlord must be able to see both what was collected and what the agency
 * took; the funds-class badge is the schema's separation made visible.
 */
export default async function LandlordLedgerPage({
  params,
}: {
  params: Promise<{ landlordId: string }>;
}) {
  const { landlordId } = await params;

  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('ledger.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see this ledger"
          description="The ledger follows the money permission."
          action={
            <LinkButton href="/ledger" variant="secondary">
              Back to ledger
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();

  const [
    { data: landlord, error },
    { data: balanceRows },
    { data: entries },
    { data: remittances },
  ] = await Promise.all([
    supabase
      .from('landlords')
      .select('id, display_name, phone, email')
      .eq('id', landlordId)
      .maybeSingle(),
    supabase.from('landlord_ledger_entries').select('amount_kobo').eq('landlord_id', landlordId),
    supabase
      .from('landlord_ledger_entries')
      .select(
        'id, entry_kind, funds_class, amount_kobo, occurred_on, description, commission_rate_bps, payment_id, remittance_id',
      )
      .eq('landlord_id', landlordId)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('remittances')
      .select('id, amount_kobo, paid_on, method, reference')
      .eq('landlord_id', landlordId)
      .order('paid_on', { ascending: false })
      .limit(50),
  ]);

  if (error !== null || landlord === null) notFound();

  const balance = balanceFromEntries(balanceRows ?? []);
  const commissionEntries = (entries ?? []).filter((entry) => entry.entry_kind === 'commission');
  const totalCommission = commissionEntries.reduce(
    (total, entry) => total - BigInt(entry.amount_kobo),
    0n,
  );
  const totalRemitted = sumKobo((remittances ?? []).map((remittance) => remittance.amount_kobo));

  return (
    <>
      <PageHeader
        title={landlord.display_name}
        description={`Landlord ledger${landlord.phone === null ? '' : ` · ${landlord.phone}`}`}
        action={
          <LinkButton href="/ledger" variant="secondary">
            Back to ledger
          </LinkButton>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Balance held"
          value={<Money kobo={balance.toString()} />}
          hint="Positive is held for the landlord"
        />
        <Stat label="Commission earned" value={<Money kobo={totalCommission.toString()} />} />
        <Stat label="Remitted" value={<Money kobo={totalRemitted.toString()} />} />
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Ledger entries"
          description="Newest first. Commission is agency income; everything else is client money."
          action={<Badge tone="neutral">{entries?.length ?? 0}</Badge>}
        />
        <CardBody className="p-0">
          <Table caption="Ledger entries">
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Entry</Th>
                <Th>Funds</Th>
                <Th numeric>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {entries === null || entries.length === 0 ? (
                <TableEmpty
                  colSpan={4}
                  message="No ledger activity yet. Recording a rent payment posts here."
                />
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <Td>{formatDate(entry.occurred_on)}</Td>
                    <Td>
                      {statusLabel(entry.entry_kind)}
                      <span className="block text-xs text-subtle">{entry.description}</span>
                      {entry.commission_rate_bps !== null && (
                        <span className="text-xs text-subtle">
                          {(entry.commission_rate_bps / 100).toFixed(2)}%
                        </span>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={entry.funds_class === 'agency_income' ? 'warning' : 'info'}>
                        {statusLabel(entry.funds_class)}
                      </Badge>
                    </Td>
                    <Td numeric>
                      {entry.payment_id === null ? (
                        <Money kobo={String(entry.amount_kobo)} />
                      ) : (
                        <Link
                          href={`/rent/payments/${entry.payment_id}`}
                          className="text-info-text underline-offset-2 hover:underline"
                        >
                          <Money kobo={String(entry.amount_kobo)} />
                        </Link>
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Remittances"
          description="Money paid to the landlord. Each one debits the balance."
        />
        <CardBody className="space-y-6">
          {viewer.access.can('ledger.write') && (
            <RemittanceForm landlordId={landlord.id} today={todayIso()} />
          )}

          <div className="border-t border-border pt-2">
            <Table caption="Remittances">
              <thead>
                <tr>
                  <Th>Paid</Th>
                  <Th>Method</Th>
                  <Th>Reference</Th>
                  <Th numeric>Amount</Th>
                </tr>
              </thead>
              <tbody>
                {remittances === null || remittances.length === 0 ? (
                  <TableEmpty colSpan={4} message="No remittances recorded." />
                ) : (
                  remittances.map((remittance) => (
                    <tr key={remittance.id}>
                      <Td>{formatDate(remittance.paid_on)}</Td>
                      <Td>{paymentMethodLabel(remittance.method)}</Td>
                      <Td>{remittance.reference ?? '—'}</Td>
                      <Td numeric>
                        <Money kobo={String(remittance.amount_kobo)} />
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
