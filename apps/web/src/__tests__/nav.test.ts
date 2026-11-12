import { describe, expect, it } from 'vitest';

import {
  activeHref,
  groupedNavigationFor,
  navigationFor,
  NAV_ITEMS,
  type NavFeatureFlags,
} from '../lib/nav';
import { percent, percentLabel } from '../lib/format';
import { isThemePreference, themeAttribute } from '../lib/theme';
import type { AppRole } from '@tenaville/db';

const allOff: NavFeatureFlags = { crm: false, screening: false };
const allOn: NavFeatureFlags = { crm: true, screening: true };

const hrefs = (role: AppRole, flags: NavFeatureFlags = allOff) =>
  navigationFor(role, flags).map((i) => i.href);

describe('navigation', () => {
  it('gives an owner every screen that is built and switched on', () => {
    const nav = hrefs('owner');
    expect(nav).toEqual(
      expect.arrayContaining([
        '/dashboard',
        '/properties',
        '/rent',
        '/rent/receipts',
        '/settings',
        '/settings/people',
        '/settings/plan',
      ]),
    );
    expect(nav).not.toContain('/ledger');
    expect(nav).not.toContain('/reports');
  });

  it('hides the ledger from a caretaker', () => {
    // A caretaker logs repairs. A Ledger link they cannot open is worse than no
    // link: it implies access that the policy will then refuse.
    const nav = hrefs('caretaker');
    expect(nav).toEqual(['/dashboard', '/properties']);
    expect(nav).not.toContain('/ledger');
    expect(nav).not.toContain('/rent');
    expect(nav).not.toContain('/settings');
  });

  it('never shows a screen that has not been built', () => {
    // A planned item is a decision recorded in the catalogue, not a promise to
    // the user. Every role must be free of 404 links, however senior.
    const planned = NAV_ITEMS.filter((item) => item.status === 'planned').map((item) => item.href);
    expect(planned.length).toBeGreaterThan(0);
    for (const role of [
      'owner',
      'admin',
      'property_manager',
      'letting_agent',
      'caretaker',
      'maintenance_coordinator',
      'accountant',
      'screening_reviewer',
    ] as const) {
      for (const href of planned) {
        expect(hrefs(role, allOn), `${role} ${href}`).not.toContain(href);
      }
    }
  });

  it('shows plan and limits to whoever answers for the bill', () => {
    // An accountant pays it and an admin runs into the seat limit when they
    // invite someone, so both need the numbers — org.billing.read, not the
    // manage permission that only an owner holds (TV-147).
    for (const role of ['owner', 'admin', 'accountant'] as const) {
      expect(hrefs(role), role).toContain('/settings/plan');
    }
    for (const role of ['property_manager', 'letting_agent', 'caretaker'] as const) {
      expect(hrefs(role), role).not.toContain('/settings/plan');
    }
  });

  it('hides administration from everyone but an owner or admin', () => {
    for (const role of ['property_manager', 'accountant', 'letting_agent', 'caretaker'] as const) {
      expect(hrefs(role), role).not.toContain('/settings');
    }
    expect(hrefs('admin')).toContain('/settings');
  });

  it('shows an accountant the money but not the property records they cannot edit', () => {
    const nav = hrefs('accountant');
    expect(nav).toEqual(expect.arrayContaining(['/rent', '/rent/receipts', '/settings/plan']));
    expect(nav).not.toContain('/settings/people');
    expect(nav).not.toContain('/ledger');
  });

  it('gives a tenant and a landlord no staff navigation at all', () => {
    // Both are members of the organisation with far narrower visibility — the
    // sharp edge in ADR 0008. They have their own portals, not this shell.
    //
    // Permission alone would not produce this: a landlord holds
    // maintenance.read because OWN-4 has them approving repairs. That belongs
    // in their portal, not in the agency's sidebar.
    expect(hrefs('tenant')).toEqual([]);
    expect(hrefs('landlord')).toEqual([]);
    expect(hrefs('landlord', allOn)).toEqual([]);
  });

  it('keeps R2 features hidden until their flag is on, however senior the user', () => {
    expect(hrefs('owner', allOff)).not.toContain('/crm');
    expect(hrefs('owner', allOff)).not.toContain('/screening');
    expect(hrefs('owner', allOn)).toContain('/crm');
    expect(hrefs('owner', allOn)).toContain('/screening');
  });

  it('does not show a flagged feature to a role that lacks the permission', () => {
    // The flag enables a feature; it does not grant access to it.
    expect(hrefs('caretaker', allOn)).not.toContain('/crm');
  });

  it('drops empty groups rather than rendering a bare heading', () => {
    const groups = groupedNavigationFor('caretaker', allOff);
    // Maintenance is planned, so the operations group has nothing live in it.
    expect(groups.map((g) => g.group)).toEqual(['portfolio']);
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
  });

  it('declares a permission for every item', () => {
    // An item with no permission would be visible to everyone, including a
    // tenant signed into the staff shell.
    for (const item of NAV_ITEMS) {
      expect(item.permission, item.href).toBeTruthy();
    }
  });
});

describe('activeHref', () => {
  const items = NAV_ITEMS;

  it('matches the most specific item, not the first', () => {
    // Both /settings and /settings/people match this path; the page you are on
    // is the longer one.
    expect(activeHref('/settings/people', items)).toBe('/settings/people');
    expect(activeHref('/settings', items)).toBe('/settings');
  });

  it('matches a child route to its parent item', () => {
    expect(activeHref('/properties/abc-123', items)).toBe('/properties');
  });

  it('returns null for a path outside the navigation', () => {
    expect(activeHref('/sign-in', items)).toBeNull();
  });

  it('does not match a path that merely shares a prefix', () => {
    // /rentals is not /rent.
    expect(activeHref('/rentals', items)).toBeNull();
  });
});

describe('theme preference', () => {
  it('stamps an attribute for an explicit choice and nothing for system', () => {
    // 'system' must stamp nothing, or the prefers-color-scheme block in
    // tokens.css can never apply.
    expect(themeAttribute('light')).toBe('light');
    expect(themeAttribute('dark')).toBe('dark');
    expect(themeAttribute('system')).toBeNull();
  });

  it('rejects anything that is not a preference', () => {
    for (const bad of ['Dark', '', null, undefined, 1, {}]) {
      expect(isThemePreference(bad), JSON.stringify(bad)).toBe(false);
    }
    for (const good of ['light', 'dark', 'system']) {
      expect(isThemePreference(good)).toBe(true);
    }
  });
});

describe('percentages', () => {
  it('rounds for display', () => {
    expect(percent(94, 100)).toBe(94);
    expect(percent(2, 3)).toBe(67);
    expect(percent(1, 3)).toBe(33);
  });

  it('returns null rather than zero when there is nothing to divide by', () => {
    // "0% occupancy" and "no lettable units" are different statements, and
    // showing the first for the second misleads.
    expect(percent(0, 0)).toBeNull();
    expect(percent(5, -1)).toBeNull();
    expect(percentLabel(0, 0)).toBe('—');
  });

  it('labels with a sign', () => {
    expect(percentLabel(47, 50)).toBe('94%');
  });
});
