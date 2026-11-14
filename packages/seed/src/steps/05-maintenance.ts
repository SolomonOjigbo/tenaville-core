import type { UserClient } from '@tenaville/db';

import {
  clientFor,
  must,
  ok,
  person,
  staffByRole,
  type Ctx,
  type LeaseRec,
  type OrgCtx,
  type Person,
} from '../context';
import { addDays } from '../lib/dates';
import { log } from '../lib/log';
import { koboNumber, roundNaira } from '../lib/money';
import type { Rng } from '../lib/rng';
import { syntheticPhone } from '../world/pools';

type Category =
  | 'plumbing' | 'electrical' | 'structural' | 'appliance' | 'hvac' | 'pest' | 'cleaning' | 'security';

interface Template {
  readonly category: Category;
  readonly description: string;
  readonly cost: readonly [number, number];
  readonly urgency?: 'low' | 'normal' | 'high' | 'emergency';
  readonly safety?: boolean;
}

const TEMPLATES: readonly Template[] = [
  { category: 'plumbing', description: 'Kitchen sink leaks under the cabinet and the floor is wet.', cost: [8_000, 35_000], urgency: 'high' },
  { category: 'plumbing', description: 'Very low water pressure in the shower; the pump seems to be failing.', cost: [20_000, 60_000] },
  { category: 'plumbing', description: 'Toilet cistern keeps running and will not stop filling.', cost: [6_000, 20_000] },
  { category: 'electrical', description: 'Sockets in the living room have stopped working.', cost: [10_000, 45_000], urgency: 'high' },
  { category: 'electrical', description: 'Prepaid meter trips whenever the air conditioner comes on.', cost: [25_000, 80_000] },
  { category: 'electrical', description: 'Sparking from the corridor light switch.', cost: [15_000, 40_000], urgency: 'emergency', safety: true },
  { category: 'structural', description: 'Crack across the bedroom ceiling with a damp patch spreading.', cost: [90_000, 450_000], urgency: 'high' },
  { category: 'structural', description: 'Front door lock is jammed; the tenant cannot lock up.', cost: [12_000, 40_000], urgency: 'high' },
  { category: 'structural', description: 'Roof leak over the kitchen after heavy rain.', cost: [180_000, 650_000], urgency: 'high' },
  { category: 'appliance', description: 'Water heater is not heating.', cost: [30_000, 110_000] },
  { category: 'hvac', description: 'Air conditioner is running but not cooling the bedroom.', cost: [35_000, 140_000] },
  { category: 'pest', description: 'Cockroach infestation in the kitchen cabinets.', cost: [15_000, 40_000], urgency: 'low' },
  { category: 'cleaning', description: 'Compound drainage is blocked and smells.', cost: [10_000, 30_000], urgency: 'high' },
  { category: 'security', description: 'Estate gate motor is not working; the gate must be opened by hand.', cost: [60_000, 260_000], urgency: 'high' },
];

const VENDOR_POOL = [
  { name: 'Adewale & Sons Plumbing', trade: 'Plumbing' },
  { name: 'Spark Line Electricals', trade: 'Electrical' },
  { name: 'Solid Rock Builders', trade: 'Building and structural' },
  { name: 'CoolAir Services', trade: 'HVAC' },
  { name: 'Clearway Pest Control', trade: 'Pest control' },
  { name: 'Brightside Cleaning Co.', trade: 'Cleaning' },
  { name: 'Gatekeepers Security Systems', trade: 'Security' },
  { name: 'Fixit Appliance Repairs', trade: 'Appliances' },
  { name: 'Palmview Roofing', trade: 'Roofing' },
  { name: 'Handy Hands Maintenance', trade: 'General maintenance' },
] as const;

type Outcome =
  | 'closed' | 'completed' | 'in_progress' | 'assigned' | 'acknowledged'
  | 'submitted' | 'awaiting_approval' | 'rejected_cost' | 'rejected_request';

const outcomePlan = (count: number, rng: Rng): Outcome[] => {
  // Guarantee the states a walkthrough needs to show, then fill by weight.
  const required: Outcome[] =
    count >= 8 ? ['awaiting_approval', 'rejected_cost', 'rejected_request', 'closed', 'in_progress'] : ['closed', 'in_progress'];
  const rest = count - required.length;
  const filler = Array.from({ length: Math.max(0, rest) }, () =>
    rng.weighted<Outcome>([
      ['closed', 0.34], ['completed', 0.1], ['in_progress', 0.16], ['assigned', 0.12],
      ['acknowledged', 0.08], ['submitted', 0.12], ['awaiting_approval', 0.04], ['rejected_request', 0.04],
    ]),
  );
  return rng.shuffle([...required, ...filler]).slice(0, count);
};

