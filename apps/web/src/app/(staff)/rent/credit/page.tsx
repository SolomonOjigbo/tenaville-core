import { redirect } from 'next/navigation';

import { formatNaira, fromTransport } from '@tenaville/money';

import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  Money,
  PageHeader,
  Table,
  TableEmpty,
  Td,
  Th,
} from '../../../../components/ui';
import {
  ApplyCreditForm,
  type CreditOption,
  type FutureChargeOption,
} from '../../../../components/forms/apply-credit-form';
import { formatDate } from '../../../../lib/format';
import { outstandingKobo, todayIso } from '../../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

const tenantOf = (lease: {
  lease_parties: { role: string; tenants: { display_name: string } | null }[];
} | null): string =>
  lease?.lease_parties.find((party) => party.role === 'tenant')?.tenants?.display_name ?? 'Tenant';

/** Apply an unallocated tenant credit to a future charge (RENT-14). */
export default async function RentCreditPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('payment.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see tenant credit"
          description="Credit follows the payment permission."
          action={
            <LinkButton href="/rent" variant="secondary">
              Back to rent
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const today = todayIso();
  const [{ data: creditRows }, { data: chargeRows }] = await Promise.all([
    supabase
      .from('payment_allocations')
      .select(
        'id, amount_kobo, lease_id, payment_id, payments(paid_on, reference), leases(reference, units(label, properties(name)), lease_parties(role, tenants(display_name)))',
      )
      .is('charge_id', null)
      .gt('amount_kobo', 0)
      .order('created_at'),
    supabase
      .from('charges')
      .select(
        'id, lease_id, due_on, period_start, period_end, amount_kobo, payment_allocations(amount_kobo), leases(reference, units(label, properties(name)), lease_parties(role, tenants(display_name)))',
      )
      .eq('status', 'open')
      .gte('due_on', today)
      .order('due_on')
      .limit(300),
  ]);

  const credits = (creditRows ?? [])
    .map((credit) => ({
      ...credit,
      tenant: tenantOf(credit.leases),
      lease: credit.leases?.reference ?? 'No reference',
      property: credit.leases?.units?.properties?.name ?? 'Property',
      unit: credit.leases?.units?.label ?? 'Unit',
    }))
    .filter((credit) => credit.amount_kobo > 0);

  const futureCharges = (chargeRows ?? [])
    .map((charge) => ({
      ...charge,
      outstanding: outstandingKobo(charge.amount_kobo, charge.payment_allocations),
      tenant: tenantOf(charge.leases),
      lease: charge.leases?.reference ?? 'No reference',
      property: charge.leases?.units?.properties?.name ?? 'Property',
      unit: charge.leases?.units?.label ?? 'Unit',
    }))
    .filter((charge) => charge.outstanding > 0n);

  const creditOptions: CreditOption[] = credits.map((credit) => ({
    id: credit.id,
    label: `${credit.tenant} · ${credit.lease} · ${credit.property} ${credit.unit} · ${formatDate(
      credit.payments?.paid_on ?? today,
    )}`,
  }));
  const chargeOptions: FutureChargeOption[] = futureCharges.map((charge) => ({
    id: charge.id,
    label: `${charge.tenant} · ${charge.lease} · due ${formatDate(charge.due_on)} · outstanding ${formatNaira(
      fromTransport(charge.outstanding.toString()),
    )}`,
  }));

  return (
    <>
      <PageHeader
        title="Tenant credit"
        description="Unallocated money held for a tenant, and the future charges it can be applied to."
        action={
          <LinkButton href="/rent" variant="secondary">
            Back to rent
          </LinkButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader
            title="Available credit"
            description="Created when a payment exceeded its allocations. Applying it changes where the money sits, not the amount received."
          />
          <CardBody className="p-0">
            <Table caption="Tenant credit">
              <thead>
                <tr>
                  <Th>Tenant</Th>
                  <Th>Tenancy</Th>
                  <Th>Received</Th>
                  <Th numeric>Credit</Th>
                </tr>
              </thead>
              <tbody>
                {credits.length === 0 ? (
                  <TableEmpty colSpan={4} message="No unallocated tenant credit." />
                ) : (
                  credits.map((credit) => (
                    <tr key={credit.id}>
                      <Td>{credit.tenant}</Td>
                      <Td>
                        {credit.lease}
                        <span className="block text-xs text-subtle">
                          {credit.property} · {credit.unit}
                        </span>
                      </Td>
                      <Td>{formatDate(credit.payments?.paid_on ?? today)}</Td>
                      <Td numeric>
                        <Money kobo={String(credit.amount_kobo)} tone="paid" />
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
            title="Apply credit"
            description="Only future, open charges can receive credit."
          />
          <CardBody>
            {viewer.access.can('payment.record') ? (
              credits.length === 0 || futureCharges.length === 0 ? (
                <p className="text-sm text-muted">
                  There must be both available credit and a future charge with an outstanding
                  balance.
                </p>
              ) : (
                <ApplyCreditForm credits={creditOptions} charges={chargeOptions} />
              )
            ) : (
              <p className="text-sm text-muted">Your role cannot apply tenant credit.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
