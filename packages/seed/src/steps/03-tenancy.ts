import {
  activateLease,
  addChargeTerm,
  planChargeTerm,
  planSchedule,
} from '@tenaville/core/rent';
import {
  approveDeduction,
  createLease,
  createTenant,
  proposeDeduction,
  recordDepositReceipt,
  recordHandover,
  renewLease,
} from '@tenaville/core/leases';
import type { UserClient } from '@tenaville/db';

import {
  clientFor,
  must,
  ok,
  person,
  staffByRole,
  type ChargeDue,
  type Ctx,
  type LeaseRec,
  type OrgCtx,
  type Person,
  type TenantRec,
  type UnitRec,
} from '../context';
import { addDays, addMonths, daysBetween, termEnd } from '../lib/dates';
import { log } from '../lib/log';
import { koboString, roundNaira } from '../lib/money';
import type { Rng } from '../lib/rng';
import { slugEmail, syntheticPhone, OCCUPATIONS, EMPLOYERS } from '../world/pools';
import type { Behaviour, RentFrequency } from '../world/types';

type PlanKind = 'current' | 'expiring' | 'terminated' | 'expired' | 'draft';

interface LeasePlan {
  readonly unit: UnitRec;
  readonly kind: PlanKind;
  readonly renewal: boolean;
}

const PERIODS_PER_YEAR: Record<RentFrequency, number> = {
  annual: 1,
  half_yearly: 2,
  quarterly: 4,
  monthly: 12,
};

const chooseFrequency = (org: OrgCtx, unit: UnitRec, rng: Rng): RentFrequency => {
  if (unit.group.commercial === true) {
    return rng.weighted<RentFrequency>([['annual', 0.7], ['half_yearly', 0.3]]);
  }
  if (unit.annualRentNaira > 6_000_000) {
    return rng.weighted<RentFrequency>([['annual', 0.6], ['half_yearly', 0.25], ['quarterly', 0.15]]);
  }
  const picked = rng.weighted<RentFrequency>([...org.spec.tuning.frequencyMix]);
  // Monthly rent on a large annual figure is not how Lagos lets.
  return picked === 'monthly' && unit.annualRentNaira > 3_000_000 ? 'quarterly' : picked;
};

const chooseBehaviour = (org: OrgCtx, unit: UnitRec, kind: PlanKind, rng: Rng): Behaviour => {
  if (kind === 'expired' || kind === 'terminated') return rng.weighted<Behaviour>([['prompt', 0.5], ['usual', 0.5]]);
  if (unit.group.commercial === true) {
    return rng.weighted<Behaviour>([['prompt', 0.5], ['usual', 0.3], ['slow', 0.15], ['partial', 0.05]]);
  }
  return rng.weighted<Behaviour>([...org.spec.tuning.behaviour]);
};

const actorFor = (org: OrgCtx, unit: UnitRec): Person => {
  const manager = org.spec.staff.find(
    (s) => s.role === 'property_manager' && s.scope !== 'organisation' && 'properties' in s.scope && s.scope.properties.includes(unit.property.key),
  );
  const handle = manager?.handle ?? org.spec.staff.find((s) => s.role === 'property_manager')?.handle ?? org.spec.staff.find((s) => s.role === 'owner')!.handle;
  return person(org, handle);
};

const scheduleDues = (rows: ReadonlyArray<{ dueOn: string; amountKobo: bigint }>, label: string): ChargeDue[] =>
  rows.map((r) => ({ dueOn: r.dueOn, amountKobo: r.amountKobo, label }));

