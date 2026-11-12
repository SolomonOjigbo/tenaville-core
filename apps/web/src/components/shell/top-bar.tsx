'use client';

import { Badge, statusLabel } from '../ui/badge';
import { SignOutButton } from './sign-out-button';
import { ThemeToggle } from './theme-toggle';

export const TopBar = ({
  userLabel,
  role,
  menuOpen,
  onMenu,
}: {
  readonly userLabel: string;
  readonly role: string;
  readonly menuOpen: boolean;
  readonly onMenu: () => void;
}) => (
  <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3 sm:px-6 print:hidden">
    <div className="flex min-w-0 items-center gap-3">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        aria-expanded={menuOpen}
        aria-controls="staff-navigation"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted hover:bg-surface2 hover:text-text md:hidden"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="h-5 w-5"
        >
          <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
        </svg>
      </button>
      <span className="truncate text-sm text-text">{userLabel}</span>
      <Badge tone="info">{statusLabel(role)}</Badge>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <ThemeToggle />
      <SignOutButton />
    </div>
  </header>
);
