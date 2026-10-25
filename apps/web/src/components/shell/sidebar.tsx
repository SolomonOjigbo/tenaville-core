'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { activeHref, type NavGroup } from '../../lib/nav';

/**
 * Staff navigation.
 *
 * The groups arrive already filtered by role on the server, so a link a user
 * cannot follow is never sent to the browser — which is both less confusing
 * and one less thing to probe.
 */
export const Sidebar = ({
  groups,
  organisationName,
}: {
  readonly groups: readonly NavGroup[];
  readonly organisationName: string;
}) => {
  const pathname = usePathname();
  const allItems = groups.flatMap((g) => [...g.items]);
  const current = activeHref(pathname, allItems);

  return (
    <nav
      aria-label="Main"
      className="flex h-full w-60 shrink-0 flex-col gap-6 border-r border-border bg-surface px-3 py-4"
    >
      <div className="px-2">
        <p className="font-display text-base text-text">Tenaville</p>
        <p className="mt-0.5 truncate text-xs text-subtle" title={organisationName}>
          {organisationName}
        </p>
      </div>

      {groups.map((group) => (
        <div key={group.group}>
          <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-subtle">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={current === item.href ? 'page' : undefined}
                  className={clsx(
                    'block rounded-md px-2 py-2 text-sm transition-colors',
                    current === item.href
                      ? 'bg-primary-soft font-medium text-info-text'
                      : 'text-muted hover:bg-surface2 hover:text-text',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
};
