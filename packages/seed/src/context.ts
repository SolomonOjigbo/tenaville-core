import type { AdminClient, UserClient } from '@tenaville/db';

import { actAs, type Identity } from './identity';
import type { SeedEnv } from './env';
import type { Rng } from './lib/rng';
import type { NameFactory } from './world/pools';
import type { AppRole, OrgSpec, PropertySpec, RentFrequency, UnitGroup, Behaviour } from './world/types';

export interface Person {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly handle: string;
  readonly role: AppRole;
}

export interface UnitRec {
  readonly id: string;
  readonly property: PropertySpec;
  readonly propertyId: string;
  readonly label: string;
  readonly group: UnitGroup;
  readonly annualRentNaira: number;
  status: 'vacant' | 'occupied' | 'reserved' | 'under_maintenance';
}

export interface TenantRec {
  readonly id: string;
  readonly name: string;
  readonly kind: 'individual' | 'organisation';
  readonly email: string | undefined;
  userId?: string;
}

export interface ChargeDue {
  readonly dueOn: string;
  readonly amountKobo: bigint;
  readonly label: string;
}

export interface LeaseRec {
  readonly id: string;
  readonly unit: UnitRec;
  readonly tenant: TenantRec;
  readonly start: string;
  readonly end: string;
  readonly frequency: RentFrequency;
  readonly rentNaira: number;
  readonly behaviour: Behaviour;
  readonly charges: readonly ChargeDue[];
  /** 'history' leases are superseded or ended; they still take payments for the past. */
  status: 'active' | 'renewed' | 'expired' | 'terminated' | 'draft';
  /** Payments stop being due after this date (early termination). */
  cutoff: string | null;
}

export interface PaymentRec {
  readonly id: string;
  readonly receiptNumber: string;
  readonly lease: LeaseRec;
  readonly amountKobo: bigint;
  readonly method: string;
  readonly paidOn: string;
}

export interface OrgCtx {
  readonly spec: OrgSpec;
  readonly rng: Rng;
  id: string;
  readonly people: Map<string, Person>;
  readonly branchIds: Map<string, string>;
  readonly landlordIds: Map<string, string>;
  readonly landlordUserIds: Map<string, string>;
  readonly propertyIds: Map<string, string>;
  readonly units: UnitRec[];
  readonly tenants: TenantRec[];
  readonly leases: LeaseRec[];
  readonly payments: PaymentRec[];
  readonly vendorIds: string[];
  readonly stats: Record<string, number>;
}

export interface Ctx {
  readonly env: SeedEnv;
  readonly identity: Identity;
  readonly admin: AdminClient;
  readonly today: string;
  readonly rng: Rng;
  readonly names: NameFactory;
  readonly orgs: OrgCtx[];
  /** Counter for synthetic phone numbers, unique across the whole run. */
  phoneSerial: number;
}

export const person = (org: OrgCtx, handle: string): Person => {
  const found = org.people.get(handle);
  if (found === undefined) throw new Error(`${org.spec.key}: no staff member '${handle}'`);
  return found;
};

export const clientFor = (ctx: Ctx, who: Person): Promise<UserClient> =>
  actAs(ctx.identity, who.id, who.email);

export const staffByRole = (org: OrgCtx, role: AppRole): Person[] =>
  [...org.people.values()].filter((p) => p.role === role);

export const must = <T>(value: T | null | undefined, what: string): T => {
  if (value === null || value === undefined) throw new Error(`missing ${what}`);
  return value;
};

/** Throw a readable error from a Supabase `{ error }` result. */
export const ok = (error: { message: string } | null, what: string): void => {
  if (error !== null) throw new Error(`${what}: ${error.message}`);
};
