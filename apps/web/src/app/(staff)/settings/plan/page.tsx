import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  billingInvoiceStatusLabel,
  describeAllowance,
  fetchEntitlements,
  fetchUsageWarnings,
  invoiceBalanceKobo,
  isInvoiceOverdue,
  percentageUsed,
  type Allowance,
} from '@tenaville/core/billing';
import { formatNaira, kobo } from '@tenaville/money';

import { UsageBar } from '../../../../components/billing/usage-bar';
import { UsageNotice } from '../../../../components/billing/usage-notice';
import { GenerateInvoiceForm } from '../../../../components/forms/generate-invoice-form';
import { PlanChangeForm } from '../../../../components/forms/plan-change-form';
import {
  Badge,
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
  invoiceStatusTone,
} from '../../../../components/ui';
import { formatDate, monthBounds } from '../../../../lib/format';
import { todayIso } from '../../../../lib/payments';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/**
 * Plan, limits and what is included (BILL-3, TV-147).
 *
 * The limits are enforced by triggers in the database, so this page cannot
 * grant anything. Its job is to make a refusal predictable rather than a
 * surprise: an agency that can see it is at 10 of 10 units knows why the
 * eleventh was turned down, and what it would cost not to be.
 *
 * Every number comes from `plan_entitlements()`, verdicts included, so the
 * page and the trigger cannot disagree about whether there is room.
 */
