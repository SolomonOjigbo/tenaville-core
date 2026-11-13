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
  it('offers a landlord their portfolio, statements, repairs and documents', () => {
    expect(landlordNav.flatMap((group) => group.items.map((item) => item.href))).toEqual([
      '/portfolio',
      '/portfolio/statements',
      '/portfolio/maintenance',
      '/portfolio/documents',
    ]);
  });

  it('offers a tenant their tenancy, payments, maintenance, messages and documents', () => {
    expect(tenantNav.flatMap((group) => group.items.map((item) => item.href))).toEqual([
      '/tenancy',
      '/tenancy/payments',
      '/tenancy/maintenance',
      '/tenancy/messages',
      '/tenancy/documents',
    ]);
  });
});
