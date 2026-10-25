import { describe, expect, it } from 'vitest';

import {
  ADMIN_ROLES,
  APP_ROLES,
  PERMISSIONS,
  STAFF_ROLES,
  can,
  canAssignRole,
  isAdmin,
  isStaff,
  permissionsFor,
} from '../domain/roles';
import type { AppRole } from '@tenaville/db';

describe('role catalogue', () => {
  it('covers every database role', () => {
    // If a role is added to the enum without a permission list, every call for
    // it would silently return undefined. This is the guard against that.
    for (const role of APP_ROLES) {
      expect(permissionsFor(role), `no permissions defined for ${role}`).toBeDefined();
    }
  });

  it('grants the owner everything', () => {
    expect(permissionsFor('owner')).toHaveLength(PERMISSIONS.length);
  });

  it('withholds billing management from admins', () => {
    // An admin runs the agency day to day; only the owner changes what the
    // agency pays.
    expect(can('admin', 'org.billing.manage')).toBe(false);
    expect(can('owner', 'org.billing.manage')).toBe(true);
    expect(can('admin', 'org.billing.read')).toBe(true);
  });

  it('separates recording a payment from reversing one', () => {
    // A reversal rewrites what a tenant was told they owed, so it is a
    // different authority from taking money in (RENT-4, §10.2).
    expect(can('property_manager', 'payment.record')).toBe(true);
    expect(can('property_manager', 'payment.reverse')).toBe(false);
    expect(can('accountant', 'payment.reverse')).toBe(true);
  });

  it('keeps landlords and tenants out of staff permissions', () => {
    for (const role of ['landlord', 'tenant'] satisfies AppRole[]) {
      expect(isStaff(role), `${role} must not be staff`).toBe(false);
      expect(can(role, 'lease.write')).toBe(false);
      expect(can(role, 'payment.record')).toBe(false);
      expect(can(role, 'org.audit.read')).toBe(false);
    }
  });

  it('limits a tenant to their own records', () => {
    expect(permissionsFor('tenant')).toEqual(['self.tenancy.read', 'self.maintenance.request']);
  });

  it('treats every staff role as staff and no others', () => {
    for (const role of STAFF_ROLES) expect(isStaff(role)).toBe(true);
    expect(STAFF_ROLES).not.toContain('landlord');
    expect(STAFF_ROLES).not.toContain('tenant');
  });

  it('recognises admin roles', () => {
    for (const role of ADMIN_ROLES) expect(isAdmin(role)).toBe(true);
    expect(isAdmin('property_manager')).toBe(false);
  });

  it('only lets an owner create another owner', () => {
    expect(canAssignRole('owner', 'owner')).toBe(true);
    expect(canAssignRole('admin', 'owner')).toBe(false);
    expect(canAssignRole('admin', 'property_manager')).toBe(true);
    // Everyone else may not assign roles at all.
    for (const role of APP_ROLES.filter((r) => r !== 'owner' && r !== 'admin')) {
      expect(canAssignRole(role, 'caretaker'), `${role} must not assign roles`).toBe(false);
    }
  });

  it('has no duplicate permission keys', () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
  });
});
