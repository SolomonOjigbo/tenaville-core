/**
 * The shape of a demo organisation. Blueprints are data, not code: the steps
 * under `../steps` turn a blueprint into rows by calling the same RPCs and
 * application functions the product uses.
 */

export type AppRole =
  | 'owner'
  | 'admin'
  | 'property_manager'
  | 'letting_agent'
  | 'caretaker'
  | 'maintenance_coordinator'
  | 'accountant'
  | 'screening_reviewer'
  | 'landlord'
  | 'tenant';

export type PropertyType = 'residential' | 'commercial' | 'mixed_use' | 'estate' | 'land';

export type UnitType =
  | 'flat'
  | 'self_contained'
  | 'room'
  | 'duplex'
  | 'bungalow'
  | 'shop'
  | 'office'
  | 'warehouse'
  | 'other';

export type RemittanceSchedule =
  | 'on_receipt'
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'quarterly'
  | 'annually';

export type PlanId = 'landlord_monthly' | 'agent_monthly' | 'growth_monthly';

export type RentFrequency = 'annual' | 'half_yearly' | 'quarterly' | 'monthly';

/** Which properties a member can reach (ORG-4). Membership alone is not authority. */
export type StaffScope =
  | 'organisation'
  | { readonly properties: readonly string[] }
  | { readonly landlords: readonly string[] };

export interface StaffSpec {
  /** Stable key; also the local part of the demo login. */
  readonly handle: string;
  readonly name: string;
  readonly role: AppRole;
  readonly title: string;
  readonly scope: StaffScope;
  readonly branch?: string;
  /** A pending invitation: the person exists but has not accepted yet. */
  readonly invited?: boolean;
}

export interface MandateSpec {
  readonly type: 'percentage' | 'fixed';
  /** Basis points, 1000 = 10.00%. */
  readonly rateBps?: number;
  readonly fixedNaira?: number;
  readonly schedule: RemittanceSchedule;
}

export interface LandlordSpec {
  readonly key: string;
  readonly name: string;
  readonly isOrganisation: boolean;
  readonly state: string;
  readonly address: string;
  readonly channel: 'phone' | 'sms' | 'whatsapp' | 'email';
  /** Omit for a landlord who manages their own property (no mandate, no commission). */
  readonly mandate?: MandateSpec;
  readonly bank?: { readonly bank: string; readonly accountName: string };
  /** Give this landlord a read-only portal login. */
  readonly portalLogin?: boolean;
  /** The landlord *is* the owner login of an individual-landlord organisation. */
  readonly isOwnerUser?: boolean;
  readonly notes?: string;
}

export interface UnitGroup {
  readonly prefix: string;
  readonly count: number;
  readonly type: UnitType;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly sqm: readonly [number, number];
  /** Annual rent range in naira. Monthly leases charge one twelfth per period. */
  readonly annualRentNaira: readonly [number, number];
  readonly facilities: readonly string[];
  /** Commercial units take company tenants and annual or half-yearly rent. */
  readonly commercial?: boolean;
}

export interface PropertySpec {
  readonly key: string;
  readonly landlord: string;
  readonly name: string;
  readonly reference: string;
  readonly type: PropertyType;
  readonly address: string;
  readonly state: string;
  readonly lga: string;
  readonly area: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly branch?: string;
  readonly groups: readonly UnitGroup[];
  /** Annual service charge per occupied unit, where the property levies one. */
  readonly serviceChargeNaira?: number;
}

export interface BranchSpec {
  readonly key: string;
  readonly name: string;
  readonly receiptPrefix: string;
}

export interface Tuning {
  /** Share of units under a current lease. */
  readonly occupancy: number;
  /** Units deliberately held out of the lettable pool, by status. */
  readonly reservedUnits: number;
  readonly underMaintenanceUnits: number;
  /** Share of occupied units whose current lease is a renewal of an earlier one. */
  readonly renewalShare: number;
  /** Tenancies that ended early, leaving the unit vacant (with a deposit dispute). */
  readonly terminatedLeases: number;
  /** Tenancies that ran out and were not renewed. */
  readonly expiredLeases: number;
  /** Signed but not yet started or activated. */
  readonly draftLeases: number;
  /** Active leases ending within the next 90 days, to light up expiry alerts. */
  readonly expiringSoon: number;
  readonly frequencyMix: ReadonlyArray<readonly [RentFrequency, number]>;
  /** Payment behaviour mix for residential tenants. */
  readonly behaviour: ReadonlyArray<readonly [Behaviour, number]>;
  readonly maintenanceRequests: number;
  readonly tenantPortalLogins: number;
  readonly vendors: number;
  /** Months of subscription invoices to generate, newest last. */
  readonly invoiceMonths: number;
  readonly reversedPayments: number;
}

export type Behaviour = 'prompt' | 'usual' | 'slow' | 'partial' | 'defaulter';

export interface OrgSpec {
  readonly key: 'harbourview' | 'garki' | 'nwosu';
  readonly name: string;
  readonly type: 'agency' | 'individual_landlord';
  readonly plan: PlanId;
  readonly receiptPrefix: string;
  /** Repairs above this need a recorded approval (MAINT-8). */
  readonly maintenanceThresholdNaira: number;
  readonly branches: readonly BranchSpec[];
  readonly staff: readonly StaffSpec[];
  readonly landlords: readonly LandlordSpec[];
  readonly properties: readonly PropertySpec[];
  readonly tuning: Tuning;
  /** Narrative for the demo script; printed in the run summary. */
  readonly story: string;
}
