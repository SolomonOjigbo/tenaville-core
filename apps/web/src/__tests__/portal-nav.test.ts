import { describe, expect, it } from 'vitest';

import { homeForRole, landlordNav, tenantNav } from '../lib/portal-nav';

describe('homeForRole', () => {
  it('sends each role to its own shell', () => {
    expect(homeForRole('landlord')).toBe('/portfolio');
    expect(homeForRole('tenant')).toBe('/tenancy');
    expect(homeForRole('owner')).toBe('/dashboard');
    expect(homeForRole('accountant')).toBe('/dashboard');
  });
});

describe('portal navigation', () => {
  it('offers a landlord only their portfolio and statements', () => {
    expect(landlordNav.flatMap((group) => group.items.map((item) => item.href))).toEqual([
      '/portfolio',
      '/portfolio/statements',
    ]);
  });

  it('offers a tenant their tenancy and payments', () => {
    expect(tenantNav.flatMap((group) => group.items.map((item) => item.href))).toEqual([
      '/tenancy',
      '/tenancy/payments',
    ]);
  });
});
