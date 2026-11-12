'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import type { NavGroup } from '../../lib/nav';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

/**
 * The responsive frame around every staff page.
 *
 * Below the `md` breakpoint the sidebar becomes a drawer: the previous shell
 * kept a fixed 240px column on a 375px screen, which left the content too
 * narrow to read. State lives here because the trigger (in the top bar) and the
 * drawer (the sidebar) are siblings.
 */
export const StaffShell = ({
  groups,
  organisationName,
  userLabel,
  role,
  children,
}: {
  readonly groups: readonly NavGroup[];
  readonly organisationName: string;
  readonly userLabel: string;
  readonly role: string;
  readonly children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Navigating closes the drawer, including a link to the page already on.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar
        groups={groups}
        organisationName={organisationName}
        open={open}
        onClose={() => setOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar userLabel={userLabel} role={role} menuOpen={open} onMenu={() => setOpen(true)} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 print:p-0">{children}</main>
      </div>
    </div>
  );
};
