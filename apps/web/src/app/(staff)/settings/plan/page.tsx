import { redirect } from 'next/navigation';

import {
  describeAllowance,
  fetchEntitlements,
  percentageUsed,
  type Allowance,
} from '@tenaville/core/billing';

import { UsageBar } from '../../../../components/billing/usage-bar';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Money,
  PageHeader,
  Table,
  Td,
  Th,
} from '../../../../components/ui';
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
  const entitlements = await fetchEntitlements(supabase, viewer.organisationId);

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

  return (
    <>
      <PageHeader
        title="Plan and limits"
        description="What this organisation is entitled to, and how much of it is in use."
      />

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