export const seedTenancy = async (ctx: Ctx, org: OrgCtx): Promise<void> => {
  const { spec } = org;
  const { tuning } = spec;
  const rng = org.rng.fork('tenancy');
  log.step(`${spec.name}: tenants and leases`);

  const owner = person(org, spec.staff.find((s) => s.role === 'owner')!.handle);
  const ownerClient = await clientFor(ctx, owner);
  const approver = staffByRole(org, 'admin')[0] ?? owner;
  const approverClient = await clientFor(ctx, approver);

  // ---- Partition the units ---------------------------------------------------
  const shuffled = rng.shuffle(org.units);
  const reserved = shuffled.splice(0, tuning.reservedUnits);
  const underMaintenance = shuffled.splice(0, tuning.underMaintenanceUnits);
  const occupiedCount = Math.min(
    shuffled.length - (tuning.terminatedLeases + tuning.expiredLeases + tuning.draftLeases),
    Math.round(org.units.length * tuning.occupancy),
  );
  const occupied = shuffled.splice(0, occupiedCount);
  const terminated = shuffled.splice(0, tuning.terminatedLeases);
  const expired = shuffled.splice(0, tuning.expiredLeases);
  const drafts = shuffled.splice(0, tuning.draftLeases);

  for (const [units, status] of [[reserved, 'reserved'], [underMaintenance, 'under_maintenance']] as const) {
    for (const unit of units) {
      const { error } = await ownerClient.from('units').update({ status }).eq('id', unit.id);
      ok(error, `unit ${unit.label} -> ${status}`);
      unit.status = status;
    }
  }

  const plans: LeasePlan[] = [
    ...occupied.map((unit, index): LeasePlan => ({
      unit,
      kind: index < tuning.expiringSoon ? 'expiring' : 'current',
      renewal: rng.chance(tuning.renewalShare),
    })),
    ...terminated.map((unit): LeasePlan => ({ unit, kind: 'terminated', renewal: false })),
    ...expired.map((unit): LeasePlan => ({ unit, kind: 'expired', renewal: false })),
    ...drafts.map((unit): LeasePlan => ({ unit, kind: 'draft', renewal: false })),
  ];

  // ---- Build each tenancy ----------------------------------------------------
  let done = 0;
  for (const plan of plans) {
    const client = await clientFor(ctx, actorFor(org, plan.unit));
    await buildTenancy({ ctx, org, plan, client, ownerClient, approverClient, approver, rng });
    done += 1;
    log.progress('tenancies', done, plans.length);
  }

  // ---- Tenant portal logins for a handful of active tenants --------------------
  await seedTenantLogins(ctx, org, ownerClient, owner, rng);

  org.stats.units = org.units.length;
  org.stats.tenants = org.tenants.length;
  org.stats.leases = org.leases.length;
  org.stats.activeLeases = org.leases.filter((l) => l.status === 'active').length;
};

interface BuildArgs {
  ctx: Ctx;
  org: OrgCtx;
  plan: LeasePlan;
  client: UserClient;
  ownerClient: UserClient;
  approverClient: UserClient;
  approver: Person;
  rng: Rng;
}

