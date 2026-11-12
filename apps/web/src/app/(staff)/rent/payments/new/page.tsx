import { redirect } from 'next/navigation';

import { formatNaira, kobo } from '@tenaville/money';

import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  statusLabel,
} from '../../../../../components/ui';
import {
  RecordPaymentForm,
  type LeaseChargeOption,
  type LeaseOption,
} from '../../../../../components/payments/record-payment-form';
import { formatDate } from '../../../../../lib/format';
import { outstandingKobo, todayIso } from '../../../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../../../server/session';

/**
 * Record a payment (RENT-2, TV-022).
 *
 * The lease list carries what each tenancy still owes so the person at the
 * counter can see whether ₦300,000 clears the quarter before typing it. The
 * default allocation order is oldest charge first; an explicit split is a
 * permissioned override (RENT-14) and not part of this screen yet.
 */
export default async function NewPaymentPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('payment.record')) {
    return (
      <Card>
        <EmptyState
          title="You cannot record payments"
          description="This is a money permission. Ask an owner, administrator or accountant to record the payment, or to give you the role that can."
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

  const { data: leases } = await supabase
    .from('leases')
    .select(
      'id, reference, units(label, properties(name)), lease_parties(role, tenants(display_name))',
    )
    .eq('status', 'active')
    .order('reference');

  const leaseRows = leases ?? [];
  const leaseIds = leaseRows.map((lease) => lease.id);

  const { data: charges } =
    leaseIds.length === 0
      ? { data: [] }
      : await supabase
          .from('charges')
          .select(
            'id, lease_id, sequence, kind, due_on, period_start, period_end, amount_kobo, payment_allocations(amount_kobo)',
          )
          .eq('status', 'open')
          .in('lease_id', leaseIds)
          .order('due_on');

  const owedByLease = new Map<string, bigint>();
  const chargesByLease = new Map<string, LeaseChargeOption[]>();

  for (const charge of charges ?? []) {
    const owed = outstandingKobo(charge.amount_kobo, charge.payment_allocations);
    owedByLease.set(charge.lease_id, (owedByLease.get(charge.lease_id) ?? 0n) + owed);
    if (owed <= 0n) continue;

    const list = chargesByLease.get(charge.lease_id) ?? [];
    list.push({
      id: charge.id,
      label: `${statusLabel(charge.kind)} ${charge.sequence} · ${formatDate(charge.period_start)} to ${formatDate(charge.period_end)}`,
      outstandingLabel: formatNaira(kobo(owed)),
    });
    chargesByLease.set(charge.lease_id, list);
  }

  const tenantOf = (lease: {
    lease_parties: { role: string; tenants: { display_name: string } | null }[];
  }): string =>
    lease.lease_parties.find((party) => party.role === 'tenant')?.tenants?.display_name ?? 'Tenant';

  const options: LeaseOption[] = leaseRows
    .map((lease) => {
      const owed = owedByLease.get(lease.id) ?? 0n;
      const place = [lease.units?.properties?.name, lease.units?.label]
        .filter((part) => part !== undefined && part !== null)
        .join(' · ');
      return {
        id: lease.id,
        owed,
        label: `${lease.reference ?? 'Lease'} · ${tenantOf(lease)}${place === '' ? '' : ` · ${place}`} — ${owed > 0n ? `${formatNaira(kobo(owed))} owed` : 'nothing outstanding'}`,
        charges: chargesByLease.get(lease.id) ?? [],
      };
    })
    .sort((a, b) => (a.owed === b.owed ? a.label.localeCompare(b.label) : a.owed > b.owed ? -1 : 1))
    .map(({ id, label, charges }) => ({ id, label, charges }));

  return (
    <>
      <PageHeader
        title="Record a payment"
        description="The receipt number is issued by the server in the same step, so the payment and its receipt cannot disagree."
        action={
          <LinkButton href="/rent" variant="secondary">
            Back to rent
          </LinkButton>
        }
      />

      {options.length === 0 ? (
        <Card>
          <EmptyState
            title="No active tenancies"
            description="A payment needs an active lease to belong to. Activate a lease for the unit first, then record its rent here."
            action={
              <LinkButton href="/rent" variant="secondary">
                Back to rent
              </LinkButton>
            }
          />
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Payment details"
            description="The receipt is issued for you. Allocation defaults to the oldest unpaid charge; a permitted override is available below."
          />
          <CardBody>
            <RecordPaymentForm
              leases={options}
              today={todayIso()}
              canOverride={viewer.access.can('payment.allocation.override')}
            />
          </CardBody>
        </Card>
      )}
    </>
  );
}
