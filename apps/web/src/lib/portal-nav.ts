import type { AppRole } from '@tenaville/db';

import type { NavGroup } from './nav';

/**
 * Where each role belongs when they sign in or follow a link into the wrong
 * shell. Staff keep the console; the two portal roles have their own homes.
 */
export const homeForRole = (role: AppRole): string => {
  if (role === 'landlord') return '/portfolio';
  if (role === 'tenant') return '/tenancy';
  return '/dashboard';
};

export const landlordNav: readonly NavGroup[] = [
  {
    group: 'portfolio',
    label: 'Your account',
    items: [
      {
        href: '/portfolio',
        label: 'Portfolio',
        permission: 'self.portfolio.read',
        group: 'portfolio',
      },
      {
        href: '/portfolio/statements',
        label: 'Statements',
        permission: 'statement.read',
        group: 'portfolio',
      },
      {
        href: '/portfolio/maintenance',
        label: 'Repairs',
        permission: 'maintenance.read',
        group: 'portfolio',
      },
    ],
  },
];

export const tenantNav: readonly NavGroup[] = [
  {
    group: 'portfolio',
    label: 'Your tenancy',
    items: [
      {
        href: '/tenancy',
        label: 'Tenancy',
        permission: 'self.tenancy.read',
        group: 'portfolio',
      },
      {
        href: '/tenancy/payments',
        label: 'Payments and receipts',
        permission: 'self.tenancy.read',
        group: 'portfolio',
      },
      {
        href: '/tenancy/maintenance',
        label: 'Maintenance',
        permission: 'self.maintenance.request',
        group: 'portfolio',
      },
    ],
  },
];