const buildTenancy = async (a: BuildArgs): Promise<void> => {
  const { ctx, org, plan, client, rng } = a;
  const { unit } = plan;
  const frequency = chooseFrequency(org, unit, rng);
  const commercial = unit.group.commercial === true;
  const months = commercial && rng.chance(0.25) ? 24 : 12;
  const periods = PERIODS_PER_YEAR[frequency];
  const currentRent = roundNaira(unit.annualRentNaira / periods, 500);
  const behaviour = chooseBehaviour(org, unit, plan.kind, rng);

  // Dates for the lease that is live (or was last live) today.
  let start: string;
  let end: string;
  switch (plan.kind) {
    case 'current':
      start = addDays(ctx.today, -rng.int(10, months === 24 ? 630 : 270));
      end = termEnd(start, months);
      break;
    case 'expiring':
      end = addDays(ctx.today, rng.int(6, 85));
      start = addMonths(addDays(end, 1), -months);
      break;
    case 'terminated':
      start = addDays(ctx.today, -rng.int(140, 300));
      end = termEnd(start, 12);
      break;
    case 'expired':
      end = addDays(ctx.today, -rng.int(15, 80));
      start = addMonths(addDays(end, 1), -12);
      break;
    case 'draft':
      start = addDays(ctx.today, rng.int(7, 45));
      end = termEnd(start, 12);
      break;
  }

  const tenant = await makeTenant(ctx, org, client, commercial, rng);
  const depositNaira = roundNaira(unit.annualRentNaira * (commercial ? 0.2 : 0.1), 5_000);
  const custodian = org.spec.type === 'individual_landlord' ? 'landlord' : 'agency';

  const add = async (
    leaseStart: string,
    leaseEnd: string,
    rentNaira: number,
    status: LeaseRec['status'],
    leaseBehaviour: Behaviour,
  ): Promise<LeaseRec> => {
    const { leaseId } = await createLease(client, {
      organisationId: org.id,
      unitId: unit.id,
      tenantId: tenant.id,
      reference: `${org.spec.receiptPrefix}-L${String(org.leases.length + 1).padStart(4, '0')}`,
      startsOn: leaseStart,
      endsOn: leaseEnd,
      rentKobo: koboString(rentNaira),
      rentFrequency: frequency,
      depositKobo: koboString(depositNaira),
      depositCustodian: custodian,
    });
    return activate(leaseId, leaseStart, leaseEnd, rentNaira, status, leaseBehaviour);
  };

  const activate = async (
    leaseId: string,
    leaseStart: string,
    leaseEnd: string,
    rentNaira: number,
    status: LeaseRec['status'],
    leaseBehaviour: Behaviour,
  ): Promise<LeaseRec> => {
    const input = {
      leaseId,
      rentFrequency: frequency,
      startsOn: leaseStart,
      endsOn: leaseEnd,
      rentKobo: koboString(rentNaira),
      partPeriod: 'charge_in_full',
    } as const;
    const rows = planSchedule(input);
    await activateLease(client, input);
    const dues = scheduleDues(rows, 'Rent');

    // An estate service charge, agreed alongside the rent.
    if (unit.property.serviceChargeNaira !== undefined) {
      const term = {
        leaseId,
        kind: 'service_charge',
        description: 'Estate service charge',
        amountKobo: koboString(unit.property.serviceChargeNaira),
        frequency: 'annual',
        startsOn: leaseStart,
        endsOn: leaseEnd,
        partPeriod: 'charge_in_full',
      } as const;
      const charges = planChargeTerm(term);
      await addChargeTerm(client, term);
      dues.push(...scheduleDues(charges, 'Service charge'));
    }

    const lease: LeaseRec = {
      id: leaseId, unit, tenant, start: leaseStart, end: leaseEnd, frequency,
      rentNaira, behaviour: leaseBehaviour, charges: dues, status, cutoff: null,
    };
    org.leases.push(lease);
    return lease;
  };

  const receiveDeposit = async (leaseId: string, receivedOn: string): Promise<string> => {
    const { data, error } = await client.from('lease_deposits').select('id').eq('lease_id', leaseId).single();
    ok(error, 'deposit lookup');
    const depositId = must(data, 'deposit').id;
    await recordDepositReceipt(client, { depositId, receivedOn });
    return depositId;
  };

  const moveIn = async (leaseId: string, on: string): Promise<void> => {
    if (daysBetween(on, ctx.today) > 150 || on > ctx.today) return;
    await recordHandover(client, {
      organisationId: org.id,
      leaseId,
      kind: 'move_in',
      happenedOn: on,
      notes: 'Keys handed over. Walls and fittings inspected with tenant; no defects noted.',
      meterReadings: { electricity: String(rng.int(1200, 9800)), water: String(rng.int(40, 900)) },
      keysReturned: false,
      evidencePaths: [],
    });
  };

  if (plan.kind === 'draft') {
    const { leaseId } = await createLease(client, {
      organisationId: org.id,
      unitId: unit.id,
      tenantId: tenant.id,
      reference: `${org.spec.receiptPrefix}-L${String(org.leases.length + 1).padStart(4, '0')}`,
      startsOn: start,
      endsOn: end,
      rentKobo: koboString(currentRent),
      rentFrequency: frequency,
      depositKobo: koboString(depositNaira),
      depositCustodian: custodian,
    });
    org.leases.push({
      id: leaseId, unit, tenant, start, end, frequency, rentNaira: currentRent,
      behaviour, charges: [], status: 'draft', cutoff: null,
    });
    return;
  }

  if (plan.renewal && (plan.kind === 'current' || plan.kind === 'expiring')) {
    // An earlier tenancy on the same terms (a year's rent ago), then a renewal at a modest increase.
    const oldStart = addMonths(start, -12);
    const oldEnd = addDays(start, -1);
    const oldRent = roundNaira(currentRent / 1.1, 500);
    const old = await add(oldStart, oldEnd, oldRent, 'renewed', rng.weighted<Behaviour>([['prompt', 0.6], ['usual', 0.4]]));
    await receiveDeposit(old.id, oldStart);

    const { renewalLeaseId } = await renewLease(client, {
      leaseId: old.id,
      endsOn: end,
      rentKobo: koboString(currentRent),
      carryDeposit: true,
    });
    const renewed = await activate(renewalLeaseId, start, end, currentRent, 'active', behaviour);
    await moveIn(renewed.id, start);
    unit.status = 'occupied';
    return;
  }

  const lease = await add(start, end, currentRent, 'active', behaviour);
  const depositId = await receiveDeposit(lease.id, start);

  if (plan.kind === 'current' || plan.kind === 'expiring') {
    await moveIn(lease.id, start);
    unit.status = 'occupied';
    return;
  }

  if (plan.kind === 'expired') {
    const { error } = await client.from('leases').update({ status: 'expired' }).eq('id', lease.id);
    ok(error, 'expire lease');
    lease.status = 'expired';
    return;
  }

  // terminated early, with a move-out and a deposit settlement.
  const terminatedOn = addDays(ctx.today, -rng.int(15, 50));
  const { error } = await client
    .from('leases')
    .update({
      status: 'terminated',
      terminated_on: terminatedOn,
      termination_reason: rng.pick([
        'Tenant relocated for work',
        'Mutual agreement to end the tenancy early',
        'Tenant moved to own property',
      ]),
    })
    .eq('id', lease.id);
  ok(error, 'terminate lease');
  lease.status = 'terminated';
  lease.cutoff = terminatedOn;

  await recordHandover(client, {
    organisationId: org.id,
    leaseId: lease.id,
    kind: 'move_out',
    happenedOn: terminatedOn,
    notes: 'Move-out inspection completed with tenant present.',
    meterReadings: { electricity: String(rng.int(9800, 15000)) },
    keysReturned: true,
    evidencePaths: [],
  });

  const dispute = rng.chance(0.6);
  if (dispute) {
    const deduction = roundNaira(depositNaira * (0.2 + rng.next() * 0.25), 1_000);
    const { deductionId } = await proposeDeduction(client, {
      organisationId: org.id,
      depositId,
      amountKobo: koboString(deduction),
      reason: rng.pick([
        'Repainting of living room and two bedrooms beyond fair wear and tear',
        'Replacement of cracked bathroom basin and broken wardrobe door',
        'Unpaid prepaid-meter electricity token consumed before handover',
      ]),
      evidencePaths: [],
    });
    await approveDeduction(a.approverClient, deductionId, a.approver.id);
  }
  const settle = await client
    .from('lease_deposits')
    .update({ status: dispute ? 'partially_refunded' : 'refunded', settled_on: addDays(terminatedOn, 7) })
    .eq('id', depositId);
  ok(settle.error, 'settle deposit');
};