export const seedMaintenance = async (ctx: Ctx, org: OrgCtx): Promise<void> => {
  const { spec } = org;
  const rng = org.rng.fork('maintenance');
  log.step(`${spec.name}: vendors and maintenance requests`);

  const owner = person(org, spec.staff.find((s) => s.role === 'owner')!.handle);
  const ownerClient = await clientFor(ctx, owner);

  // ---- Vendors ----------------------------------------------------------------
  const areas = [...new Set(spec.properties.map((p) => p.area))];
  for (const vendor of VENDOR_POOL.slice(0, spec.tuning.vendors)) {
    ctx.phoneSerial += 1;
    const { data, error } = await ownerClient
      .from('vendors')
      .insert({
        organisation_id: org.id,
        name: vendor.name,
        trade: vendor.trade,
        contact_name: ctx.names.person().full,
        phone: syntheticPhone(ctx.phoneSerial),
        service_areas: areas,
        availability_notes: rng.pick(['Weekdays 8am–5pm', 'Any day, short notice', 'Mon–Sat, emergencies after hours']),
        status: 'active',
        created_by: owner.id,
      })
      .select('id')
      .single();
    ok(error, `vendor ${vendor.name}`);
    org.vendorIds.push(must(data, 'vendor').id);
  }

  // ---- Requests -----------------------------------------------------------------
  const active = org.leases.filter((l) => l.status === 'active');
  const withLogin = rng.shuffle(active.filter((l) => l.tenant.userId !== undefined));
  const without = rng.shuffle(active.filter((l) => l.tenant.userId === undefined));
  const outcomes = outcomePlan(spec.tuning.maintenanceRequests, rng);

  const coordinator = staffByRole(org, 'maintenance_coordinator')[0];
  let made = 0;
  for (const [index, outcome] of outcomes.entries()) {
    // Early requests come from tenants with portal logins, where there are any.
    // Repairs awaiting approval land on a landlord who has a portal login, so the demo can
    // show the landlord approving from their own account.
    const approvable = active.filter((l) => org.landlordUserIds.has(l.unit.property.landlord));
    const lease =
      outcome === 'awaiting_approval' && approvable.length > 0
        ? approvable[index % approvable.length]!
        : withLogin.length > 0 && index % 2 === 0
          ? withLogin[index % withLogin.length]!
          : without[index % Math.max(1, without.length)] ?? active[index % active.length]!;
    await runRequest(ctx, org, lease, outcome, rng, coordinator, owner, ownerClient);
    made += 1;
    log.progress('maintenance requests', made, outcomes.length);
  }
  org.stats.maintenanceRequests = made;
};

const pickStaffSubmitter = (org: OrgCtx, lease: LeaseRec): Person => {
  const reach = (handle: string): boolean => {
    const s = org.spec.staff.find((x) => x.handle === handle);
    return s !== undefined && s.scope !== 'organisation' && 'properties' in s.scope && s.scope.properties.includes(lease.unit.property.key);
  };
  const caretaker = org.spec.staff.find((s) => s.role === 'caretaker' && reach(s.handle));
  const manager = org.spec.staff.find((s) => s.role === 'property_manager' && (s.scope === 'organisation' || reach(s.handle)));
  const handle = (caretaker ?? manager ?? org.spec.staff.find((s) => s.role === 'owner')!).handle;
  return person(org, handle);
};

