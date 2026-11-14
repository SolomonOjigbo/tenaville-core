import { clientFor, must, ok, person, type Ctx, type OrgCtx, type Person } from '../context';
import { log, mapLimit } from '../lib/log';
import { koboNumber } from '../lib/money';
import { syntheticPhone } from '../world/pools';

const orgEmail = (ctx: Ctx, org: OrgCtx, handle: string): string =>
  `${handle}@${org.spec.key}.${ctx.env.emailDomain}`;

/**
 * Create the organisation as its owner would (so the audit trail starts with a
 * real actor), move it onto its plan, then add staff.
 */
export const seedOrganisation = async (ctx: Ctx, org: OrgCtx): Promise<void> => {
  const { spec } = org;
  log.step(`${spec.name}: organisation, plan and staff`);

  // 1. Auth users for every staff member. Creation is parallel-safe.
  await mapLimit(spec.staff, 4, async (staff) => {
    const email = orgEmail(ctx, org, staff.handle);
    const id = await ctx.identity.createUser({ email, fullName: staff.name });
    org.people.set(staff.handle, { id, email, name: staff.name, handle: staff.handle, role: staff.role });
  });

  // 2. The owner creates the organisation.
  const ownerSpec = must(spec.staff.find((s) => s.role === 'owner'), 'owner');
  const owner = person(org, ownerSpec.handle);
  const ownerClient = await clientFor(ctx, owner);

  const created = await ownerClient.rpc('create_organisation_with_owner', {
    organisation_name: spec.name,
    organisation_type: spec.type,
    owner_full_name: owner.name,
  });
  ok(created.error, 'create_organisation_with_owner');
  org.id = must(created.data, 'organisation id');

  // 3. Onto the paid plan, with a reason, so the subscription history reads naturally.
  const plan = await ownerClient.rpc('change_subscription_plan', {
    p_organisation_id: org.id,
    p_plan_id: spec.plan,
    p_reason: 'Upgraded from trial after onboarding',
  });
  ok(plan.error, 'change_subscription_plan');

  // 4. Organisation settings.
  const settings = await ownerClient
    .from('organisations')
    .update({
      receipt_prefix: spec.receiptPrefix,
      maintenance_approval_threshold_kobo: koboNumber(spec.maintenanceThresholdNaira),
    })
    .eq('id', org.id);
  ok(settings.error, 'organisation settings');

  // 5. Branches (agencies with more than one office).
  for (const branch of spec.branches) {
    const { data, error } = await ownerClient
      .from('branches')
      .insert({ organisation_id: org.id, name: branch.name, receipt_prefix: branch.receiptPrefix })
      .select('id')
      .single();
    ok(error, `branch ${branch.name}`);
    org.branchIds.set(branch.key, must(data, 'branch').id);
  }

  // 6. Everyone else joins. Profiles are written with the service role (a user
  // may not insert another user's row); memberships by the owner, as in product.
  const others = spec.staff.filter((s) => s.handle !== ownerSpec.handle);
  for (const staff of others) {
    const who = person(org, staff.handle);
    ctx.phoneSerial += 1;
    const profile = await ctx.admin
      .from('users')
      .upsert({ id: who.id, email: who.email, full_name: who.name, phone: syntheticPhone(ctx.phoneSerial) });
    ok(profile.error, `profile ${who.email}`);

    const invitedAt = new Date(Date.now() - ctx.rng.int(20, 200) * 86_400_000).toISOString();
    const membership = await ownerClient.from('memberships').insert({
      organisation_id: org.id,
      user_id: who.id,
      role: staff.role,
      status: staff.invited === true ? 'invited' : 'active',
      invited_by: owner.id,
      invited_at: invitedAt,
      ...(staff.invited === true ? {} : { accepted_at: invitedAt }),
      ...(staff.branch === undefined ? {} : { branch_id: must(org.branchIds.get(staff.branch), `branch ${staff.branch}`) }),
    });
    ok(membership.error, `membership ${who.email}`);
  }

  log.info(`${spec.staff.length} staff, plan ${spec.plan}, org ${org.id}`);
};

/** Staff scoped to the whole organisation get an assignment now; the rest after properties exist. */
export const seedOrganisationWideAssignments = async (ctx: Ctx, org: OrgCtx): Promise<void> => {
  const owner = person(org, must(org.spec.staff.find((s) => s.role === 'owner'), 'owner').handle);
  const client = await clientFor(ctx, owner);
  const rows = org.spec.staff
    .filter((s) => s.scope === 'organisation' && s.role !== 'owner')
    .map((s) => ({
      organisation_id: org.id,
      user_id: person(org, s.handle).id,
      scope_type: 'organisation' as const,
      scope_id: null,
      created_by: owner.id,
    }));
  if (rows.length === 0) return;
  const { error } = await client.from('assignments').insert(rows);
  ok(error, 'organisation-wide assignments');
};

export type { Person };