const makeTenant = async (
  ctx: Ctx,
  org: OrgCtx,
  client: UserClient,
  commercial: boolean,
  rng: Rng,
): Promise<TenantRec> => {
  ctx.phoneSerial += 1;
  const isCompany = commercial && rng.chance(0.8);
  const name = isCompany ? ctx.names.company() : ctx.names.person().full;
  const email = rng.chance(0.7)
    ? `${slugEmail(name)}@${isCompany ? 'business' : 'mail'}.example.com`
    : undefined;

  const { tenantId } = await createTenant(client, {
    organisationId: org.id,
    kind: isCompany ? 'organisation' : 'individual',
    displayName: name,
    phone: syntheticPhone(ctx.phoneSerial),
    preferredChannel: rng.weighted<'phone' | 'sms' | 'whatsapp' | 'email'>([
      ['whatsapp', 0.6], ['sms', 0.2], ['phone', 0.1], ['email', 0.1],
    ]),
    ...(email === undefined ? {} : { email }),
    ...(isCompany
      ? { businessRegistration: `RC${rng.int(100_000, 999_999)}` }
      : { occupation: rng.pick(OCCUPATIONS), employerName: rng.pick(EMPLOYERS) }),
  });

  // Next of kin or an emergency contact for most individuals.
  if (!isCompany && rng.chance(0.7)) {
    ctx.phoneSerial += 1;
    const kin = ctx.names.person();
    const contact = await client.from('tenant_contacts').insert({
      organisation_id: org.id,
      tenant_id: tenantId,
      kind: rng.pick(['next_of_kin', 'emergency'] as const),
      name: kin.full,
      relationship: rng.pick(['Spouse', 'Sibling', 'Parent', 'Friend']),
      phone: syntheticPhone(ctx.phoneSerial),
    });
    ok(contact.error, 'tenant contact');
  }

  const record: TenantRec = { id: tenantId, name, kind: isCompany ? 'organisation' : 'individual', email };
  org.tenants.push(record);
  return record;
};

const seedTenantLogins = async (
  ctx: Ctx,
  org: OrgCtx,
  ownerClient: UserClient,
  owner: Person,
  rng: Rng,
): Promise<void> => {
  const candidates = org.leases.filter(
    (l) => l.status === 'active' && l.tenant.kind === 'individual' && l.unit.group.commercial !== true,
  );
  const chosen = rng.shuffle(candidates).slice(0, org.spec.tuning.tenantPortalLogins);

  let n = 0;
  for (const lease of chosen) {
    n += 1;
    const email = `tenant${n}@${org.spec.key}.${ctx.env.emailDomain}`;
    const id = await ctx.identity.createUser({ email, fullName: lease.tenant.name });
    const profile = await ctx.admin.from('users').upsert({ id, email, full_name: lease.tenant.name });
    ok(profile.error, `profile ${email}`);

    const when = new Date().toISOString();
    const membership = await ownerClient.from('memberships').insert({
      organisation_id: org.id, user_id: id, role: 'tenant', status: 'active',
      invited_by: owner.id, invited_at: when, accepted_at: when,
    });
    ok(membership.error, `tenant membership ${email}`);
    const link = await ownerClient.from('tenants').update({ user_id: id }).eq('id', lease.tenant.id);
    ok(link.error, `link tenant login ${email}`);

    lease.tenant.userId = id;
    org.people.set(`tenant${n}`, { id, email, name: lease.tenant.name, handle: `tenant${n}`, role: 'tenant' });
  }
  log.info(`${chosen.length} tenant portal logins`);
};