export default async function PlanPage() {
  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  // The nav hides this from a caretaker, and a typed URL is not the nav. Read
  // access, not `org.billing.manage`: an accountant pays the bill and an admin
  // runs into the seat limit, so both need to see the numbers. Changing the
  // plan will need the manage permission when there is something to change
  // (TV-067).
  if (!viewer.access.can('org.billing.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see the plan"
          description="Only an owner, an administrator or an accountant can see what this organisation is subscribed to."
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const [entitlements, warnings, { data: subscription }, { data: plans }, { data: invoices }] =
    await Promise.all([
      fetchEntitlements(supabase, viewer.organisationId),
      fetchUsageWarnings(supabase, viewer.organisationId),
      supabase
        .from('subscriptions')
        .select(
          'plan_id, status, trial_ends_on, current_period_start, current_period_end, units_included',
        )
        .eq('organisation_id', viewer.organisationId)
        .maybeSingle(),
      supabase
        .from('plans')
        .select(
          'id, name, price_kobo, billing_period, unit_limit, property_limit, user_limit, sort_order',
        )
        .eq('is_public', true)
        .order('sort_order'),
      supabase
        .from('billing_invoices')
        .select(
          'id, invoice_number, period_start, period_end, status, total_kobo, amount_paid_kobo, due_on, issued_on',
        )
        .eq('organisation_id', viewer.organisationId)
        .order('issued_on', { ascending: false })
        .limit(20),
    ]);

  if (entitlements === null) {
    return (
      <Card>
        <EmptyState
          title="No plan on record"
          description="This organisation has no subscription yet. Free-plan limits apply until it has one."
        />
      </Card>
    );
  }

  const { data: catalogue } = await supabase
    .from('features')
    .select('key, label, description, is_available')
    .order('key');

  const rows: readonly { label: string; allowance: Allowance; note: string }[] = [
    {
      label: 'Properties',
      allowance: entitlements.properties,
      note: 'Every property on the books.',
    },
    {
      label: 'Units',
      allowance: entitlements.units,
      note: 'Active units, including vacant ones. Units set to inactive do not count.',
    },
    {
      label: 'Users',
      allowance: entitlements.users,
      note: 'Staff seats, including unaccepted invitations. Tenant and landlord portal access is not a seat.',
    },
  ];

  const planRows = plans ?? [];
  const invoiceRows = invoices ?? [];
  const canManage = viewer.access.can('org.billing.manage');
  const month = monthBounds(todayIso());
  const planChoices = planRows.map((plan) => ({
    id: plan.id,
    name: plan.name,
    priceLabel: plan.price_kobo === 0 ? 'Free' : formatNaira(kobo(plan.price_kobo)),
    allowanceLabel: `${plan.unit_limit === null ? 'Unlimited' : plan.unit_limit} units`,
  }));

  return (
    <>
      <PageHeader
        title="Plan and limits"
        description="What this organisation is entitled to, and how much of it is in use."
      />

      <UsageNotice warnings={warnings} />

      <Card className="mb-6">
        <CardHeader title={entitlements.planName} description="The plan these limits come from." />
        <CardBody>
          <Table caption="Plan limits, how much of each is in use, and whether there is room">
            <thead>
              <tr>
                <Th>Limit</Th>
                <Th>In use</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, allowance, note }) => (
                <tr key={label}>
                  <Td>
                    <span className="text-text">{label}</span>
                    <span className="mt-1 block text-xs text-subtle">{note}</span>
                  </Td>
                  <Td>
                    <span className="text-text">{describeAllowance(allowance)}</span>
                    <UsageBar percentage={percentageUsed(allowance)} />
                  </Td>
                  <Td>
                    {allowance.verdict === 'refused' && (
                      <Badge tone="danger">Full — upgrade to add more</Badge>
                    )}
                    {allowance.verdict === 'billable' && allowance.overageKobo !== null && (
                      <Badge tone="warning">
                        Extras billed at <Money kobo={allowance.overageKobo.toString()} /> each
                      </Badge>
                    )}
                    {allowance.verdict === 'within' && <Badge tone="success">Room to grow</Badge>}
                    {allowance.verdict === 'unlimited' && <Badge tone="neutral">Unlimited</Badge>}
                  </Td>
                </tr>
              ))}
              <tr>
                <Td>
                  <span className="text-text">Storage</span>
                  <span className="mt-1 block text-xs text-subtle">
                    Photos and documents. Not yet measured — see TV-052.
                  </span>
                </Td>
                <Td>
                  {entitlements.storageMb === null ? 'Unlimited' : `${entitlements.storageMb} MB`}
                </Td>
                <Td>
                  <Badge tone="neutral">Included</Badge>
                </Td>
              </tr>
              <tr>
                <Td>
                  <span className="text-text">Automated messages</span>
                  <span className="mt-1 block text-xs text-subtle">
                    WhatsApp and SMS sent for you each month. Sharing by hand is always free.
                  </span>
                </Td>
                <Td>
                  {entitlements.includedMessages === null
                    ? 'Unlimited'
                    : `${entitlements.includedMessages} a month`}
                </Td>
                <Td>
                  <Badge tone="neutral">Included</Badge>
                </Td>
              </tr>
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="Subscription"
          description="The plan in force, the trial if any, and the current billing period."
        />
        <CardBody className="space-y-6">
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Plan</dt>
              <dd className="mt-0.5 text-text">{entitlements.planName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Status</dt>
              <dd className="mt-0.5 text-text">{subscription?.status ?? 'No subscription'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-subtle">Trial ends</dt>
              <dd className="mt-0.5 text-text">
                {subscription?.trial_ends_on === null || subscription?.trial_ends_on === undefined
                  ? '—'
                  : formatDate(subscription.trial_ends_on)}
              </dd>
            </div>
          </dl>

          <div className="border-t border-border pt-4">
            <PlanChangeForm
              plans={planChoices}
              currentPlanId={subscription?.plan_id ?? entitlements.planId}
              canManage={canManage}
            />
          </div>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="Invoices"
          description="Issued in naira. An invoice freezes the plan price for its period."
          action={
            <LinkButton href="/settings/invoices" variant="secondary">
              All invoices
            </LinkButton>
          }
        />
        <CardBody className="space-y-6">
          <Table caption="Recent invoices">
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Period</Th>
                <Th numeric>Total</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {invoiceRows.length === 0 ? (
                <TableEmpty colSpan={4} message="No invoices yet." />
              ) : (
                invoiceRows.slice(0, 5).map((invoice) => {
                  const balance = invoiceBalanceKobo(invoice.total_kobo, invoice.amount_paid_kobo);
                  return (
                    <tr key={invoice.id}>
                      <Td>
                        <Link
                          href={`/settings/invoices/${invoice.id}`}
                          className="text-info-text underline-offset-2 hover:underline"
                        >
                          {invoice.invoice_number}
                        </Link>
                        <span className="block text-xs text-subtle">
                          Issued {formatDate(invoice.issued_on)}
                        </span>
                      </Td>
                      <Td>
                        {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
                      </Td>
                      <Td numeric>
                        <Money kobo={String(invoice.total_kobo)} />
                        {balance > 0n && (
                          <span className="block text-xs text-muted">
                            {formatNaira(kobo(balance))} outstanding
                          </span>
                        )}
                      </Td>
                      <Td>
                        <Badge tone={invoiceStatusTone(invoice.status)}>
                          {billingInvoiceStatusLabel(invoice.status)}
                        </Badge>
                        {isInvoiceOverdue(invoice.status, invoice.due_on, todayIso()) && (
                          <span className="mt-1 block text-xs text-danger-text">Overdue</span>
                        )}
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>

          <div className="border-t border-border pt-4">
            <GenerateInvoiceForm
              defaultStart={month.start}
              defaultEnd={month.end}
              canManage={canManage}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="What is included"
          description="Features this plan grants, and what the rest would add."
        />
        <CardBody>
          <ul className="space-y-3">
            {(catalogue ?? []).map((feature) => {
              const granted = entitlements.features.includes(feature.key);
              return (
                <li key={feature.key} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-text">{feature.label}</p>
                    <p className="text-xs text-subtle">{feature.description}</p>
                  </div>
                  {granted ? (
                    feature.is_available ? (
                      <Badge tone="success">Included</Badge>
                    ) : (
                      <Badge tone="neutral">Included, not built yet</Badge>
                    )
                  ) : (
                    <Badge tone="warning">Not on this plan</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>
    </>
  );
}