const runRequest = async (
  ctx: Ctx,
  org: OrgCtx,
  lease: LeaseRec,
  outcome: Outcome,
  rng: Rng,
  coordinator: Person | undefined,
  owner: Person,
  ownerClient: UserClient,
): Promise<void> => {
  const template = rng.pick(TEMPLATES);
  const tenantPerson = lease.tenant.userId !== undefined
    ? [...org.people.values()].find((p) => p.id === lease.tenant.userId)
    : undefined;
  const submitter = tenantPerson !== undefined && rng.chance(0.75) ? tenantPerson : pickStaffSubmitter(org, lease);
  const submitterClient = await clientFor(ctx, submitter);

  const created = await submitterClient.rpc('create_maintenance_request', {
    p_property_id: lease.unit.propertyId,
    p_unit_id: lease.unit.id,
    p_lease_id: lease.id,
    p_category: template.category,
    p_description: template.description,
    p_urgency: template.urgency ?? 'normal',
    p_is_safety_issue: template.safety === true,
    p_preferred_access_times: rng.pick(['Weekday mornings', 'After 5pm on weekdays', 'Saturdays', 'Anytime; caretaker holds a key']),
  });
  ok(created.error, `create_maintenance_request (${lease.unit.label})`);
  const requestId = must(created.data, 'request id');

  // Who works the request: the coordinator where there is one, otherwise the property's manager.
  const handler = coordinator ?? pickStaffSubmitter(org, lease);
  const handlerClient = await clientFor(ctx, handler.role === 'owner' ? owner : handler);
  const move = async (status: string, note?: string): Promise<void> => {
    const { error } = await handlerClient.rpc('transition_maintenance_request', {
      p_request_id: requestId,
      p_status: status as never,
      ...(note === undefined ? {} : { p_note: note }),
    });
    ok(error, `transition → ${status}`);
  };

  if (outcome === 'submitted') return;

  if (outcome === 'rejected_request') {
    await move('rejected', 'Reviewed with the tenant: this is a tenant-side fitting, not a building fault.');
    return;
  }

  await move('acknowledged');
  if (outcome === 'acknowledged') return;

  const vendorId = org.vendorIds.length > 0 && rng.chance(0.75) ? rng.pick(org.vendorIds) : null;
  const caretaker = org.spec.staff.find((s) => s.role === 'caretaker');
  const assign = await handlerClient.rpc('assign_maintenance_request', {
    p_request_id: requestId,
    p_priority: template.urgency === 'emergency' ? 'urgent' : template.urgency === 'high' ? 'high' : 'normal',
    p_due_on: addDays(ctx.today, rng.int(2, 10)),
    p_coordinator_user_id: handler.id,
    ...(vendorId === null ? {} : { p_vendor_id: vendorId }),
    ...(vendorId === null && caretaker !== undefined ? { p_assignee_user_id: person(org, caretaker.handle).id } : {}),
    p_note: vendorId === null ? 'Caretaker to attend and report back.' : 'Vendor booked; tenant informed of the visit window.',
  });
  ok(assign.error, 'assign_maintenance_request');
  if (outcome === 'assigned') return;

  await move('in_progress');
  if (outcome === 'in_progress') {
    // Mid-job: some already have a cost on the books.
    if (rng.chance(0.4)) await recordCost(handlerClient, requestId, template, org, rng, 'normal');
    return;
  }

  // A cost that needs the landlord's approval: above the organisation threshold.
  if (outcome === 'awaiting_approval' || outcome === 'rejected_cost') {
    await recordCost(handlerClient, requestId, template, org, rng, 'over_threshold');
    if (outcome === 'rejected_cost') {
      const approval = await findPendingApproval(ownerClient, requestId);
      const decider = await approverClient(ctx, org, lease, owner);
      const { error } = await decider.rpc('decide_maintenance_approval', {
        p_approval_id: approval,
        p_approved: false,
        p_comment: 'Obtain a second quote before we proceed; this looks high for the scope.',
      });
      ok(error, 'decide_maintenance_approval (reject)');
    }
    return;
  }

  // completed / closed: sometimes via an approved over-threshold cost.
  const overThreshold = rng.chance(0.2);
  await recordCost(handlerClient, requestId, template, org, rng, overThreshold ? 'over_threshold' : 'normal');
  if (overThreshold) {
    const approval = await findPendingApproval(ownerClient, requestId);
    const decider = await approverClient(ctx, org, lease, owner);
    const { error } = await decider.rpc('decide_maintenance_approval', {
      p_approval_id: approval,
      p_approved: true,
      p_comment: 'Approved. Please keep the receipts for the statement.',
    });
    ok(error, 'decide_maintenance_approval (approve)');
  }
  await move('completed', 'Work completed and tested with the tenant present; area left clean.');
  if (outcome === 'closed') await move('closed', 'Tenant satisfied; closing the request.');
};

const approverClient = async (
  ctx: Ctx,
  org: OrgCtx,
  lease: LeaseRec,
  owner: Person,
): Promise<UserClient> => {
  // The landlord approves from their portal when they have one — a headline demo moment.
  const landlordKey = lease.unit.property.landlord;
  const landlordLogin = org.people.get(`landlord.${landlordKey}`);
  return clientFor(ctx, landlordLogin ?? owner);
};

const findPendingApproval = async (client: UserClient, requestId: string): Promise<string> => {
  const { data, error } = await client
    .from('maintenance_approvals')
    .select('id')
    .eq('request_id', requestId)
    .eq('status', 'pending')
    .single();
  ok(error, 'find pending approval');
  return must(data, 'approval').id;
};

const recordCost = async (
  client: UserClient,
  requestId: string,
  template: Template,
  org: OrgCtx,
  rng: Rng,
  mode: 'normal' | 'over_threshold',
): Promise<void> => {
  const threshold = org.spec.maintenanceThresholdNaira;
  let amount: number;
  let payer: 'landlord' | 'tenant' | 'agency' | 'service_charge';
  if (mode === 'over_threshold') {
    amount = roundNaira(threshold * (1.3 + rng.next() * 2.2), 5_000);
    payer = 'landlord';
  } else {
    const [low, high] = template.cost;
    amount = Math.min(threshold, roundNaira(low + rng.next() * (high - low), 500));
    payer = rng.weighted<typeof payer>([['landlord', 0.6], ['tenant', 0.2], ['agency', 0.1], ['landlord', 0.1]]);
  }
  const { error } = await client.rpc('record_maintenance_cost', {
    p_request_id: requestId,
    p_description: `${template.category[0]!.toUpperCase()}${template.category.slice(1)} repair: labour and materials`,
    p_amount_kobo: koboNumber(amount),
    p_payer: payer,
    p_reason:
      payer === 'tenant'
        ? 'Damage traced to tenant use; charged back under the tenancy terms.'
        : payer === 'agency'
          ? 'Goodwill repair absorbed by the agency.'
          : 'Wear and tear; the landlord is responsible under the mandate.',
  });
  ok(error, 'record_maintenance_cost');
};
