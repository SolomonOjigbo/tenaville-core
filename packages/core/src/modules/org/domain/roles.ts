/**
 * Roles and permissions (ORG-3, ORG-4).
 *
 * Permissions are code, not database rows. The PRD data model lists a
 * `Permission` entity, and this is the deliberate deviation: a permission
 * catalogue in TypeScript is typed, reviewable in a diff, and testable without
 * a database, and a mistake in it is caught by the compiler rather than
 * discovered in production. Agency-configurable approval limits (ORG-7, R2)
 * are a different thing — those are data, and they will live in a table that
 * *narrows* what these permissions allow, never widens it.
 *
 * Row-level security answers "which organisation". This file answers "may this
 * role do this". Both are required; neither substitutes for the other.
 */

import type { AppRole } from '@tenaville/db';

export const APP_ROLES = [
  'owner',
  'admin',
  'property_manager',
  'letting_agent',
  'caretaker',
  'maintenance_coordinator',
  'accountant',
  'screening_reviewer',
  'landlord',
  'tenant',
] as const satisfies readonly AppRole[];

/**
 * Permission keys, grouped by the area that owns them. Keys are stable strings
 * because they appear in audit entries.
 */
export const PERMISSIONS = [
  // Organisation and access
  'org.update',
  'org.member.invite',
  'org.member.role.change',
  'org.member.suspend',
  'org.branch.manage',
  'org.audit.read',
  'org.billing.read',
  'org.billing.manage',
  // Recording a payment against an invoice is finance work, not plan
  // administration. An accountant may do it without being able to switch plans.
  'org.billing.payment.record',

  // Portfolio (R1 step 2)
  'property.read',
  'property.write',
  'landlord.read',
  'landlord.write',

  // Tenancy (R1 step 3)
  'lease.read',
  'lease.write',

  // Money (R1 step 4). Recording a payment and reversing one are separate
  // permissions on purpose: reversal rewrites what a tenant was told.
  'payment.read',
  'payment.record',
  'payment.reverse',
  'payment.allocation.override',
  'ledger.read',
  'ledger.write',
  'statement.read',
  'statement.issue',

  // Maintenance (R1 step 8)
  'maintenance.read',
  'maintenance.write',
  'maintenance.approve',

  // Communications and tasks (R1 step 10). Every staff role needs the queue and
  // the message log; a caretaker fixes what a message reports.
  'comms.read',

  // Documents (R1 step 11)
  'document.read',
  'document.write',

  // Own records only — what a tenant or landlord may reach about themselves.
  'self.tenancy.read',
  'self.maintenance.request',
  'self.portfolio.read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Role to permissions. Written out in full rather than derived by inheritance:
 * a reader can see exactly what a caretaker may do without tracing a hierarchy,
 * and an accidental grant cannot arrive through a parent role.
 */
const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  owner: PERMISSIONS,

  admin: PERMISSIONS.filter((p) => p !== 'org.billing.manage'),

  property_manager: [
    'property.read',
    'property.write',
    'landlord.read',
    'lease.read',
    'lease.write',
    'payment.read',
    'payment.record',
    'ledger.read',
    'statement.read',
    'maintenance.read',
    'maintenance.write',
    'comms.read',
    'document.read',
    'document.write',
  ],

  letting_agent: [
    'property.read',
    'lease.read',
    'maintenance.read',
    'comms.read',
    'document.read',
    'document.write',
  ],

  caretaker: [
    'property.read',
    'maintenance.read',
    'maintenance.write',
    'comms.read',
    'document.read',
    'document.write',
  ],

  maintenance_coordinator: [
    'property.read',
    'maintenance.read',
    'maintenance.write',
    'maintenance.approve',
    'comms.read',
    'document.read',
    'document.write',
  ],

  // An accountant reads the money and may reverse a payment, but does not
  // manage people or property records.
  accountant: [
    'property.read',
    'landlord.read',
    'lease.read',
    'payment.read',
    'payment.record',
    'payment.reverse',
    'payment.allocation.override',
    'ledger.read',
    'ledger.write',
    'statement.read',
    'statement.issue',
    'org.audit.read',
    'org.billing.read',
    'org.billing.payment.record',
    'comms.read',
    'document.read',
    'document.write',
  ],

  screening_reviewer: ['property.read', 'lease.read', 'document.read'],

  // A landlord sees their own portfolio and approves repairs above a threshold
  // (OWN-4, MAINT-8). They are not staff.
  landlord: ['self.portfolio.read', 'statement.read', 'maintenance.read', 'maintenance.approve'],

  // A tenant reaches only their own tenancy (TENANT-1).
  tenant: ['self.tenancy.read', 'self.maintenance.request'],
};

/** Roles that administer the organisation. */
export const ADMIN_ROLES = ['owner', 'admin'] as const satisfies readonly AppRole[];

/**
 * Staff roles. Landlord and tenant are members of an organisation but are not
 * staff — the distinction matters in policies and in the UI.
 */
export const STAFF_ROLES = [
  'owner',
  'admin',
  'property_manager',
  'letting_agent',
  'caretaker',
  'maintenance_coordinator',
  'accountant',
  'screening_reviewer',
] as const satisfies readonly AppRole[];

export const permissionsFor = (role: AppRole): readonly Permission[] => ROLE_PERMISSIONS[role];

export const can = (role: AppRole, permission: Permission): boolean =>
  ROLE_PERMISSIONS[role].includes(permission);

export const isStaff = (role: AppRole): boolean =>
  (STAFF_ROLES as readonly AppRole[]).includes(role);

export const isAdmin = (role: AppRole): boolean =>
  (ADMIN_ROLES as readonly AppRole[]).includes(role);

/**
 * Whether `actor` may assign `target` to somebody else.
 *
 * Only an owner creates another owner. Without this an admin could promote
 * themselves — the case asserted in supabase/tests/0020_organisation_isolation_test.sql.
 */
export const canAssignRole = (actor: AppRole, target: AppRole): boolean => {
  if (actor === 'owner') return true;
  if (actor === 'admin') return target !== 'owner';
  return false;
};
