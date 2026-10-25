import { can, isStaff, type Permission } from '@tenaville/core/org';
import type { AppRole } from '@tenaville/db';

/**
 * The staff navigation, filtered by what a role may actually do.
 *
 * Driven by the permission catalogue rather than a hand-kept list per role, so
 * a nav item cannot grant the illusion of access: a caretaker who cannot read
 * the ledger does not see a Ledger link that then refuses them. Hiding what a
 * user cannot use is also the difference between a tool a caretaker can work
 * one-handed and a wall of dead links (PRD principle 6).
 *
 * Release gating is separate from permission: an R2 feature is hidden from
 * everyone until its flag is on, however senior they are.
 */
export interface NavItem {
  readonly href: string;
  readonly label: string;
  /** The permission a user needs before this appears. */
  readonly permission: Permission;
  /** Feature flag that must be on, for work ahead of its release. */
  readonly flag?: 'crm' | 'screening';
  /** Grouping in the sidebar. */
  readonly group: 'portfolio' | 'money' | 'operations' | 'admin';
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', permission: 'property.read', group: 'portfolio' },
  { href: '/properties', label: 'Properties', permission: 'property.read', group: 'portfolio' },
  { href: '/tenants', label: 'Tenants', permission: 'lease.read', group: 'portfolio' },
  { href: '/leases', label: 'Leases', permission: 'lease.read', group: 'portfolio' },

  { href: '/rent', label: 'Rent and arrears', permission: 'payment.read', group: 'money' },
  { href: '/ledger', label: 'Landlord ledger', permission: 'ledger.read', group: 'money' },
  { href: '/reports', label: 'Reports', permission: 'statement.read', group: 'money' },

  {
    href: '/maintenance',
    label: 'Maintenance',
    permission: 'maintenance.read',
    group: 'operations',
  },
  { href: '/crm', label: 'Leads', permission: 'lease.read', flag: 'crm', group: 'operations' },
  {
    href: '/screening',
    label: 'Screening',
    permission: 'lease.read',
    flag: 'screening',
    group: 'operations',
  },

  { href: '/settings', label: 'Settings', permission: 'org.update', group: 'admin' },
  { href: '/settings/people', label: 'People', permission: 'org.member.invite', group: 'admin' },
  { href: '/settings/audit', label: 'Audit trail', permission: 'org.audit.read', group: 'admin' },
];

export const NAV_GROUP_LABELS: Record<NavItem['group'], string> = {
  portfolio: 'Portfolio',
  money: 'Money',
  operations: 'Operations',
  admin: 'Administration',
};

export interface NavFeatureFlags {
  readonly crm: boolean;
  readonly screening: boolean;
}

export const navigationFor = (role: AppRole, flags: NavFeatureFlags): readonly NavItem[] => {
  // This is the *staff* shell. Landlords and tenants are members of the
  // organisation with much narrower visibility (ADR 0008) and have their own
  // portals; they must not be routed here at all.
  //
  // Permission alone is not enough to decide this: a landlord legitimately
  // holds maintenance.read, because OWN-4 has them approving repairs above a
  // threshold. That earns them a maintenance view in *their* portal, not a
  // link in the agency's sidebar.
  if (!isStaff(role)) return [];

  return NAV_ITEMS.filter((item) => {
    if (item.flag !== undefined && !flags[item.flag]) return false;
    return can(role, item.permission);
  });
};

export interface NavGroup {
  readonly group: NavItem['group'];
  readonly label: string;
  readonly items: readonly NavItem[];
}

/** Grouped for rendering, with empty groups dropped rather than left as headings. */
export const groupedNavigationFor = (
  role: AppRole,
  flags: NavFeatureFlags,
): readonly NavGroup[] => {
  const items = navigationFor(role, flags);
  return (['portfolio', 'money', 'operations', 'admin'] as const)
    .map((group) => ({
      group,
      label: NAV_GROUP_LABELS[group],
      items: items.filter((i) => i.group === group),
    }))
    .filter((g) => g.items.length > 0);
};

/**
 * Whether a nav item is the active one for the current path.
 *
 * Longest-prefix, so /settings/people highlights People rather than Settings —
 * both match, and the more specific one is the page you are on.
 */
export const activeHref = (pathname: string, items: readonly NavItem[]): string | null => {
  const matches = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length);
  return matches[0]?.href ?? null;
};
