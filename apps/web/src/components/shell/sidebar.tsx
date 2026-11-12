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
 *
 * On a phone it slides in over the content and is dismissed by the scrim, the
 * close button, Escape, or navigating. On desktop it is the fixed column it
 * always was.
 */
export const Sidebar = ({
  groups,
  organisationName,
  open = true,
  onClose = () => undefined,
}: {
  readonly groups: readonly NavGroup[];
  readonly organisationName: string;
  /** Drawer state on small screens. Defaults to open so previews render as intended. */
  readonly open?: boolean;
  readonly onClose?: () => void;
}) => {
  const pathname = usePathname();
  const allItems = groups.flatMap((g) => [...g.items]);
  const current = activeHref(pathname, allItems);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={clsx('fixed inset-0 z-30 bg-black/40 md:hidden', open ? 'block' : 'hidden')}
      />

      <nav
        id="staff-navigation"
        aria-label="Main"
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex h-full w-60 shrink-0 flex-col gap-6 overflow-y-auto',
          'border-r border-border bg-surface px-3 py-4 transition-transform',
          'md:static md:z-auto md:translate-x-0 print:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between gap-2 px-2">
          <div className="min-w-0">
            <p className="font-display text-base text-text">Tenaville</p>
            <p className="mt-0.5 truncate text-xs text-subtle" title={organisationName}>
              {organisationName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-muted hover:bg-surface2 hover:text-text md:hidden"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-5 w-5"
            >
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
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
    </>
  );
};
